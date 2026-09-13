# LandGuard - Community Landslide Early Warning & Alert Web Platform

**LandGuard** is a production-ready, multi-page web platform designed for **local communities in landslide-vulnerable mountain zones** and disaster management response cells.

It bridges complex geotechnical sensor telemetry with accessible, multi-channel citizen warning systems.

---

## 🌐 Full Website Architecture

The platform is structured into 6 dedicated, fully interconnected web pages:

| Page | Path | Key Capabilities |
| :--- | :--- | :--- |
| **Home & Command Hub** | [`index.html`](index.html) | Live 4-tier risk status dial, threat matrix, 6-subsystem navigation grid, latest bulletins, emergency helpline directory. |
| **Alerts & SMS Broadcasts** | [`alerts.html`](alerts.html) | Village-level SMS/WhatsApp alert registration, operator broadcast dispatcher, phone simulator preview, filterable bulletin archive. |
| **Interactive Geohazard Map** | [`map.html`](map.html) | Full-screen Leaflet map with layer toggles (Sensors, Shelters, Hazard Zones), shelter directory side pane with capacity and route advice. |
| **Sensor Telemetry Hub** | [`telemetry.html`](telemetry.html) | Multi-depth soil moisture profiling (0.5m, 1.2m, 2.5m), rain gauge time-series, slope inclinometers, FoS calculator, CSV telemetry export. |
| **Community Preparedness** | [`community.html`](community.html) | Visual field guide to 4 geological precursor signs, interactive 72h grab-bag checklist with `localStorage` persistence, 3-phase action guide. |
| **Citizen Hazard Reports** | [`reports.html`](reports.html) | Crowd-sourced hazard reporting form (ground cracks, tilted poles, muddy springs) with GPS auto-detection, photo upload simulation, and live verified reports feed. |

---

## ⚡ Core Technologies

- **HTML5 & Tailwind CSS**: Responsive, accessible mobile-first interface optimized for emergency clarity.
- **Leaflet.js & CartoDB / OpenStreetMap**: GIS mapping engine rendering sensor stations, designated shelters, and geohazard polygons.
- **Chart.js**: Real-time dual-axis time-series visualization correlating soil saturation lag with rainfall intensity.
- **Web Audio API**: In-browser synthesized dual-tone emergency siren without external audio files.
- **HTML5 Web Storage (`localStorage`)**: Offline persistence for emergency grab-bag items, registered mobile numbers, and citizen hazard reports.

---

## 🚀 Quick Start

### Option 1: Open in Any Web Browser
Double-click [`index.html`](index.html) to open directly in Chrome, Edge, Firefox, or Safari.

### Option 2: Serve Locally (Optional)
```powershell
# From the project directory:
cd C:\Users\Hpp\.gemini\antigravity\scratch\landguard

# Run with Python (if available):
python -m http.server 3000

# Or run with Node/npx:
npx serve .
```
Then navigate to `http://localhost:3000`.

---

## 📊 Geotechnical Risk Thresholds

| Risk Level | Color | Soil Moisture (% VWC) | Rain Intensity (mm/h) | Inclinometer Tilt (°) | Citizen Directive |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NORMAL** | 🟢 Green | `< 65%` | `< 15 mm/h` | `< 0.5°` | Routine awareness. Keep surface drainage clear. |
| **ADVISORY** | 🟡 Yellow | `65% - 75%` | `15 - 30 mm/h` | `0.5° - 1.5°` | Avoid vulnerable trail cuts; pack grab bags; charge lanterns. |
| **WARNING** | 🟠 Orange | `75% - 85%` | `30 - 50 mm/h` | `1.5° - 2.5°` | Move to ground-floor safe zones; prepare for immediate departure. |
| **CRITICAL** | 🔴 Red | `> 85%` | `> 50 mm/h` | `> 2.5°` | **EVACUATE IMMEDIATELY** to designated safe shelters. |
