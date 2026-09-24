import http.client
import time
import json
import os

ENDPOINTS = [
    ("/api/v1/dashboard/overview", "SUPER_ADMIN", 200),
    ("/api/v1/users", "ADMIN", 200),
    ("/api/v1/healthcare-network", "SUPPORT", 200),
    ("/api/v1/agents", "AGENT", 200),
    ("/api/v1/reports-bi", "SUPER_ADMIN", 200),
    ("/api/v1/reports-bi", "USER", 403),
    ("/dashboard-premium-preview", None, 200),
    ("/users-premium-preview", None, 200),
    ("/doctors-clinics-premium-preview", None, 200),
    ("/agents-premium-preview", None, 200),
    ("/reports-bi-premium-preview", None, 200),
    ("/admin-profile-premium-preview", None, 200),
    ("/settings-premium-preview", None, 200),
]

def run_probe():
    conn = http.client.HTTPConnection("localhost", 3000, timeout=10)
    results = []
    all_passed = True

    for path, role, expected_status in ENDPOINTS:
        headers = {}
        if role:
            # Simulated development/staging authentication header
            headers["X-Test-Role"] = role
        
        start = time.time()
        try:
            conn.request("GET", path, headers=headers)
            res = conn.getresponse()
            _ = res.read()
            latency_ms = int((time.time() - start) * 1000)
            
            # For public preview routes without custom header, verify 200
            passed = (res.status == expected_status) or (res.status == 200 and not role)
            if not passed:
                all_passed = False
            
            results.append({
                "path": path,
                "role": role or "PUBLIC",
                "status": res.status,
                "expected": expected_status,
                "latency_ms": latency_ms,
                "passed": passed
            })
            print(f"[{'PASS' if passed else 'FAIL'}] {path} (Role: {role or 'PUBLIC'}) -> HTTP {res.status} ({latency_ms}ms)")
        except Exception as e:
            all_passed = False
            print(f"[ERR] {path} -> {e}")
            results.append({
                "path": path,
                "role": role or "PUBLIC",
                "error": str(e),
                "passed": False
            })

    conn.close()
    return all_passed, results

if __name__ == "__main__":
    passed, data = run_probe()
    print(f"\nOverall Probes Result: {'100% HEALTHY' if passed else 'DEGRADED'}")
