#!/bin/bash

# RateMyRations Status Script
# 📊 Beautiful status check with detailed information

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
STATUS='📊'
CHECK='✅'
CROSS='❌'
WARNING='⚠️'
INFO='ℹ️'
GEAR='⚙️'
FIRE='🔥'
STAR='⭐'

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
    print_color $CYAN "║  $STATUS RateMyRations - System Status $STATUS              ║"
    print_color $CYAN "║                                                              ║"
    print_color $CYAN "╚══════════════════════════════════════════════════════════════╝"
    echo ""
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

# Function to get process info
get_process_info() {
    local pid=$1
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        local cpu=$(ps -p "$pid" -o %cpu --no-headers | tr -d ' ')
        local mem=$(ps -p "$pid" -o %mem --no-headers | tr -d ' ')
        local time=$(ps -p "$pid" -o etime --no-headers | tr -d ' ')
        echo "CPU: ${cpu}%, Memory: ${mem}%, Uptime: ${time}"
    else
        echo "Process not found"
    fi
}

# Main status check
main() {
    print_banner
    
    # Check Gunicorn processes
    print_color $BLUE "$GEAR Checking RateMyRations processes..."
    
    GUNICORN_PIDS=$(pgrep -f "gunicorn.*ratemyrations")
    PYTHON_PIDS=$(pgrep -f "python.*ratemyrations")
    
    if [ -n "$GUNICORN_PIDS" ]; then
        print_color $GREEN "$CHECK Gunicorn processes found: $GUNICORN_PIDS"
        
        # Get detailed info for each process
        for pid in $GUNICORN_PIDS; do
            local info=$(get_process_info "$pid")
            echo -e "  ${WHITE}PID $pid:${NC} $info"
        done
    else
        print_color $RED "$CROSS No Gunicorn processes found"
    fi
    
    if [ -n "$PYTHON_PIDS" ]; then
        print_color $YELLOW "$WARNING Python processes found: $PYTHON_PIDS"
        for pid in $PYTHON_PIDS; do
            local info=$(get_process_info "$pid")
            echo -e "  ${WHITE}PID $pid:${NC} $info"
        done
    fi
    
    echo ""
    
    # Check service availability
    print_color $BLUE "$GEAR Checking service availability..."
    
    if check_service "RateMyRations" 8000; then
        SERVICE_STATUS="Running"
        STATUS_COLOR=$GREEN
        STATUS_ICON=$CHECK
    else
        SERVICE_STATUS="Not Responding"
        STATUS_COLOR=$RED
        STATUS_ICON=$CROSS
    fi
    
    echo ""
    
    # Check Redis
    print_color $BLUE "$GEAR Checking Redis connection..."
    if redis-cli ping > /dev/null 2>&1; then
        print_color $GREEN "$CHECK Redis is running"
    else
        print_color $RED "$CROSS Redis is not responding"
    fi
    
    echo ""
    
    # System resources
    print_color $BLUE "$GEAR System Resources:"
    echo -e "  ${WHITE}Memory Usage:${NC} $(free -h | awk '/^Mem:/ {print $3 "/" $2 " (" int($3/$2*100) "% used)"}')"
    echo -e "  ${WHITE}Disk Usage:${NC} $(df -h . | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"
    echo -e "  ${WHITE}Load Average:${NC} $(uptime | awk -F'load average:' '{print $2}')"
    echo ""
    
    # Network status
    print_color $BLUE "$GEAR Network Status:"
    echo -e "  ${WHITE}Port 8000:${NC} $(netstat -tlnp 2>/dev/null | grep :8000 | wc -l) connections"
    echo -e "  ${WHITE}External Access:${NC} https://rations.jacksovern.xyz"
    echo ""
    
    # Final status summary
    print_color $CYAN "╔══════════════════════════════════════════════════════════════╗"
    print_color $CYAN "║  $STATUS Service Status Summary $STATUS                      ║"
    print_color $CYAN "╠══════════════════════════════════════════════════════════════╣"
    print_color $CYAN "║  ${WHITE}RateMyRations:${NC} $STATUS_COLOR$STATUS_ICON $SERVICE_STATUS${NC}                    ║"
    print_color $CYAN "║  ${WHITE}Processes:${NC} $(echo $GUNICORN_PIDS | wc -w) Gunicorn, $(echo $PYTHON_PIDS | wc -w) Python        ║"
    print_color $CYAN "║  ${WHITE}Port:${NC} 8000                                              ║"
    print_color $CYAN "║  ${WHITE}Access:${NC} http://localhost:8000                           ║"
    print_color $CYAN "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Recommendations
    if [ -z "$GUNICORN_PIDS" ]; then
        print_color $YELLOW "$WARNING RateMyRations is not running"
        print_color $BLUE "$INFO To start: ./start.sh"
    elif [ "$SERVICE_STATUS" = "Not Responding" ]; then
        print_color $YELLOW "$WARNING Service is running but not responding"
        print_color $BLUE "$INFO Try restarting: ./stop.sh && ./start.sh"
    else
        print_color $GREEN "$FIRE RateMyRations is running perfectly!"
        print_color $BLUE "$INFO To stop: ./stop.sh"
    fi
    
    echo ""
}

# Run main function
main "$@"
