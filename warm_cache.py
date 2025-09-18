#!/usr/bin/env python3
"""
Cache warming script for RateMyRations.
Warms up all Gunicorn workers by hitting them multiple times.
"""

import requests
import time
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

def warm_worker(base_url, worker_id):
    """Warm up a single worker by hitting multiple endpoints."""
    endpoints = [
        "/",
        "/about", 
        "/api/menus",
        "/api/ratings",
        "/warm-cache",
        "/healthz"
    ]
    
    results = []
    for endpoint in endpoints:
        try:
            url = f"{base_url}{endpoint}"
            response = requests.get(url, timeout=10)
            results.append(f"Worker {worker_id}: {endpoint} -> {response.status_code}")
        except Exception as e:
            results.append(f"Worker {worker_id}: {endpoint} -> ERROR: {e}")
    
    return results

def main():
    if len(sys.argv) != 2:
        print("Usage: python warm_cache.py <base_url>")
        print("Example: python warm_cache.py http://localhost:8000")
        sys.exit(1)
    
    base_url = sys.argv[1].rstrip('/')
    num_workers = 4  # Match your Gunicorn worker count
    
    print(f"Warming cache for {num_workers} workers at {base_url}")
    print("This may take a moment...")
    
    # Hit each worker multiple times to ensure all are warmed
    with ThreadPoolExecutor(max_workers=num_workers * 2) as executor:
        futures = []
        
        # Submit multiple requests to hit different workers
        for i in range(num_workers * 3):  # Hit each worker ~3 times
            future = executor.submit(warm_worker, base_url, i % num_workers)
            futures.append(future)
        
        # Collect results
        for future in as_completed(futures):
            try:
                results = future.result()
                for result in results:
                    print(result)
            except Exception as e:
                print(f"Error: {e}")
    
    print("\nCache warming complete!")
    print("All workers should now have warm caches.")

if __name__ == "__main__":
    main()
