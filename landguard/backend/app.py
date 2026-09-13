"""
LandGuard Python Backend Server (Standard Library HTTP & REST API)
Autonomous Early Warning Geotechnical Engine.
Zero external dependencies required.
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from datetime import datetime

PORT = 8080
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

telemetry_data = {
    "stationId": "station-alpha",
    "riskTier": "ADVISORY",
    "metrics": {
        "soilMoisture": 76.4,
        "soilMoistureShallow": 82.1,
        "soilMoistureDeep": 65.0,
        "rainfall1h": 38.5,
        "rainfall24h": 124.0,
        "slopeTilt": 2.15,
        "porePressure": 42.8
    },
    "factorOfSafety": 1.18
}

citizen_reports = [
    {
        "id": "rep-101",
        "reporterName": "Rajesh Thakur",
        "location": "North Ridge Road, km 4.2",
        "hazardType": "Ground Fissure",
        "severity": "High",
        "timestamp": "35 mins ago",
        "description": "3-inch tension crack across asphalt towards hillside retaining wall.",
        "status": "Verified by SDRF",
        "upvotes": 14
    }
]

subscribers = []

class LandGuardRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/health"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._set_cors_headers()
            self.end_headers()
            resp = {"status": "UP", "service": "LandGuard-Python-Engine", "timestamp": datetime.now().isoformat()}
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        if self.path.startswith("/api/telemetry"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(telemetry_data).encode("utf-8"))
            return

        if self.path.startswith("/api/reports"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(citizen_reports).encode("utf-8"))
            return

        # Fallback to static file serving
        super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8")

        if self.path.startswith("/api/telemetry"):
            payload = json.loads(post_data)
            if "soilMoisture" in payload:
                telemetry_data["metrics"]["soilMoisture"] = float(payload["soilMoisture"])
            if "rainfall1h" in payload:
                telemetry_data["metrics"]["rainfall1h"] = float(payload["rainfall1h"])

            # Rule evaluation
            moist = telemetry_data["metrics"]["soilMoisture"]
            telemetry_data["riskTier"] = "CRITICAL EVACUATE" if moist >= 85 else ("WARNING" if moist >= 75 else "ADVISORY")
            telemetry_data["factorOfSafety"] = round(1.6 - (moist / 100 * 0.8), 2)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"status": "INGESTED", "telemetry": telemetry_data}).encode("utf-8"))
            return

        if self.path.startswith("/api/reports"):
            item = json.loads(post_data)
            item["id"] = f"rep-{int(datetime.now().timestamp())}"
            item["timestamp"] = "Just now"
            item["status"] = "Pending Field Verification"
            item["upvotes"] = 1
            citizen_reports.insert(0, item)

            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"status": "SUBMITTED", "report": item}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == "__main__":
    print(f"Starting LandGuard Python Backend on http://localhost:{PORT}")
    server = HTTPServer(("", PORT), LandGuardRequestHandler)
    server.serve_forever()
