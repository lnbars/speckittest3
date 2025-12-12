"""
CSV writer utility implementing RFC 4180 format.

Writes power monitoring data to CSV files per contracts/csv-schema.md specification.
"""

import csv
from typing import List, Dict, Any  # , TextIO
from pathlib import Path


class CSVWriter:
    """
    Writes power monitoring data to CSV format per RFC 4180.
    
    Implements the data contract defined in contracts/csv-schema.md.
    """
    
    # Column order and names per csv-schema.md
    FIELDNAMES = [
        "timestamp",
        "room_name",
        "wattage",
        "amperage",
        "voltage",
        "breaker_tripped"
    ]
    
    def __init__(self, filepath: str):
        """
        Initialize CSV writer.
        
        Args:
            filepath: Path to output CSV file
        """
        self.filepath = Path(filepath)
        self.row_count = 0
    
    def write(self, rows: List[Dict[str, Any]]) -> int:
        """
        Write rows to CSV file.
        
        Args:
            rows: List of dictionaries with power reading data
            
        Returns:
            Number of rows written
            
        Raises:
            IOError: If file cannot be written
            ValueError: If rows are missing required fields
        """
        # Validate rows have required fields
        for i, row in enumerate(rows):
            missing = [field for field in self.FIELDNAMES if field not in row]
            if missing:
                raise ValueError(
                    f"Row {i} missing required fields: {', '.join(missing)}"
                )
        
        # Create parent directories if needed
        self.filepath.parent.mkdir(parents=True, exist_ok=True)
        
        # Write CSV file
        with open(self.filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(
                csvfile,
                fieldnames=self.FIELDNAMES,
                quoting=csv.QUOTE_MINIMAL,  # RFC 4180: quote only when needed
                lineterminator='\n'  # Unix line endings (Windows CRLF also accepted)
            )
            
            # Write header row
            writer.writeheader()
            
            # Write data rows
            writer.writerows(rows)
            
            self.row_count = len(rows)
        
        return self.row_count
    
    def append(self, rows: List[Dict[str, Any]]) -> int:
        """
        Append rows to existing CSV file.
        
        Args:
            rows: List of dictionaries with power reading data
            
        Returns:
            Number of rows appended
            
        Raises:
            IOError: If file cannot be opened
            ValueError: If rows are missing required fields
        """
        # Validate rows
        for i, row in enumerate(rows):
            missing = [field for field in self.FIELDNAMES if field not in row]
            if missing:
                raise ValueError(
                    f"Row {i} missing required fields: {', '.join(missing)}"
                )
        
        # Check if file exists
        if not self.filepath.exists():
            # File doesn't exist, write with header
            return self.write(rows)
        
        # Append to existing file
        with open(self.filepath, 'a', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(
                csvfile,
                fieldnames=self.FIELDNAMES,
                quoting=csv.QUOTE_MINIMAL,
                lineterminator='\n'
            )
            
            writer.writerows(rows)
            self.row_count += len(rows)
        
        return len(rows)
    
    def get_file_size(self) -> int:
        """
        Get size of written CSV file in bytes.
        
        Returns:
            File size in bytes, or 0 if file doesn't exist
        """
        if self.filepath.exists():
            return self.filepath.stat().st_size
        return 0
    
    def get_file_size_kb(self) -> float:
        """
        Get size of written CSV file in kilobytes.
        
        Returns:
            File size in KB, rounded to 2 decimal places
        """
        return round(self.get_file_size() / 1024, 2)
    
    @staticmethod
    def validate_row(row: Dict[str, Any]) -> List[str]:
        """
        Validate a single CSV row per contracts/csv-schema.md requirements.
        
        Args:
            row: Dictionary representing a CSV row
            
        Returns:
            List of error messages (empty if valid)
        """
        errors = []
        
        # Check required fields
        required_fields = CSVWriter.FIELDNAMES
        for field in required_fields:
            if field not in row or row[field] is None or row[field] == '':
                errors.append(f"Missing required field: {field}")
        
        # Validate wattage is non-negative (FR-022)
        if 'wattage' in row:
            try:
                wattage = float(row['wattage'])
                if wattage < 0:
                    errors.append("Wattage cannot be negative")
            except (ValueError, TypeError):
                errors.append("Wattage must be a valid number")
        
        # Validate voltage is 120
        if 'voltage' in row:
            try:
                voltage = int(row['voltage'])
                if voltage != 120:
                    errors.append("Voltage must be 120V")
            except (ValueError, TypeError):
                errors.append("Voltage must be a valid integer")
        
        # Validate breaker_tripped is boolean string
        if 'breaker_tripped' in row:
            if str(row['breaker_tripped']).lower() not in ('true', 'false'):
                errors.append("breaker_tripped must be 'true' or 'false'")
        
        # Validate mathematical consistency: amperage = wattage / voltage
        if 'wattage' in row and 'amperage' in row and 'voltage' in row:
            try:
                wattage = float(row['wattage'])
                amperage = float(row['amperage'])
                voltage = float(row['voltage'])
                expected_amperage = wattage / voltage
                
                # Allow 0.01 tolerance for floating point
                if abs(amperage - expected_amperage) > 0.01:
                    errors.append(
                        f"Amperage mismatch: {amperage} != {expected_amperage} "
                        f"(wattage/voltage)"
                    )
            except (ValueError, TypeError, ZeroDivisionError):
                pass  # Already caught by other validations
        
        return errors
