/**
 * LandGuard Node.js / Express Backend Server
 * Production REST API for IoT telemetry ingestion, SMS broadcasting, and citizen reports.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const WEB_ROOT = path.join(__dirname, '..');

// In-Memory Database Stores
let telemetry = {
  stationId: 'station-alpha',
  riskTier: 'ADVISORY',
  metrics: {
    soilMoisture: 76.4,
    soilMoistureShallow: 82.1,
    soilMoistureDeep: 65.0,
    rainfall1h: 38.5,
    rainfall24h: 124.0,
    slopeTilt: 2.15,
    porePressure: 42.8
  },
  factorOfSafety: 1.18
};

let reports = [
  { id: "rep-101", reporterName: "Rajesh Thakur", location: "North Ridge Road, km 4.2", hazardType: "Ground Fissure", severity: "High", timestamp: "35 mins ago", description: "3-inch wide tension crack across asphalt.", status: "Verified by SDRF", upvotes: 14 }
];

let bulletins = [
  { id: "b-1", time: "10:45 AM", category: "Evacuation", level: "CRITICAL", title: "North Ridge Escarpment: Ground Movement Advisory", text: "Station Alpha inclinometer detected 2.15° slope displacement. TDR soil moisture is 76.4%." }
];

let subscribers = [];

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  // CORS Pre-flight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // REST API Routes
  if (pathname === '/api/health') {
    return sendJson(res, 200, { status: "UP", service: "LandGuard-Node-Backend", version: "2.4.0", timestamp: new Date().toISOString() });
  }

  if (pathname === '/api/telemetry' && req.method === 'GET') {
    return sendJson(res, 200, telemetry);
  }

  if (pathname === '/api/telemetry' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (payload.soilMoisture) telemetry.metrics.soilMoisture = parseFloat(payload.soilMoisture);
        if (payload.rainfall1h) telemetry.metrics.rainfall1h = parseFloat(payload.rainfall1h);

        // Evaluate Rules
        if (telemetry.metrics.soilMoisture >= 85 || telemetry.metrics.rainfall1h >= 50) {
          telemetry.riskTier = "CRITICAL EVACUATE";
        } else if (telemetry.metrics.soilMoisture >= 75) {
          telemetry.riskTier = "WARNING";
        } else {
          telemetry.riskTier = "ADVISORY";
        }
        telemetry.factorOfSafety = +(1.6 - (telemetry.metrics.soilMoisture / 100 * 0.8) - (telemetry.metrics.rainfall1h / 90 * 0.3)).toFixed(2);
        return sendJson(res, 200, { status: "INGESTED", telemetry });
      } catch (err) {
        return sendJson(res, 400, { error: "Invalid JSON format" });
      }
    });
    return;
  }

  if (pathname === '/api/reports' && req.method === 'GET') {
    return sendJson(res, 200, reports);
  }

  if (pathname === '/api/reports' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const item = JSON.parse(body);
        item.id = `rep-${Date.now()}`;
        item.timestamp = "Just now";
        item.status = "Pending Field Verification";
        item.upvotes = 1;
        reports.unshift(item);
        return sendJson(res, 201, { status: "SUBMITTED", report: item });
      } catch (e) {
        return sendJson(res, 400, { error: "Invalid payload" });
      }
    });
    return;
  }

  if (pathname === '/api/alerts' && req.method === 'GET') {
    return sendJson(res, 200, bulletins);
  }

  if (pathname === '/api/alerts/subscribe' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const sub = JSON.parse(body);
        subscribers.push(sub);
        return sendJson(res, 201, { status: "SUBSCRIBED", count: subscribers.length });
      } catch (e) {
        return sendJson(res, 400, { error: "Invalid payload" });
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(WEB_ROOT, pathname === '/' ? 'index.html' : pathname);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.js') contentType = 'application/javascript';
    if (ext === '.json') contentType = 'application/json';
    res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`LandGuard Node.js Server listening on http://localhost:${PORT}`);
});
