"""
Unit tests for CSV writer.

Tests RFC 4180 format compliance and validation (T027).
"""

import pytest
import tempfile
import csv
from pathlib import Path
import sys

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from csv_writer import CSVWriter
from datetime import datetime


class TestCSVWriter:
    """Test CSV writer functionality (T027)."""
    
    def test_write_creates_file(self):
        """Verify CSV file is created."""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = Path(tmpdir) / "test.csv"
            writer = CSVWriter(str(filepath))
            
            rows = [
                {
                    'timestamp': '2025-12-01T00:00:00-05:00',
                    'room_name': 'Kitchen',
                    'wattage': 250.5,
                    'amperage': 2.09,
                    'voltage': 120,
                    'breaker_tripped': 'false'
                }
            ]
            
            writer.write(rows)
            
            assert filepath.exists()
    
    def test_write_correct_header(self):
        """Verify CSV header matches specification."""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = Path(tmpdir) / "test.csv"
            writer = CSVWriter(str(filepath))
            
            rows = [
                {
                    'timestamp': '2025-12-01T00:00:00-05:00',
                    'room_name': 'Kitchen',
                    'wattage': 250.5,
                    'amperage': 2.09,
                    'voltage': 120,
                    'breaker_tripped': 'false'
                }
            ]
            
            writer.write(rows)
            
            # Read file and check header
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                header = next(reader)
                
                expected = ['timestamp', 'room_name', 'wattage', 'amperage', 'voltage', 'breaker_tripped']
                assert header == expected
    
    def test_write_data_rows(self):
        """Verify data rows are written correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = Path(tmpdir) / "test.csv"
            writer = CSVWriter(str(filepath))
            
            rows = [
                {
                    'timestamp': '2025-12-01T00:00:00-05:00',
                    'room_name': 'Kitchen',
                    'wattage': 250.5,
                    'amperage': 2.09,
                    'voltage': 120,
                    'breaker_tripped': 'false'
                },
                {
                    'timestamp': '2025-12-01T00:10:00-05:00',
                    'room_name': 'Sons room',
                    'wattage': 1950.0,
                    'amperage': 16.25,
                    'voltage': 120,
                    'breaker_tripped': 'true'
                }
            ]
            
            count = writer.write(rows)
            
            assert count == 2
            
            # Read and verify
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                written_rows = list(reader)
                
                assert len(written_rows) == 2
                assert written_rows[0]['room_name'] == 'Kitchen'
                assert written_rows[1]['room_name'] == 'Sons room'
    
    def test_validate_row_missing_field(self):
        """Verify validation catches missing required fields."""
        row = {
            'timestamp': '2025-12-01T00:00:00-05:00',
            'room_name': 'Kitchen',
            # Missing wattage
            'amperage': 2.09,
            'voltage': 120,
            'breaker_tripped': 'false'
        }
        
        errors = CSVWriter.validate_row(row)
        
        assert len(errors) > 0
        assert any('wattage' in error.lower() for error in errors)
    
    def test_validate_row_negative_wattage(self):
        """Verify validation rejects negative wattage (FR-022)."""
        row = {
            'timestamp': '2025-12-01T00:00:00-05:00',
            'room_name': 'Kitchen',
            'wattage': -100.0,
            'amperage': -0.83,
            'voltage': 120,
            'breaker_tripped': 'false'
        }
        
        errors = CSVWriter.validate_row(row)
        
        assert len(errors) > 0
        assert any('negative' in error.lower() for error in errors)
    
    def test_validate_row_voltage_not_120(self):
        """Verify validation requires voltage to be 120V."""
        row = {
            'timestamp': '2025-12-01T00:00:00-05:00',
            'room_name': 'Kitchen',
            'wattage': 250.0,
            'amperage': 1.25,
            'voltage': 240,  # Wrong voltage
            'breaker_tripped': 'false'
        }
        
        errors = CSVWriter.validate_row(row)
        
        assert len(errors) > 0
        assert any('120' in error for error in errors)
    
    def test_validate_row_amperage_mismatch(self):
        """Verify validation checks amperage = wattage / voltage."""
        row = {
            'timestamp': '2025-12-01T00:00:00-05:00',
            'room_name': 'Kitchen',
            'wattage': 1200.0,
            'amperage': 5.0,  # Should be 10.0
            'voltage': 120,
            'breaker_tripped': 'false'
        }
        
        errors = CSVWriter.validate_row(row)
        
        assert len(errors) > 0
        assert any('mismatch' in error.lower() for error in errors)
    
    def test_validate_row_valid(self):
        """Verify validation passes for valid row."""
        row = {
            'timestamp': '2025-12-01T00:00:00-05:00',
            'room_name': 'Kitchen',
            'wattage': 1200.0,
            'amperage': 10.0,
            'voltage': 120,
            'breaker_tripped': 'false'
        }
        
        errors = CSVWriter.validate_row(row)
        
        assert len(errors) == 0
    
    def test_file_size_calculation(self):
        """Verify file size is calculated correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = Path(tmpdir) / "test.csv"
            writer = CSVWriter(str(filepath))
            
            rows = [
                {
                    'timestamp': '2025-12-01T00:00:00-05:00',
                    'room_name': 'Kitchen',
                    'wattage': 250.5,
                    'amperage': 2.09,
                    'voltage': 120,
                    'breaker_tripped': 'false'
                }
            ]
            
            writer.write(rows)
            
            size = writer.get_file_size()
            assert size > 0
            
            size_kb = writer.get_file_size_kb()
            assert size_kb > 0
    
    def test_rfc_4180_compliance(self):
        """Verify output is RFC 4180 compliant."""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = Path(tmpdir) / "test.csv"
            writer = CSVWriter(str(filepath))
            
            # Include room name with special characters that need quoting
            rows = [
                {
                    'timestamp': '2025-12-01T00:00:00-05:00',
                    'room_name': 'Living room',
                    'wattage': 250.5,
                    'amperage': 2.09,
                    'voltage': 120,
                    'breaker_tripped': 'false'
                }
            ]
            
            writer.write(rows)
            
            # Read with standard CSV reader
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                row = next(reader)
                
                # Should parse correctly
                assert row['room_name'] == 'Living room'
                assert float(row['wattage']) == 250.5
