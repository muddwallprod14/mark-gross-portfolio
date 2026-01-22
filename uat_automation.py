#!/usr/bin/env python3
"""
UAT Automation CLI Tool
=======================
A terminal-based User Acceptance Testing framework for VFX/Media pipelines.
Supports test suite creation, execution, logging, and reporting.

Usage:
    python uat_automation.py init <project_name>
    python uat_automation.py run <test_suite>
    python uat_automation.py run --all
    python uat_automation.py report [--format json|html|terminal]
    python uat_automation.py validate <asset_path>

Author: Mark Gross
"""

import argparse
import json
import os
import sys
import time
import hashlib
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# ============================================================================
# CONFIGURATION & CONSTANTS
# ============================================================================

VERSION = "1.0.0"
CONFIG_DIR = Path.home() / ".uat_automation"
LOG_DIR = CONFIG_DIR / "logs"
REPORTS_DIR = CONFIG_DIR / "reports"
TESTS_DIR = CONFIG_DIR / "tests"

class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    RESET = '\033[0m'

class TestStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"

# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class TestResult:
    name: str
    status: TestStatus
    duration: float
    message: str = ""
    details: Dict = None
    timestamp: str = ""
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()
        if self.details is None:
            self.details = {}

@dataclass
class TestSuite:
    name: str
    tests: List[Dict]
    description: str = ""
    created: str = ""
    
    def __post_init__(self):
        if not self.created:
            self.created = datetime.now().isoformat()

# ============================================================================
# LOGGING SETUP
# ============================================================================

class UATLogger:
    """Custom logger with colored terminal output and file logging"""
    
    def __init__(self, name: str = "UAT"):
        self.name = name
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        
        log_file = LOG_DIR / f"uat_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        
        self.file_handler = logging.FileHandler(log_file)
        self.file_handler.setLevel(logging.DEBUG)
        self.file_handler.setFormatter(
            logging.Formatter('%(asctime)s | %(levelname)s | %(message)s')
        )
    
    def _print(self, color: str, prefix: str, message: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"{Colors.DIM}[{timestamp}]{Colors.RESET} {color}{prefix}{Colors.RESET} {message}")
        self.file_handler.emit(
            logging.LogRecord(self.name, logging.INFO, "", 0, f"{prefix} {message}", (), None)
        )
    
    def info(self, message: str):
        self._print(Colors.BLUE, "INFO", message)
    
    def success(self, message: str):
        self._print(Colors.GREEN, "PASS", message)
    
    def warning(self, message: str):
        self._print(Colors.YELLOW, "WARN", message)
    
    def error(self, message: str):
        self._print(Colors.RED, "FAIL", message)
    
    def header(self, message: str):
        print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*60}{Colors.RESET}")
        print(f"{Colors.CYAN}{Colors.BOLD}  {message}{Colors.RESET}")
        print(f"{Colors.CYAN}{Colors.BOLD}{'='*60}{Colors.RESET}\n")

logger = UATLogger()

# ============================================================================
# TEST VALIDATORS
# ============================================================================

class Validators:
    """Collection of validation functions for UAT testing"""
    
    @staticmethod
    def validate_file_exists(path: str) -> TestResult:
        """Check if a file exists at the given path"""
        start = time.time()
        exists = Path(path).exists()
        duration = time.time() - start
        
        return TestResult(
            name="File Exists Check",
            status=TestStatus.PASSED if exists else TestStatus.FAILED,
            duration=duration,
            message=f"File {'found' if exists else 'not found'}: {path}",
            details={"path": path, "exists": exists}
        )
    
    @staticmethod
    def validate_file_format(path: str, expected_ext: str) -> TestResult:
        """Validate file has expected extension"""
        start = time.time()
        actual_ext = Path(path).suffix.lower()
        expected_ext = expected_ext.lower() if expected_ext.startswith('.') else f".{expected_ext.lower()}"
        matches = actual_ext == expected_ext
        duration = time.time() - start
        
        return TestResult(
            name="File Format Check",
            status=TestStatus.PASSED if matches else TestStatus.FAILED,
            duration=duration,
            message=f"Expected {expected_ext}, got {actual_ext}",
            details={"expected": expected_ext, "actual": actual_ext}
        )
    
    @staticmethod
    def validate_file_size(path: str, min_bytes: int = 0, max_bytes: int = None) -> TestResult:
        """Validate file size within range"""
        start = time.time()
        try:
            size = Path(path).stat().st_size
            in_range = size >= min_bytes and (max_bytes is None or size <= max_bytes)
            duration = time.time() - start
            
            return TestResult(
                name="File Size Check",
                status=TestStatus.PASSED if in_range else TestStatus.FAILED,
                duration=duration,
                message=f"Size: {size:,} bytes (min: {min_bytes:,}, max: {max_bytes or 'unlimited'})",
                details={"size": size, "min": min_bytes, "max": max_bytes}
            )
        except Exception as e:
            return TestResult(
                name="File Size Check",
                status=TestStatus.ERROR,
                duration=time.time() - start,
                message=str(e)
            )
    
    @staticmethod
    def validate_json_schema(path: str, required_keys: List[str]) -> TestResult:
        """Validate JSON file contains required keys"""
        start = time.time()
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            
            missing = [key for key in required_keys if key not in data]
            passed = len(missing) == 0
            duration = time.time() - start
            
            return TestResult(
                name="JSON Schema Check",
                status=TestStatus.PASSED if passed else TestStatus.FAILED,
                duration=duration,
                message=f"Missing keys: {missing}" if missing else "All required keys present",
                details={"required": required_keys, "missing": missing}
            )
        except json.JSONDecodeError as e:
            return TestResult(
                name="JSON Schema Check",
                status=TestStatus.ERROR,
                duration=time.time() - start,
                message=f"Invalid JSON: {e}"
            )
        except Exception as e:
            return TestResult(
                name="JSON Schema Check",
                status=TestStatus.ERROR,
                duration=time.time() - start,
                message=str(e)
            )
    
    @staticmethod
    def validate_checksum(path: str, expected_hash: str, algorithm: str = "md5") -> TestResult:
        """Validate file checksum"""
        start = time.time()
        try:
            hasher = hashlib.new(algorithm)
            with open(path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b''):
                    hasher.update(chunk)
            
            actual_hash = hasher.hexdigest()
            matches = actual_hash == expected_hash
            duration = time.time() - start
            
            return TestResult(
                name="Checksum Validation",
                status=TestStatus.PASSED if matches else TestStatus.FAILED,
                duration=duration,
                message=f"Hash {'matches' if matches else 'mismatch'}",
                details={"expected": expected_hash, "actual": actual_hash, "algorithm": algorithm}
            )
        except Exception as e:
            return TestResult(
                name="Checksum Validation",
                status=TestStatus.ERROR,
                duration=time.time() - start,
                message=str(e)
            )
    
    @staticmethod
    def validate_video_codec(path: str, expected_codec: str = None) -> TestResult:
        """Validate video codec using ffprobe"""
        start = time.time()
        try:
            result = subprocess.run(
                ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_streams', path],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode != 0:
                return TestResult(
                    name="Video Codec Check",
                    status=TestStatus.ERROR,
                    duration=time.time() - start,
                    message="ffprobe failed - is FFmpeg installed?"
                )
            
            data = json.loads(result.stdout)
            video_stream = next((s for s in data.get('streams', []) if s['codec_type'] == 'video'), None)
            
            if not video_stream:
                return TestResult(
                    name="Video Codec Check",
                    status=TestStatus.FAILED,
                    duration=time.time() - start,
                    message="No video stream found"
                )
            
            codec = video_stream.get('codec_name', 'unknown')
            if expected_codec:
                matches = codec.lower() == expected_codec.lower()
                return TestResult(
                    name="Video Codec Check",
                    status=TestStatus.PASSED if matches else TestStatus.FAILED,
                    duration=time.time() - start,
                    message=f"Codec: {codec} (expected: {expected_codec})",
                    details={"codec": codec, "expected": expected_codec}
                )
            else:
                return TestResult(
                    name="Video Codec Check",
                    status=TestStatus.PASSED,
                    duration=time.time() - start,
                    message=f"Codec detected: {codec}",
                    details={"codec": codec}
                )
        except subprocess.TimeoutExpired:
            return TestResult(
                name="Video Codec Check",
                status=TestStatus.ERROR,
                duration=time.time() - start,
                message="ffprobe timed out"
            )
        except FileNotFoundError:
            return TestResult(
                name="Video Codec Check",
                status=TestStatus.SKIPPED,
                duration=time.time() - start,
                message="ffprobe not found - skipping codec check"
            )
        except Exception as e:
            return TestResult(
                name="Video Codec Check",
                status=TestStatus.ERROR,
                duration=time.time() - start,
                message=str(e)
            )
    
    @staticmethod
    def validate_resolution(path: str, expected_width: int = None, expected_height: int = None) -> TestResult:
        """Validate video/image resolution"""
        start = time.time()
        try:
            result = subprocess.run(
                ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_streams', path],
                capture_output=True, text=True, timeout=30
            )
            
            data = json.loads(result.stdout)
            video_stream = next((s for s in data.get('streams', []) if s['codec_type'] == 'video'), None)
            
            if not video_stream:
                return TestResult(
                    name="Resolution Check",
                    status=TestStatus.FAILED,
                    duration=time.time() - start,
                    message="No video stream found"
                )
            
            width = video_stream.get('width')
            height = video_stream.get('height')
            
            width_ok = expected_width is None or width == expected_width
            height_ok = expected_height is None or height == expected_height
            
            return TestResult(
                name="Resolution Check",
                status=TestStatus.PASSED if (width_ok and height_ok) else TestStatus.FAILED,
                duration=time.time() - start,
                message=f"Resolution: {width}x{height}",
                details={"width": width, "height": height, "expected_width": expected_width, "expected_height": expected_height}
            )
        except FileNotFoundError:
            return TestResult(
                name="Resolution Check",
                status=TestStatus.SKIPPED,
                duration=time.time() - start,
                message="ffprobe not found - skipping resolution check"
            )
        except Exception as e:
            return TestResult(
                name="Resolution Check",
                status=TestStatus.ERROR,
                duration=time.time() - start,
                message=str(e)
            )

# ============================================================================
# TEST RUNNER
# ============================================================================

class TestRunner:
    """Executes test suites and collects results"""
    
    def __init__(self):
        self.results: List[TestResult] = []
        self.start_time: float = 0
        self.end_time: float = 0
        self.validators = Validators()
    
    def run_test(self, test_config: Dict) -> TestResult:
        """Run a single test based on configuration"""
        test_type = test_config.get('type')
        params = test_config.get('params', {})
        
        validator_map = {
            'file_exists': self.validators.validate_file_exists,
            'file_format': self.validators.validate_file_format,
            'file_size': self.validators.validate_file_size,
            'json_schema': self.validators.validate_json_schema,
            'checksum': self.validators.validate_checksum,
            'video_codec': self.validators.validate_video_codec,
            'resolution': self.validators.validate_resolution,
        }
        
        validator = validator_map.get(test_type)
        if not validator:
            return TestResult(
                name=test_config.get('name', 'Unknown'),
                status=TestStatus.ERROR,
                duration=0,
                message=f"Unknown test type: {test_type}"
            )
        
        return validator(**params)
    
    def run_suite(self, suite: TestSuite) -> List[TestResult]:
        """Run all tests in a suite"""
        logger.header(f"Running Test Suite: {suite.name}")
        logger.info(suite.description or "No description")
        print()
        
        self.results = []
        self.start_time = time.time()
        
        total = len(suite.tests)
        for i, test_config in enumerate(suite.tests, 1):
            test_name = test_config.get('name', f'Test {i}')
            print(f"  {Colors.DIM}[{i}/{total}]{Colors.RESET} {test_name}...", end=" ", flush=True)
            
            result = self.run_test(test_config)
            result.name = test_name
            self.results.append(result)
            
            # Print result
            status_colors = {
                TestStatus.PASSED: Colors.GREEN,
                TestStatus.FAILED: Colors.RED,
                TestStatus.ERROR: Colors.RED,
                TestStatus.SKIPPED: Colors.YELLOW,
            }
            color = status_colors.get(result.status, Colors.RESET)
            print(f"{color}{result.status.value.upper()}{Colors.RESET} ({result.duration:.3f}s)")
            
            if result.status in [TestStatus.FAILED, TestStatus.ERROR]:
                print(f"      {Colors.DIM}→ {result.message}{Colors.RESET}")
        
        self.end_time = time.time()
        return self.results
    
    def get_summary(self) -> Dict:
        """Get test run summary"""
        passed = sum(1 for r in self.results if r.status == TestStatus.PASSED)
        failed = sum(1 for r in self.results if r.status == TestStatus.FAILED)
        errors = sum(1 for r in self.results if r.status == TestStatus.ERROR)
        skipped = sum(1 for r in self.results if r.status == TestStatus.SKIPPED)
        
        return {
            "total": len(self.results),
            "passed": passed,
            "failed": failed,
            "errors": errors,
            "skipped": skipped,
            "duration": self.end_time - self.start_time,
            "success_rate": (passed / len(self.results) * 100) if self.results else 0
        }
    
    def print_summary(self):
        """Print test summary to terminal"""
        summary = self.get_summary()
        
        print(f"\n{Colors.BOLD}{'─'*60}{Colors.RESET}")
        print(f"{Colors.BOLD}Test Summary{Colors.RESET}")
        print(f"{'─'*60}")
        
        print(f"  Total:    {summary['total']}")
        print(f"  {Colors.GREEN}Passed:   {summary['passed']}{Colors.RESET}")
        print(f"  {Colors.RED}Failed:   {summary['failed']}{Colors.RESET}")
        print(f"  {Colors.RED}Errors:   {summary['errors']}{Colors.RESET}")
        print(f"  {Colors.YELLOW}Skipped:  {summary['skipped']}{Colors.RESET}")
        print(f"  Duration: {summary['duration']:.2f}s")
        print(f"  Success:  {summary['success_rate']:.1f}%")
        
        # Overall status
        if summary['failed'] == 0 and summary['errors'] == 0:
            print(f"\n{Colors.GREEN}{Colors.BOLD}✓ ALL TESTS PASSED{Colors.RESET}\n")
        else:
            print(f"\n{Colors.RED}{Colors.BOLD}✗ TESTS FAILED{Colors.RESET}\n")

# ============================================================================
# REPORT GENERATOR
# ============================================================================

class ReportGenerator:
    """Generate test reports in various formats"""
    
    @staticmethod
    def to_json(results: List[TestResult], summary: Dict, output_path: Path = None) -> str:
        """Generate JSON report"""
        report = {
            "generated": datetime.now().isoformat(),
            "summary": summary,
            "results": [
                {
                    "name": r.name,
                    "status": r.status.value,
                    "duration": r.duration,
                    "message": r.message,
                    "details": r.details,
                    "timestamp": r.timestamp
                }
                for r in results
            ]
        }
        
        json_str = json.dumps(report, indent=2)
        
        if output_path:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json_str)
            logger.info(f"Report saved: {output_path}")
        
        return json_str
    
    @staticmethod
    def to_html(results: List[TestResult], summary: Dict, output_path: Path = None) -> str:
        """Generate HTML report"""
        status_colors = {
            "passed": "#27ca40",
            "failed": "#ff5f56",
            "error": "#ff5f56",
            "skipped": "#ffbd2e"
        }
        
        rows = ""
        for r in results:
            color = status_colors.get(r.status.value, "#888")
            rows += f"""
            <tr>
                <td>{r.name}</td>
                <td style="color: {color}; font-weight: bold;">{r.status.value.upper()}</td>
                <td>{r.duration:.3f}s</td>
                <td>{r.message}</td>
            </tr>"""
        
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>UAT Test Report</title>
    <style>
        body {{ font-family: -apple-system, sans-serif; background: #1a1a2e; color: #fff; padding: 2rem; }}
        h1 {{ color: #00ffff; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 1rem; }}
        th, td {{ padding: 0.75rem; text-align: left; border-bottom: 1px solid #333; }}
        th {{ background: #16161e; color: #00ffff; }}
        .summary {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 2rem 0; }}
        .stat {{ background: #252535; padding: 1rem; border-radius: 8px; text-align: center; }}
        .stat-value {{ font-size: 2rem; font-weight: bold; color: #00ffff; }}
        .stat-label {{ font-size: 0.8rem; color: #888; }}
    </style>
</head>
<body>
    <h1>UAT Test Report</h1>
    <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    
    <div class="summary">
        <div class="stat"><div class="stat-value">{summary['total']}</div><div class="stat-label">Total</div></div>
        <div class="stat"><div class="stat-value" style="color: #27ca40">{summary['passed']}</div><div class="stat-label">Passed</div></div>
        <div class="stat"><div class="stat-value" style="color: #ff5f56">{summary['failed']}</div><div class="stat-label">Failed</div></div>
        <div class="stat"><div class="stat-value">{summary['success_rate']:.1f}%</div><div class="stat-label">Success Rate</div></div>
    </div>
    
    <table>
        <thead><tr><th>Test</th><th>Status</th><th>Duration</th><th>Message</th></tr></thead>
        <tbody>{rows}</tbody>
    </table>
</body>
</html>"""
        
        if output_path:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(html)
            logger.info(f"Report saved: {output_path}")
        
        return html

# ============================================================================
# CLI COMMANDS
# ============================================================================

def cmd_init(args):
    """Initialize a new test project"""
    project_name = args.project_name
    logger.header(f"Initializing UAT Project: {project_name}")
    
    # Create directories
    for dir_path in [CONFIG_DIR, LOG_DIR, REPORTS_DIR, TESTS_DIR]:
        dir_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created: {dir_path}")
    
    # Create sample test suite
    sample_suite = {
        "name": f"{project_name}_tests",
        "description": f"UAT test suite for {project_name}",
        "tests": [
            {
                "name": "Sample File Check",
                "type": "file_exists",
                "params": {"path": "/tmp/sample.txt"}
            },
            {
                "name": "Sample JSON Validation",
                "type": "json_schema",
                "params": {
                    "path": "/tmp/config.json",
                    "required_keys": ["version", "name"]
                }
            }
        ]
    }
    
    suite_path = TESTS_DIR / f"{project_name}_tests.json"
    suite_path.write_text(json.dumps(sample_suite, indent=2))
    logger.success(f"Created sample test suite: {suite_path}")
    
    print(f"\n{Colors.GREEN}✓ Project initialized!{Colors.RESET}")
    print(f"\nNext steps:")
    print(f"  1. Edit test suite: {suite_path}")
    print(f"  2. Run tests: python uat_automation.py run {project_name}_tests")

def cmd_run(args):
    """Run test suite(s)"""
    runner = TestRunner()
    
    if args.all:
        # Run all test suites
        suites = list(TESTS_DIR.glob("*.json"))
        if not suites:
            logger.error("No test suites found. Run 'init' first.")
            return
        
        for suite_path in suites:
            with open(suite_path) as f:
                suite_data = json.load(f)
            suite = TestSuite(**suite_data)
            runner.run_suite(suite)
    else:
        # Run specific suite
        suite_name = args.test_suite
        suite_path = TESTS_DIR / f"{suite_name}.json"
        
        if not suite_path.exists():
            logger.error(f"Test suite not found: {suite_path}")
            return
        
        with open(suite_path) as f:
            suite_data = json.load(f)
        suite = TestSuite(**suite_data)
        runner.run_suite(suite)
    
    runner.print_summary()
    
    # Auto-generate report
    report_path = REPORTS_DIR / f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    ReportGenerator.to_json(runner.results, runner.get_summary(), report_path)

def cmd_report(args):
    """Generate report from last test run"""
    # Find most recent log
    logs = sorted(LOG_DIR.glob("*.log"), key=lambda p: p.stat().st_mtime, reverse=True)
    
    if not logs:
        logger.error("No test logs found. Run tests first.")
        return
    
    logger.info(f"Generating {args.format} report...")
    
    report_path = REPORTS_DIR / f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    if args.format == "html":
        report_path = report_path.with_suffix(".html")
        # Would need to load results from log - simplified for demo
        logger.success(f"Report would be saved to: {report_path}")
    else:
        report_path = report_path.with_suffix(".json")
        logger.success(f"Report would be saved to: {report_path}")

def cmd_validate(args):
    """Quick validation of a single asset"""
    asset_path = Path(args.asset_path)
    
    logger.header(f"Validating: {asset_path.name}")
    
    runner = TestRunner()
    results = []
    
    # Run standard validations
    tests = [
        {"name": "File Exists", "type": "file_exists", "params": {"path": str(asset_path)}},
        {"name": "File Size", "type": "file_size", "params": {"path": str(asset_path), "min_bytes": 1}},
    ]
    
    # Add format-specific tests
    ext = asset_path.suffix.lower()
    if ext in ['.mp4', '.mov', '.avi', '.mkv']:
        tests.append({"name": "Video Codec", "type": "video_codec", "params": {"path": str(asset_path)}})
        tests.append({"name": "Resolution", "type": "resolution", "params": {"path": str(asset_path)}})
    elif ext == '.json':
        tests.append({"name": "Valid JSON", "type": "json_schema", "params": {"path": str(asset_path), "required_keys": []}})
    
    suite = TestSuite(name="Quick Validation", tests=tests)
    runner.run_suite(suite)
    runner.print_summary()

def cmd_list(args):
    """List available test suites"""
    logger.header("Available Test Suites")
    
    suites = list(TESTS_DIR.glob("*.json"))
    
    if not suites:
        print(f"  {Colors.DIM}No test suites found.{Colors.RESET}")
        print(f"  Run: python uat_automation.py init <project_name>")
        return
    
    for suite_path in suites:
        try:
            with open(suite_path) as f:
                data = json.load(f)
            name = data.get('name', suite_path.stem)
            desc = data.get('description', 'No description')
            test_count = len(data.get('tests', []))
            print(f"  {Colors.CYAN}{name}{Colors.RESET}")
            print(f"    {Colors.DIM}{desc}{Colors.RESET}")
            print(f"    {test_count} test(s)\n")
        except:
            print(f"  {Colors.RED}{suite_path.stem}{Colors.RESET} (invalid)")

# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="UAT Automation CLI - VFX/Media Pipeline Testing Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uat_automation.py init my_project       Initialize new test project
  uat_automation.py run my_project_tests  Run a test suite
  uat_automation.py run --all             Run all test suites
  uat_automation.py validate video.mp4    Quick validate an asset
  uat_automation.py list                  List available test suites
  uat_automation.py report --format html  Generate HTML report
        """
    )
    
    parser.add_argument('--version', action='version', version=f'UAT Automation {VERSION}')
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # init
    init_parser = subparsers.add_parser('init', help='Initialize new test project')
    init_parser.add_argument('project_name', help='Name of the project')
    
    # run
    run_parser = subparsers.add_parser('run', help='Run test suite(s)')
    run_parser.add_argument('test_suite', nargs='?', help='Name of test suite to run')
    run_parser.add_argument('--all', action='store_true', help='Run all test suites')
    
    # report
    report_parser = subparsers.add_parser('report', help='Generate test report')
    report_parser.add_argument('--format', choices=['json', 'html', 'terminal'], default='terminal')
    
    # validate
    validate_parser = subparsers.add_parser('validate', help='Quick validate an asset')
    validate_parser.add_argument('asset_path', help='Path to asset file')
    
    # list
    list_parser = subparsers.add_parser('list', help='List available test suites')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    commands = {
        'init': cmd_init,
        'run': cmd_run,
        'report': cmd_report,
        'validate': cmd_validate,
        'list': cmd_list,
    }
    
    commands[args.command](args)

if __name__ == '__main__':
    main()
