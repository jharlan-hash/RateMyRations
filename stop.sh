#!/bin/bash

# RateMyRations Stop Script
# 🛑 Graceful shutdown with beautiful output

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Unicode symbols
STOP='🛑'
CHECK='✅'
CROSS='❌'
WARNING='⚠️'
INFO='ℹ️'
GEAR='⚙️'

# Function to print colored text
print_color() {
    local color=$1
    local text=$2
    echo -e "${color}${text}${NC}"
}

# Function to print a banner
print_banner() {
    echo ""
    print_color $RED "╔══════════════════════════════════════════════════════════════╗"
    print_color $RED "║                                                              ║"
    print_color $RED "║  $STOP RateMyRations - Shutting Down $STOP                  ║"
    print_color $RED "║                                                              ║"
    print_color $RED "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

# Function to show progress
show_progress() {
    local message=$1
    local duration=${2:-1}
    
    print_color $YELLOW "$INFO $message"
    
    # Create a simple progress bar
    for i in {1..20}; do
        printf "\r${YELLOW}${INFO} Progress: ["
        for j in $(seq 1 $i); do printf "█"; done
        for j in $(seq $((i+1)) 20); do printf "░"; done
        printf "] %d%%${NC}" $((i*5))
        sleep $((duration*50/1000))
    done
    printf "\n"
}

# Main shutdown sequence
main() {
    print_banner
    
    # Find Gunicorn processes
    print_color $BLUE "$GEAR Looking for RateMyRations processes..."
    
    GUNICORN_PIDS=$(pgrep -f "gunicorn.*ratemyrations")
    
    if [ -z "$GUNICORN_PIDS" ]; then
        print_color $YELLOW "$WARNING No RateMyRations processes found"
        print_color $YELLOW "$INFO Checking for any Python processes..."
        
        PYTHON_PIDS=$(pgrep -f "python.*ratemyrations")
        if [ -z "$PYTHON_PIDS" ]; then
            print_color $YELLOW "$WARNING No RateMyRations Python processes found"
            print_color $GREEN "$CHECK RateMyRations appears to be already stopped"
            exit 0
        else
            print_color $BLUE "$INFO Found Python processes: $PYTHON_PIDS"
            print_color $YELLOW "$WARNING Attempting to stop Python processes..."
            echo "$PYTHON_PIDS" | xargs kill -TERM
            sleep 2
            echo "$PYTHON_PIDS" | xargs kill -KILL 2>/dev/null || true
        fi
    else
        print_color $BLUE "$INFO Found Gunicorn processes: $GUNICORN_PIDS"
        
        # Graceful shutdown
        print_color $BLUE "$GEAR Sending graceful shutdown signal..."
        show_progress "Sending SIGTERM to Gunicorn processes" 1
        
        echo "$GUNICORN_PIDS" | xargs kill -TERM
        
        # Wait for graceful shutdown
        print_color $BLUE "$GEAR Waiting for graceful shutdown..."
        show_progress "Waiting for processes to finish current requests" 3
        
        # Check if processes are still running
        sleep 2
        REMAINING_PIDS=$(pgrep -f "gunicorn.*ratemyrations")
        
        if [ -n "$REMAINING_PIDS" ]; then
            print_color $YELLOW "$WARNING Some processes still running, forcing shutdown..."
            show_progress "Sending SIGKILL to remaining processes" 1
            echo "$REMAINING_PIDS" | xargs kill -KILL
        fi
        
        print_color $GREEN "$CHECK All RateMyRations processes stopped"
    fi
    
    # Clean up any remaining processes
    print_color $BLUE "$GEAR Cleaning up any remaining processes..."
    show_progress "Final cleanup" 1
    
    # Kill any remaining Python processes related to RateMyRations
    pkill -f "python.*ratemyrations" 2>/dev/null || true
    pkill -f "gunicorn.*ratemyrations" 2>/dev/null || true
    
    print_color $GREEN "$CHECK Cleanup complete"
    echo ""
    
    # Final status
    print_color $CYAN "╔══════════════════════════════════════════════════════════════╗"
    print_color $CYAN "║  $CHECK RateMyRations Shutdown Complete $CHECK                ║"
    print_color $CYAN "╠══════════════════════════════════════════════════════════════╣"
    print_color $CYAN "║  ${WHITE}Status:${NC} Stopped                                           ║"
    print_color $CYAN "║  ${WHITE}Port 8000:${NC} Available                                    ║"
    print_color $CYAN "║  ${WHITE}To restart:${NC} ./start.sh                                 ║"
    print_color $CYAN "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    print_color $GREEN "$CHECK RateMyRations has been stopped successfully"
    print_color $BLUE "$INFO You can restart it anytime with: ./start.sh"
    echo ""
}

# Run main function
main "$@"
