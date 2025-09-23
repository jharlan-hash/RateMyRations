#!/bin/bash

# RateMyRations Startup Script
# 🚀 Beautiful startup experience with progress indicators

set -e

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
STAR='⭐'
ROCKET='🚀'
GEAR='⚙️'
FIRE='🔥'
CHECK='✅'
CROSS='❌'
WARNING='⚠️'
INFO='ℹ️'

# Function to print colored text
print_color() {
    local color=$1
    local text=$2
    echo -e "${color}${text}${NC}"
}

# Function to print a banner
print_banner() {
    echo ""
    print_color $CYAN "╔══════════════════════════════════════════════════════════════╗"
    print_color $CYAN "║                                                              ║"
    print_color $CYAN "║  $ROCKET RateMyRations - University of Iowa Dining $ROCKET  ║"
    print_color $CYAN "║                                                              ║"
    print_color $CYAN "║  $STAR Beautiful startup experience $STAR                    ║"
    print_color $CYAN "║                                                              ║"
    print_color $CYAN "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

# Function to show progress
show_progress() {
    local message=$1
    local duration=${2:-2}
    
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

# Function to check if a service is running
check_service() {
    local service=$1
    local port=${2:-8000}
    
    if curl -s "http://localhost:$port" > /dev/null 2>&1; then
        print_color $GREEN "$CHECK $service is running on port $port"
        return 0
    else
        print_color $RED "$CROSS $service is not responding on port $port"
        return 1
    fi
}

# Function to show system info
show_system_info() {
    print_color $BLUE "$INFO System Information:"
    echo -e "  ${WHITE}OS:${NC} $(uname -s) $(uname -r)"
    echo -e "  ${WHITE}Python:${NC} $(python3 --version)"
    echo -e "  ${WHITE}Node:${NC} $(node --version 2>/dev/null || echo 'Not installed')"
    echo -e "  ${WHITE}Memory:${NC} $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
    echo -e "  ${WHITE}Disk:${NC} $(df -h . | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"
    echo ""
}

# Function to show startup steps
show_startup_steps() {
    print_color $PURPLE "$GEAR Startup Steps:"
    echo -e "  ${WHITE}1.${NC} Initialize database tables"
    echo -e "  ${WHITE}2.${NC} Start Gunicorn server (4 workers)"
    echo -e "  ${WHITE}3.${NC} Wait for server to be ready"
    echo -e "  ${WHITE}4.${NC} Warm application cache"
    echo -e "  ${WHITE}5.${NC} Ready to serve requests!"
    echo ""
}

# Main startup sequence
main() {
    # Clear screen and show banner
    clear
    print_banner
    show_system_info
    show_startup_steps
    
    # Step 1: Initialize database
    print_color $BLUE "$GEAR Step 1: Initializing database tables..."
    show_progress "Creating database tables" 1
    if python3 ratemyrations/database.py; then
        print_color $GREEN "$CHECK Database initialized successfully"
    else
        print_color $RED "$CROSS Database initialization failed"
        exit 1
    fi
    echo ""
    
    # Step 2: Start Gunicorn
    print_color $BLUE "$GEAR Step 2: Starting Gunicorn server..."
    show_progress "Starting 4 worker processes" 2
    
    # Set environment variables
    export RATE_LIMIT_STORAGE_URI=redis://127.0.0.1:6379/0
    export ADMIN_TOKEN=mega_gooner
    
    # Start Gunicorn in background
    gunicorn -w 4 -b 0.0.0.0:8000 ratemyrations.wsgi:application &
    GUNICORN_PID=$!
    
    print_color $GREEN "$CHECK Gunicorn started (PID: $GUNICORN_PID)"
    echo ""
    
    # Step 3: Wait for server to be ready
    print_color $BLUE "$GEAR Step 3: Waiting for server to be ready..."
    show_progress "Waiting for workers to initialize" 3
    
    # Check if Gunicorn is still running
    if ! kill -0 $GUNICORN_PID 2>/dev/null; then
        print_color $RED "$CROSS Gunicorn failed to start"
        exit 1
    fi
    
    # Wait a bit more for workers to be ready
    sleep 2
    
    # Test if server is responding
    if check_service "Gunicorn" 8000; then
        print_color $GREEN "$CHECK Server is responding"
    else
        print_color $YELLOW "$WARNING Server not responding yet, continuing..."
    fi
    echo ""
    
    # Step 4: Warm the cache
    print_color $BLUE "$GEAR Step 4: Warming application cache..."
    show_progress "Pre-loading menu data for all workers" 2
    
    if python3 warm_cache.py http://localhost:8000; then
        print_color $GREEN "$CHECK Cache warmed successfully"
    else
        print_color $YELLOW "$WARNING Cache warming failed, but server is still running"
    fi
    echo ""
    
    # Step 5: Ready!
    print_color $GREEN "$FIRE RateMyRations is ready to serve!"
    echo ""
    print_color $CYAN "╔══════════════════════════════════════════════════════════════╗"
    print_color $CYAN "║  $STAR Server Information $STAR                              ║"
    print_color $CYAN "╠══════════════════════════════════════════════════════════════╣"
    print_color $CYAN "║  ${WHITE}Gunicorn PID:${NC} $GUNICORN_PID                                    ║"
    print_color $CYAN "║  ${WHITE}Workers:${NC} 4 processes                                      ║"
    print_color $CYAN "║  ${WHITE}Port:${NC} 8000                                              ║"
    print_color $CYAN "║  ${WHITE}Access:${NC} http://localhost:8000                           ║"
    print_color $CYAN "║  ${WHITE}External:${NC} https://rations.jacksovern.xyz                ║"
    print_color $CYAN "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    print_color $YELLOW "$INFO Press Ctrl+C to stop the server"
    print_color $YELLOW "$INFO Server logs will appear below:"
    echo ""
    
    # Keep the script running and show logs
    wait $GUNICORN_PID
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${RED}${CROSS} Shutting down RateMyRations...${NC}"; exit 0' INT

# Run main function
main "$@"