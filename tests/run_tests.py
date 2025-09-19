"""
Test runner scripts and utilities for RateMyRations test suite.
"""

#!/usr/bin/env python3
"""
Test runner for RateMyRations comprehensive test suite.

Usage:
    python run_tests.py                    # Run all tests
    python run_tests.py --unit             # Run only unit tests
    python run_tests.py --integration     # Run only integration tests
    python run_tests.py --e2e             # Run only end-to-end tests
    python run_tests.py --performance     # Run only performance tests
    python run_tests.py --coverage        # Run with coverage report
    python run_tests.py --html            # Generate HTML report
    python run_tests.py --verbose         # Verbose output
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path


def run_command(command, description):
    """Run a command and handle errors."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(command)}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(command, check=True, capture_output=False)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with exit code {e.returncode}")
        return False
    except FileNotFoundError:
        print(f"❌ Command not found: {command[0]}")
        return False


def check_dependencies():
    """Check if required dependencies are installed."""
    required_packages = [
        'pytest',
        'pytest-cov',
        'pytest-html',
        'selenium',
        'requests'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\nInstall with: pip install " + " ".join(missing_packages))
        return False
    
    print("✅ All required packages are installed")
    return True


def run_unit_tests(verbose=False, coverage=False):
    """Run unit tests."""
    command = ['python', '-m', 'pytest', 'tests/unit/', '-v' if verbose else '-q']
    
    if coverage:
        command.extend(['--cov=ratemyrations', '--cov-report=term-missing'])
    
    return run_command(command, "Unit Tests")


def run_integration_tests(verbose=False):
    """Run integration tests."""
    command = ['python', '-m', 'pytest', 'tests/integration/', '-v' if verbose else '-q']
    return run_command(command, "Integration Tests")


def run_e2e_tests(verbose=False):
    """Run end-to-end tests."""
    command = ['python', '-m', 'pytest', 'tests/e2e/', '-v' if verbose else '-q']
    return run_command(command, "End-to-End Tests")


def run_performance_tests(verbose=False):
    """Run performance tests."""
    command = ['python', '-m', 'pytest', 'tests/unit/test_performance.py', '-v' if verbose else '-q']
    return run_command(command, "Performance Tests")


def run_all_tests(verbose=False, coverage=False, html=False):
    """Run all tests."""
    command = ['python', '-m', 'pytest', 'tests/', '-v' if verbose else '-q']
    
    if coverage:
        command.extend(['--cov=ratemyrations', '--cov-report=term-missing'])
    
    if html:
        command.extend(['--html=test_report.html', '--self-contained-html'])
    
    return run_command(command, "All Tests")


def generate_coverage_report():
    """Generate detailed coverage report."""
    commands = [
        (['python', '-m', 'pytest', 'tests/', '--cov=ratemyrations', '--cov-report=html'], 
         "Generate HTML Coverage Report"),
        (['python', '-m', 'pytest', 'tests/', '--cov=ratemyrations', '--cov-report=xml'], 
         "Generate XML Coverage Report")
    ]
    
    success = True
    for command, description in commands:
        if not run_command(command, description):
            success = False
    
    return success


def run_linting():
    """Run code linting."""
    commands = [
        (['python', '-m', 'flake8', 'ratemyrations/', '--max-line-length=100'], 
         "Flake8 Linting"),
        (['python', '-m', 'black', '--check', 'ratemyrations/'], 
         "Black Code Formatting Check"),
        (['python', '-m', 'isort', '--check-only', 'ratemyrations/'], 
         "Import Sorting Check")
    ]
    
    success = True
    for command, description in commands:
        if not run_command(command, description):
            success = False
    
    return success


def main():
    """Main test runner."""
    parser = argparse.ArgumentParser(description="RateMyRations Test Runner")
    parser.add_argument('--unit', action='store_true', help='Run only unit tests')
    parser.add_argument('--integration', action='store_true', help='Run only integration tests')
    parser.add_argument('--e2e', action='store_true', help='Run only end-to-end tests')
    parser.add_argument('--performance', action='store_true', help='Run only performance tests')
    parser.add_argument('--coverage', action='store_true', help='Run with coverage report')
    parser.add_argument('--html', action='store_true', help='Generate HTML report')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--lint', action='store_true', help='Run linting checks')
    parser.add_argument('--all', action='store_true', help='Run all tests and checks')
    
    args = parser.parse_args()
    
    print("🧪 RateMyRations Test Suite")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Change to project directory
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    success = True
    
    # Run linting if requested
    if args.lint or args.all:
        if not run_linting():
            success = False
    
    # Run specific test suites
    if args.unit:
        if not run_unit_tests(args.verbose, args.coverage):
            success = False
    elif args.integration:
        if not run_integration_tests(args.verbose):
            success = False
    elif args.e2e:
        if not run_e2e_tests(args.verbose):
            success = False
    elif args.performance:
        if not run_performance_tests(args.verbose):
            success = False
    elif args.all:
        # Run all tests
        if not run_all_tests(args.verbose, args.coverage, args.html):
            success = False
        
        # Generate coverage report
        if args.coverage:
            if not generate_coverage_report():
                success = False
    else:
        # Default: run all tests
        if not run_all_tests(args.verbose, args.coverage, args.html):
            success = False
    
    # Summary
    print("\n" + "=" * 60)
    if success:
        print("🎉 All tests completed successfully!")
        print("✅ RateMyRations is ready for production!")
    else:
        print("❌ Some tests failed!")
        print("🔧 Please review the output above and fix any issues.")
    print("=" * 60)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
