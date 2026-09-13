// LandGuard Unified Multi-Page Controller & State Engine

// Global State
let activeStationId = 'station-alpha';
let mapInstance = null;
let telemetryChartInstance = null;
let sirenAudioCtx = null;
let sirenOscillator = null;
let sirenGainNode = null;
let sirenInterval = null;
let isSirenActive = false;

// Checklist default items
const DEFAULT_CHECKLIST = [
  { id: "item-1", label: "High-power LED flashlight & spare batteries", checked: false },
  { id: "item-2", label: "Emergency loud whistle for signaling rescuers", checked: false },
  { id: "item-3", label: "Waterproof pouch for Aadhaar/IDs & land records", checked: false },
  { id: "item-4", label: "72-hour non-perishable dry food & energy bars", checked: false },
  { id: "item-5", label: "3 liters sealed drinking water per person", checked: false },
  { id: "item-6", label: "First-aid kit + 14-day supply of essential medications", checked: false },
  { id: "item-7", label: "Sturdy boots & waterproof rain poncho", checked: false },
  { id: "item-8", label: "Portable power bank & phone charging cable", checked: false }
];

// Broadcast Feed list
let broadcastMessages = [
  {
    id: "b-1",
    category: "Evacuation",
    time: "10:45 AM",
    level: "CRITICAL",
    color: "red",
    title: "North Ridge Escarpment: Ground Movement Advisory",
    text: "Station Alpha inclinometer detected 2.15° slope displacement. TDR soil moisture is 76.4%. Families within 200m of Ridge Cut are advised to move to Govt School Shelter."
  },
  {
    id: "b-2",
    category: "Weather",
    time: "09:15 AM",
    level: "WEATHER",
    color: "blue",
    title: "IMD Orange Alert: Cloudburst Warning for Shimla Hills",
    text: "Heavy precipitation in excess of 40mm/h predicted over next 4 hours. Mountain streams may experience flash surge and debris wash."
  },
  {
    id: "b-3",
    category: "Road Closure",
    time: "08:30 AM",
    level: "ADVISORY",
    color: "amber",
    title: "Valley Pass Highway: Partial Lane Restriction",
    text: "Minor stonefall observed at km 6. JCB clearance crew deployed. Commuters advised to divert via circular ridge route."
  },
  {
    id: "b-4",
    category: "Shelter",
    time: "07:30 AM",
    level: "INFO",
    color: "emerald",
    title: "Evacuation Shelters Activated",
    text: "Higher Secondary School Auditorium and Civic Center West Wing have been opened with power backup and medical supplies."
  }
];

// LandGuard Backend API Client
const API_BASE_URL = (window.location.protocol.startsWith('http')) 
  ? `${window.location.origin}/api` 
  : 'http://localhost:8080/api';

const LandGuardAPI = {
  isBackendConnected: false,

  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        this.isBackendConnected = true;
        this.updateConnectionBadge(true, data.runtime || 'Connected');
        return data;
      }
    } catch (e) {
      // Backend not running; fallback to local mode
      this.isBackendConnected = false;
      this.updateConnectionBadge(false);
    }
    return null;
  },

  updateConnectionBadge(isOnline, runtime = '') {
    let badge = document.getElementById('backendStatusBadge');
    if (!badge) {
      const banner = document.getElementById('emergencyBanner');
      if (banner) {
        badge = document.createElement('div');
        badge.id = 'backendStatusBadge';
        badge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded ml-2 transition-all';
        banner.appendChild(badge);
      }
    }
    if (badge) {
      if (isOnline) {
        badge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow flex items-center space-x-1';
        badge.innerHTML = `<span>🟢 API: Online (${runtime})</span>`;
      } else {
        badge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900/60 text-slate-400 border border-slate-700 hidden sm:flex';
        badge.innerHTML = `<span>⚪ API: Standalone</span>`;
      }
    }
  },

  async fetchTelemetry(stationId = 'station-alpha') {
    if (!this.isBackendConnected) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/telemetry?station=${stationId}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("API fetch failed, using local telemetry", e);
    }
    return null;
  },

  async sendTelemetryIngestion(soilMoisture, rainfall1h) {
    if (!this.isBackendConnected) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soilMoisture, rainfall1h })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("API telemetry ingestion failed", e);
    }
    return null;
  },

  async postCitizenReport(reportData) {
    if (!this.isBackendConnected) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("API post report failed", e);
    }
    return null;
  },

  async postSubscriber(subData) {
    if (!this.isBackendConnected) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("API subscribe failed", e);
    }
    return null;
  }
};

// ==========================================
// SHARED INITIALIZATION ON DOM READY
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Check backend server connection
  LandGuardAPI.checkHealth();

  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Highlight Active Navigation Link
  highlightActiveNav();

  // Setup Global Siren Toggle
  const sirenBtn = document.getElementById('btnSirenToggle');
  if (sirenBtn) {
    sirenBtn.addEventListener('click', toggleEmergencySiren);
  }

  // Setup Clock in Phone Simulator
  updatePhoneClock();
  setInterval(updatePhoneClock, 60000);

  // Initialize Page Specific Routines
  const pageId = document.body.getAttribute('data-page');

  if (pageId === 'index') {
    initIndexPage();
  } else if (pageId === 'alerts') {
    initAlertsPage();
  } else if (pageId === 'map') {
    initFullMapPage();
  } else if (pageId === 'telemetry') {
    initTelemetryPage();
  } else if (pageId === 'community') {
    initCommunityPage();
  } else if (pageId === 'reports') {
    initReportsPage();
  }
});

// Highlight Current Nav Item
function highlightActiveNav() {
  const currentPage = document.body.getAttribute('data-page') || 'index';
  const navLinks = document.querySelectorAll('[data-nav-target]');
  navLinks.forEach(link => {
    if (link.getAttribute('data-nav-target') === currentPage) {
      link.classList.add('nav-link-active');
      link.classList.remove('text-slate-300', 'hover:text-white');
    }
  });
}

// ==========================================
// SHARED WEB AUDIO EMERGENCY SIREN
// ==========================================
function toggleEmergencySiren() {
  const btn = document.getElementById('btnSirenToggle');
  const btnText = document.getElementById('sirenBtnText');

  if (isSirenActive) {
    stopSiren();
    if (btn) {
      btn.classList.remove('siren-active', 'bg-red-600');
      btn.classList.add('bg-slate-950');
    }
    if (btnText) btnText.textContent = "Test Siren";
  } else {
    startSiren();
    if (btn) {
      btn.classList.add('siren-active', 'bg-red-600');
      btn.classList.remove('bg-slate-950');
    }
    if (btnText) btnText.textContent = "Mute Siren";
  }
}

function startSiren() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    if (!sirenAudioCtx) {
      sirenAudioCtx = new AudioContext();
    }
    if (sirenAudioCtx.state === 'suspended') {
      sirenAudioCtx.resume();
    }

    sirenOscillator = sirenAudioCtx.createOscillator();
    sirenGainNode = sirenAudioCtx.createGain();

    sirenGainNode.gain.setValueAtTime(0.12, sirenAudioCtx.currentTime);
    sirenOscillator.type = 'sawtooth';
    sirenOscillator.frequency.setValueAtTime(750, sirenAudioCtx.currentTime);

    sirenOscillator.connect(sirenGainNode);
    sirenGainNode.connect(sirenAudioCtx.destination);

    sirenOscillator.start();
    isSirenActive = true;

    let high = false;
    sirenInterval = setInterval(() => {
      if (!isSirenActive || !sirenOscillator) return;
      const targetFreq = high ? 960 : 700;
      sirenOscillator.frequency.exponentialRampToValueAtTime(targetFreq, sirenAudioCtx.currentTime + 0.35);
      high = !high;
    }, 400);
  } catch (err) {
    console.error("Audio Context error:", err);
  }
}

function stopSiren() {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  if (sirenOscillator) {
    try {
      sirenOscillator.stop();
      sirenOscillator.disconnect();
    } catch (e) {}
    sirenOscillator = null;
  }
  isSirenActive = false;
}

// ==========================================
// SHARED SMS / PHONE SIMULATOR MODAL
// ==========================================
function openSmsSimulator(customMessage) {
  const modal = document.getElementById('smsModal');
  const phoneAlertCard = document.getElementById('phoneAlertCard');
  const phoneAlertMsg = document.getElementById('phoneAlertMsg');
  const replyConfirmation = document.getElementById('phoneReplyConfirmation');

  if (!modal) return;
  if (replyConfirmation) replyConfirmation.classList.add('hidden');

  if (customMessage) {
    phoneAlertMsg.textContent = customMessage;
  } else {
    phoneAlertMsg.textContent = "EMERGENCY ALERT: LandGuard North Ridge Station triggered. Soil moisture at 76.4%, Rainfall 38.5 mm/h. High risk of debris flow. Please assemble at Govt School Safe Shelter.";
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  if (phoneAlertCard) {
    phoneAlertCard.classList.remove('vibrate-alert');
    void phoneAlertCard.offsetWidth;
    phoneAlertCard.classList.add('vibrate-alert');
  }
}

function closeSmsSimulator() {
  const modal = document.getElementById('smsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function citizenConfirmSafe() {
  const conf = document.getElementById('phoneReplyConfirmation');
  if (conf) {
    conf.textContent = "✓ Status Confirmed: 'Safe at Shelter'. Relayed to District Emergency Center.";
    conf.className = "text-center text-xs font-semibold text-emerald-400 py-1";
    conf.classList.remove('hidden');
  }
}

function citizenRequestRescue() {
  const conf = document.getElementById('phoneReplyConfirmation');
  if (conf) {
    conf.textContent = "⚠️ SOS Transport Request Logged! GPS coordinates dispatched to SDRF rescue vehicle.";
    conf.className = "text-center text-xs font-semibold text-red-400 py-1";
    conf.classList.remove('hidden');
  }
}

function updatePhoneClock() {
  const clock = document.getElementById('phoneClock');
  if (!clock) return;
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  clock.textContent = `${hours}:${minutes} ${ampm}`;
}

// ==========================================
// PAGE 1: INDEX PAGE INITIALIZER
// ==========================================
function initIndexPage() {
  renderIndexBulletins();
  renderEmergencyContacts('emergencyContactsGrid');
}

function renderIndexBulletins() {
  const container = document.getElementById('recentBulletinsFeed');
  if (!container) return;

  container.innerHTML = broadcastMessages.slice(0, 3).map(msg => `
    <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-1 hover:border-slate-600 transition">
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-white flex items-center space-x-1.5">
          <span class="w-2 h-2 rounded-full ${msg.color === 'red' ? 'bg-red-500 animate-ping' : (msg.color === 'blue' ? 'bg-blue-400' : 'bg-amber-400')}"></span>
          <span>${msg.title}</span>
        </span>
        <span class="font-mono text-[10px] text-slate-400">${msg.time}</span>
      </div>
      <p class="text-[11px] text-slate-300 leading-relaxed">${msg.text}</p>
    </div>
  `).join('');
}

// ==========================================
// PAGE 2: ALERTS & NOTIFICATIONS PAGE
// ==========================================
function initAlertsPage() {
  renderAlertsBulletins('all');
  initSmsSignupForm();
}

function initSmsSignupForm() {
  const form = document.getElementById('smsSignupForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('subscriberPhone').value;
    const village = document.getElementById('subscriberVillage').value;
    const channel = document.getElementById('subscriberChannel').value;

    const successBox = document.getElementById('signupSuccessMsg');
    const successText = document.getElementById('signupSuccessText');
    
    if (successText) {
      successText.textContent = `+91 ${phone} subscribed for ${village} (${channel}). Priority emergency dispatch active!`;
    }
    if (successBox) successBox.classList.remove('hidden');

    setTimeout(() => {
      openSmsSimulator(`Welcome to LandGuard Alerts: +91 ${phone} registered for ${village}. You will receive priority cellular broadcasts if slope sensor thresholds exceed safe limits.`);
    }, 600);
  });
}

function renderAlertsBulletins(filterCategory = 'all') {
  const container = document.getElementById('alertsBulletinsFeed');
  if (!container) return;

  const filtered = filterCategory === 'all' 
    ? broadcastMessages 
    : broadcastMessages.filter(b => b.category.toLowerCase().includes(filterCategory.toLowerCase()));

  container.innerHTML = filtered.map(msg => `
    <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-700 space-y-2 hover:border-slate-600 transition">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <div class="flex items-center space-x-2">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${msg.color === 'red' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-800 text-slate-300'}">
            ${msg.category}
          </span>
          <span class="font-bold text-white text-sm">${msg.title}</span>
        </div>
        <span class="font-mono text-[11px] text-slate-400">${msg.time}</span>
      </div>
      <p class="text-xs text-slate-300 leading-relaxed">${msg.text}</p>
      <div class="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
        <span>Dispatched via: GSM Cell Broadcast #HP-401</span>
        <button onclick="openSmsSimulator('${msg.text.replace(/'/g, "\\'")}')" class="text-emerald-400 hover:underline flex items-center space-x-1">
          <span>Preview on Phone</span>
          <span>→</span>
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function filterAlerts(category, btnElement) {
  const buttons = document.querySelectorAll('.alert-filter-btn');
  buttons.forEach(b => {
    b.classList.remove('bg-emerald-500', 'text-slate-950');
    b.classList.add('bg-slate-800', 'text-slate-300');
  });
  btnElement.classList.remove('bg-slate-800', 'text-slate-300');
  btnElement.classList.add('bg-emerald-500', 'text-slate-950');
  renderAlertsBulletins(category);
}

function dispatchCustomBroadcast(e) {
  e.preventDefault();
  const title = document.getElementById('broadcastTitle').value;
  const category = document.getElementById('broadcastCategory').value;
  const text = document.getElementById('broadcastMessage').value;

  const newBroadcast = {
    id: `b-${Date.now()}`,
    category: category,
    time: "Just now",
    level: category === "Evacuation" ? "CRITICAL" : "ADVISORY",
    color: category === "Evacuation" ? "red" : "amber",
    title: title,
    text: text
  };

  broadcastMessages.unshift(newBroadcast);
  renderAlertsBulletins('all');

  // Trigger preview
  openSmsSimulator(`PRIORITY BROADCAST: ${title} - ${text}`);
  document.getElementById('broadcastComposerForm').reset();
}

// ==========================================
// PAGE 3: ADVANCED GEOHAZARD & TERRAIN GIS MAP
// ==========================================
let mapStationLayerGroup = null;
let mapShelterLayerGroup = null;
let mapHazardLayerGroup = null;
let mapRoutesLayerGroup = null;
let mapDebrisLayerGroup = null;
let mapSaturationLayerGroup = null;
let mapReportsLayerGroup = null;

let currentBasemapType = 'satellite';
let activeBasemapLayer = null;
let basemapLayers = {};

let activeRouteLine = null;
let userLocationMarker = null;
let isMeasuring = false;
let measurePoints = [];
let measureLine = null;

function initFullMapPage() {
  const mapElement = document.getElementById('fullLeafletMap');
  if (!mapElement) return;

  // Initialize Map Centered on Mountainous Terrain
  mapInstance = L.map('fullLeafletMap', {
    zoomControl: true,
    attributionControl: true
  }).setView([31.0980, 77.1720], 14);

  // Basemap Definitions
  basemapLayers = {
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19
    }),
    topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17
    }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }),
    voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
      maxZoom: 18
    })
  };

  // Set Default Basemap (Satellite)
  activeBasemapLayer = basemapLayers.satellite;
  activeBasemapLayer.addTo(mapInstance);
  highlightBasemapButton('satellite');

  // Initialize Analytical Layer Groups
  mapStationLayerGroup = L.layerGroup().addTo(mapInstance);
  mapShelterLayerGroup = L.layerGroup().addTo(mapInstance);
  mapHazardLayerGroup = L.layerGroup().addTo(mapInstance);
  mapRoutesLayerGroup = L.layerGroup().addTo(mapInstance);
  mapDebrisLayerGroup = L.layerGroup().addTo(mapInstance);
  mapSaturationLayerGroup = L.layerGroup().addTo(mapInstance);
  mapReportsLayerGroup = L.layerGroup().addTo(mapInstance);

  // Render All Advanced Layers
  renderAdvancedMapLayers();
  renderSheltersSideList();

  // Map Click Handler (for measurement tool and coordinate inspection)
  mapInstance.on('click', handleMapClick);
}

// Basemap Switcher
function switchBasemap(type) {
  if (!mapInstance || !basemapLayers[type]) return;
  if (activeBasemapLayer) {
    mapInstance.removeLayer(activeBasemapLayer);
  }
  activeBasemapLayer = basemapLayers[type];
  activeBasemapLayer.addTo(mapInstance);
  currentBasemapType = type;
  highlightBasemapButton(type);
}

function highlightBasemapButton(type) {
  const buttons = {
    satellite: document.getElementById('bmSatellite'),
    topo: document.getElementById('bmTopo'),
    dark: document.getElementById('bmDark'),
    voyager: document.getElementById('bmStreet')
  };
  Object.keys(buttons).forEach(key => {
    const btn = buttons[key];
    if (btn) {
      if (key === type) {
        btn.className = "px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold transition text-xs flex items-center space-x-1 shadow";
      } else {
        btn.className = "px-2.5 py-1 rounded-lg text-slate-300 hover:text-white font-medium transition text-xs flex items-center space-x-1";
      }
    }
  });
}

// Render Layers
function renderAdvancedMapLayers() {
  const createCustomMarker = (bgColor, iconSymbol, pulse = false) => {
    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="relative flex items-center justify-center">
          ${pulse ? '<span class="absolute -inset-2 rounded-full bg-red-500/60 sonar-ring pointer-events-none"></span>' : ''}
          <div style="background-color: ${bgColor}" class="w-8 h-8 rounded-full border-2 border-white shadow-2xl flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-125">
            ${iconSymbol}
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  // 1. Hazard Perimeters (Polygons)
  HAZARD_ZONES.forEach(zone => {
    const poly = L.polygon(zone.polygon, {
      color: zone.color,
      fillColor: zone.color,
      fillOpacity: 0.35,
      weight: 2.5,
      dashArray: '6, 6'
    }).addTo(mapHazardLayerGroup);

    poly.bindPopup(`
      <div class="p-3 bg-slate-900 text-white rounded-xl min-w-[220px] space-y-1.5">
        <div class="flex items-center space-x-1.5 font-bold text-xs text-red-400">
          <span>⚠️</span>
          <span>${zone.name}</span>
        </div>
        <p class="text-[11px] text-slate-300 leading-snug">${zone.description}</p>
        <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono pt-1 text-slate-300">
          <div>Slope: <strong class="text-white">${zone.slopeGradient || '38°'}</strong></div>
          <div>Saturation: <strong class="text-amber-400">${zone.soilSaturation || '76.4%'}</strong></div>
          <div>FoS Index: <strong class="text-red-400">${zone.failingFactor || '0.86'}</strong></div>
          <div>Hazard: <strong class="text-red-400">${zone.severity}</strong></div>
        </div>
      </div>
    `);
  });

  // 2. Telemetry Stations
  STATIONS_DATA.forEach(st => {
    const isWarning = st.riskTier === 'Warning';
    const color = isWarning ? '#ef4444' : (st.riskTier === 'Advisory' ? '#f59e0b' : '#3b82f6');
    const marker = L.marker(st.coordinates, {
      icon: createCustomMarker(color, '📡', isWarning)
    }).addTo(mapStationLayerGroup);

    marker.bindPopup(`
      <div class="p-3 bg-slate-900 text-white rounded-xl min-w-[240px] space-y-2">
        <div class="flex items-center justify-between border-b border-slate-700 pb-1.5">
          <span class="font-bold text-xs text-emerald-400">${st.name}</span>
          <span class="text-[9px] px-1.5 py-0.5 rounded font-bold ${isWarning ? 'bg-red-500/30 text-red-300' : 'bg-blue-500/30 text-blue-300'}">${st.riskTier}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
          <div>Soil Moisture: <strong class="text-white">${st.metrics.soilMoisture}%</strong></div>
          <div>Rain Rate: <strong class="text-white">${st.metrics.rainfall1h} mm/h</strong></div>
          <div>Slope Tilt: <strong class="text-white">${st.metrics.slopeTilt}°</strong></div>
          <div>Pore Pressure: <strong class="text-white">${st.metrics.porePressure} kPa</strong></div>
        </div>
        <a href="telemetry.html" class="block w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1.5 rounded-lg transition text-center">
          Open In Sensor Dashboard →
        </a>
      </div>
    `);

    // 3. Soil Saturation Rings (Isohyet heat circles)
    const satCircle = L.circle(st.coordinates, {
      radius: st.metrics.soilMoisture * 10,
      color: isWarning ? '#ef4444' : '#06b6d4',
      fillColor: isWarning ? '#ef4444' : '#06b6d4',
      fillOpacity: 0.18,
      weight: 1.5,
      dashArray: '3, 4'
    }).addTo(mapSaturationLayerGroup);

    satCircle.bindTooltip(`${st.name}: ${st.metrics.soilMoisture}% VWC Saturation Radius`, { permanent: false, direction: 'top' });
  });

  // 4. Safe Shelters
  SHELTERS_DATA.forEach(sh => {
    const marker = L.marker(sh.coordinates, {
      icon: createCustomMarker('#10b981', '⛺')
    }).addTo(mapShelterLayerGroup);

    marker.bindPopup(`
      <div class="p-3 bg-slate-900 text-white rounded-xl min-w-[250px] space-y-2">
        <div class="flex items-center justify-between border-b border-slate-700 pb-1.5">
          <span class="font-bold text-xs text-emerald-400">${sh.name}</span>
          <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">${sh.status}</span>
        </div>
        <div class="space-y-1 text-[11px] text-slate-300">
          <div>Capacity: <strong class="text-white">${sh.capacity}</strong> (${sh.currentOccupancy} occupied)</div>
          <div>Elevation: <strong class="text-white">${sh.elevation}</strong></div>
          <div>Warden: <strong class="text-white">${sh.contactPerson}</strong> (<a href="tel:${sh.phone}" class="text-emerald-400 underline">${sh.phone}</a>)</div>
          <div class="pt-1 text-[10px] text-slate-400"><strong>Safe Route:</strong> ${sh.routeDirections}</div>
        </div>
        <button onclick="plotRouteToShelter('${sh.id}')" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1.5 rounded-lg transition text-center flex items-center justify-center space-x-1">
          <span>Trace Evacuation Route Here</span>
          <span>→</span>
        </button>
      </div>
    `);
  });

  // 5. Evacuation Corridors (Animated Vector Lines)
  if (typeof EVACUATION_ROUTES !== 'undefined') {
    EVACUATION_ROUTES.forEach(route => {
      const polyline = L.polyline(route.path, {
        color: route.color || '#10b981',
        weight: 4.5,
        opacity: 0.85,
        className: 'route-flow-line'
      }).addTo(mapRoutesLayerGroup);

      polyline.bindPopup(`
        <div class="p-2.5 bg-slate-900 text-white rounded-xl text-xs space-y-1">
          <strong class="text-emerald-400">${route.name}</strong>
          <div>Distance: <strong>${route.distanceKm} km</strong> (~${route.estimatedWalkMins} mins walk)</div>
          <div>Safety Profile: <span class="text-emerald-300">${route.safetyRating}</span></div>
        </div>
      `);
    });
  }

  // 6. Debris Flow Trajectory Gullies
  if (typeof DEBRIS_FLOW_PATHS !== 'undefined') {
    DEBRIS_FLOW_PATHS.forEach(debris => {
      const polyline = L.polyline(debris.path, {
        color: '#f97316',
        weight: 3.5,
        opacity: 0.8,
        dashArray: '5, 8',
        className: 'debris-flow-line'
      }).addTo(mapDebrisLayerGroup);

      polyline.bindPopup(`
        <div class="p-2.5 bg-slate-900 text-white rounded-xl text-xs space-y-1">
          <strong class="text-orange-400">⚠️ ${debris.name}</strong>
          <div>Gradient: <strong>${debris.gradient}</strong></div>
          <div>Predicted Torrent Velocity: <strong class="text-red-400">${debris.predictedVelocity}</strong></div>
          <p class="text-[10px] text-slate-400">Do not cross this drainage channel during active rainfall.</p>
        </div>
      `);
    });
  }

  // 7. Citizen Field Observations
  const reportsData = (typeof getStoredReports === 'function') ? getStoredReports() : (typeof INITIAL_CITIZEN_REPORTS !== 'undefined' ? INITIAL_CITIZEN_REPORTS : []);
  reportsData.forEach(rep => {
    if (rep.coordinates) {
      const marker = L.marker(rep.coordinates, {
        icon: createCustomMarker('#818cf8', '📷')
      }).addTo(mapReportsLayerGroup);

      marker.bindPopup(`
        <div class="p-2.5 bg-slate-900 text-white rounded-xl text-xs space-y-1 min-w-[200px]">
          <div class="flex justify-between">
            <strong class="text-indigo-400">${rep.hazardType}</strong>
            <span class="text-[9px] bg-indigo-500/20 text-indigo-300 px-1 rounded">${rep.severity}</span>
          </div>
          <p class="text-[11px] text-slate-300">${rep.description}</p>
          <div class="text-[10px] text-slate-400">Reported by ${rep.reporterName} • ${rep.upvotes || 1} Confirmations</div>
        </div>
      `);
    }
  });
}

// Layer Toggle Function
function toggleMapLayer(layerType, isChecked) {
  if (!mapInstance) return;
  const groups = {
    hazards: mapHazardLayerGroup,
    shelters: mapShelterLayerGroup,
    stations: mapStationLayerGroup,
    routes: mapRoutesLayerGroup,
    debris: mapDebrisLayerGroup,
    saturation: mapSaturationLayerGroup,
    reports: mapReportsLayerGroup
  };

  const targetGroup = groups[layerType];
  if (targetGroup) {
    if (isChecked) mapInstance.addLayer(targetGroup);
    else mapInstance.removeLayer(targetGroup);
  }
}

// "Find Nearest Safe Shelter" Tool
function findNearestShelterGPS() {
  const defaultUserLat = 31.1030;
  const defaultUserLng = 77.1730;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => plotNearestShelter(pos.coords.latitude, pos.coords.longitude),
      () => plotNearestShelter(defaultUserLat, defaultUserLng)
    );
  } else {
    plotNearestShelter(defaultUserLat, defaultUserLng);
  }
}

function plotNearestShelter(userLat, userLng) {
  if (!mapInstance) return;

  // Clear previous user marker & active route line
  if (userLocationMarker) mapInstance.removeLayer(userLocationMarker);
  if (activeRouteLine) mapInstance.removeLayer(activeRouteLine);

  // Add User Location Pin
  const userIcon = L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <span class="absolute -inset-3 rounded-full bg-blue-500/50 animate-ping"></span>
        <div class="w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-2xl flex items-center justify-center text-white text-xs font-black">
          📍
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  userLocationMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(mapInstance);
  userLocationMarker.bindPopup('<strong class="text-blue-400">Your Current Location</strong><br>Calculating safe walking route to closest high-plateau shelter...').openPopup();

  // Find Nearest Shelter by Haversine Distance
  let closestShelter = null;
  let minDistance = Infinity;

  SHELTERS_DATA.forEach(sh => {
    const dist = calculateHaversineDistance(userLat, userLng, sh.coordinates[0], sh.coordinates[1]);
    if (dist < minDistance) {
      minDistance = dist;
      closestShelter = sh;
    }
  });

  if (closestShelter) {
    // Draw Dynamic Safe Corridor Line
    const routeCoords = [
      [userLat, userLng],
      [(userLat + closestShelter.coordinates[0]) / 2 + 0.001, (userLng + closestShelter.coordinates[1]) / 2 - 0.001],
      closestShelter.coordinates
    ];

    activeRouteLine = L.polyline(routeCoords, {
      color: '#10b981',
      weight: 5,
      opacity: 0.9,
      className: 'route-flow-line'
    }).addTo(mapInstance);

    // Fit map bounds to view both
    mapInstance.fitBounds(L.latLngBounds([userLat, userLng], closestShelter.coordinates), { padding: [60, 60] });

    // Update Routing Assistant HUD
    const distKm = minDistance.toFixed(2);
    const walkMins = Math.round(minDistance * 14);

    const distBadge = document.getElementById('routeDistanceBadge');
    if (distBadge) distBadge.textContent = `${distKm} km (~${walkMins} mins walk)`;

    const contentBox = document.getElementById('routeAssistantContent');
    if (contentBox) {
      contentBox.innerHTML = `
        <div class="space-y-2">
          <div class="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-1.5 text-xs">
            <div class="text-white font-bold text-sm flex items-center justify-between">
              <span class="text-emerald-400">Destination: ${closestShelter.name}</span>
              <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">${closestShelter.status}</span>
            </div>
            <div class="text-slate-300">Total Distance: <strong class="text-white">${distKm} km</strong> • Approx Walk Time: <strong class="text-white">${walkMins} mins</strong></div>
            <div class="text-slate-400">Elevation: <strong class="text-white">${closestShelter.elevation}</strong></div>
            <div class="text-[11px] text-emerald-300 pt-1 border-t border-slate-800">
              <strong>Safe Route Advice:</strong> ${closestShelter.routeDirections}
            </div>
          </div>
          <div class="flex items-center space-x-2 pt-1">
            <a href="tel:${closestShelter.phone}" class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-xs text-center flex items-center justify-center space-x-1">
              <i data-lucide="phone" class="w-3.5 h-3.5"></i>
              <span>Call Warden (${closestShelter.contactPerson})</span>
            </a>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

function plotRouteToShelter(shelterId) {
  const sh = SHELTERS_DATA.find(s => s.id === shelterId);
  if (!sh || !mapInstance) return;
  plotNearestShelter(31.1040, 77.1730);
}

// Haversine formula
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Measurement Tool
function toggleMeasurementTool() {
  isMeasuring = !isMeasuring;
  const btn = document.getElementById('btnMeasureTool');
  const btnText = document.getElementById('measureBtnText');
  const hud = document.getElementById('measureHud');
  const hudText = document.getElementById('measureHudText');

  if (isMeasuring) {
    measurePoints = [];
    if (measureLine && mapInstance) mapInstance.removeLayer(measureLine);
    btn.className = "bg-amber-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5";
    btnText.textContent = "Exit Measure Tool";
    hud.classList.remove('hidden');
    hudText.textContent = "Click point A on the terrain to start measuring...";
  } else {
    btn.className = "bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5";
    btnText.textContent = "Measure Distance";
    hud.classList.add('hidden');
    if (measureLine && mapInstance) mapInstance.removeLayer(measureLine);
  }
}

function handleMapClick(e) {
  if (!isMeasuring) return;
  measurePoints.push(e.latlng);

  const hudText = document.getElementById('measureHudText');
  if (measurePoints.length === 1) {
    hudText.textContent = `Point A set at [${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}]. Click Point B...`;
  } else if (measurePoints.length === 2) {
    const dist = calculateHaversineDistance(
      measurePoints[0].lat, measurePoints[0].lng,
      measurePoints[1].lat, measurePoints[1].lng
    );
    const distMeters = Math.round(dist * 1000);

    if (measureLine) mapInstance.removeLayer(measureLine);
    measureLine = L.polyline(measurePoints, {
      color: '#f59e0b',
      weight: 3,
      dashArray: '4, 6'
    }).addTo(mapInstance);

    hudText.innerHTML = `<strong>Distance: ${distMeters} m (${dist.toFixed(2)} km)</strong> • Approx Slope Drop: ~24°`;
    measurePoints = []; // reset for next measurement
  }
}

// 24-Hour Storm Scrubber
function handleMapTimeScrubber(sliderVal) {
  const hourIdx = parseInt(sliderVal);
  const timeLabels = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "Peak Now"];
  const moistureValues = [42, 43, 45, 48, 52, 58, 64, 69, 71, 73, 75, 76.4, 76.4];

  const timeLabel = timeLabels[hourIdx] || "Peak Now";
  const moistureVal = moistureValues[hourIdx] || 76.4;

  document.getElementById('mapScrubberTime').textContent = timeLabel;
  document.getElementById('mapScrubberSaturation').textContent = `${moistureVal}%`;

  // Dynamically update saturation rings on map
  if (mapSaturationLayerGroup) {
    mapSaturationLayerGroup.eachLayer(layer => {
      if (layer instanceof L.Circle) {
        layer.setRadius(moistureVal * 10);
        layer.setStyle({
          fillOpacity: 0.15 + (moistureVal / 100 * 0.25),
          color: moistureVal >= 75 ? '#ef4444' : (moistureVal >= 65 ? '#f59e0b' : '#06b6d4'),
          fillColor: moistureVal >= 75 ? '#ef4444' : (moistureVal >= 65 ? '#f59e0b' : '#06b6d4')
        });
      }
    });
  }
}

// Map Controls: Reset Center & Fullscreen
function resetMapCenter() {
  if (!mapInstance) return;
  mapInstance.flyTo([31.0980, 77.1720], 14, { animate: true, duration: 1.2 });
}

let isMapFullscreen = false;
function toggleMapFullscreen() {
  const container = document.getElementById('mapCardContainer');
  const mapElement = document.getElementById('fullLeafletMap');
  if (!container || !mapElement) return;

  isMapFullscreen = !isMapFullscreen;
  if (isMapFullscreen) {
    container.classList.add('map-fullscreen-active');
    mapElement.style.height = "100vh";
  } else {
    container.classList.remove('map-fullscreen-active');
    mapElement.style.height = "620px";
  }
  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize();
  }, 200);
}

function focusOnShelter(shelterId) {
  const sh = SHELTERS_DATA.find(s => s.id === shelterId);
  if (!sh || !mapInstance) return;
  mapInstance.flyTo(sh.coordinates, 16, { animate: true, duration: 1.2 });
}

function renderSheltersSideList() {
  const container = document.getElementById('mapSheltersList');
  if (!container) return;

  container.innerHTML = SHELTERS_DATA.map(sh => `
    <div onclick="focusOnShelter('${sh.id}')" class="p-3 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-emerald-500/60 cursor-pointer transition space-y-1.5">
      <div class="flex items-start justify-between">
        <h4 class="text-xs font-bold text-white leading-tight">${sh.name}</h4>
        <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-semibold">${sh.status}</span>
      </div>
      <div class="text-[11px] text-slate-400 flex items-center justify-between">
        <span>Capacity: <strong class="text-white">${sh.capacity}</strong></span>
        <span>Elevation: <strong class="text-white">${sh.elevation}</strong></span>
      </div>
      <p class="text-[10px] text-slate-400 leading-snug">
        <strong class="text-emerald-400">Route:</strong> ${sh.routeDirections}
      </p>
    </div>
  `).join('');
}

// ==========================================
// PAGE 4: TELEMETRY & SENSOR ANALYTICS
// ==========================================
function initTelemetryPage() {
  updateTelemetryStationView(activeStationId);
  initTelemetryCharts();
}

function changeTelemetryStation(stationId) {
  activeStationId = stationId;
  updateTelemetryStationView(stationId);
  updateTelemetryCharts();
}

function updateTelemetryStationView(stationId) {
  const st = STATIONS_DATA.find(s => s.id === stationId);
  if (!st) return;

  const { metrics } = st;

  document.getElementById('telMoistureVal').textContent = metrics.soilMoisture.toFixed(1);
  document.getElementById('telMoistureBar').style.width = `${metrics.soilMoisture}%`;
  document.getElementById('telMoistureShallow').textContent = `${metrics.soilMoistureShallow}%`;
  document.getElementById('telMoistureDeep').textContent = `${metrics.soilMoistureDeep}%`;

  document.getElementById('telRain1hVal').textContent = metrics.rainfall1h.toFixed(1);
  document.getElementById('telRain24hVal').textContent = `${metrics.rainfall24h.toFixed(1)} mm`;

  document.getElementById('telTiltVal').textContent = metrics.slopeTilt.toFixed(2);
  document.getElementById('telDisplacementVal').textContent = `+${metrics.displacementMm} mm`;

  document.getElementById('telPorePressureVal').textContent = metrics.porePressure.toFixed(1);
  document.getElementById('telEnvVal').textContent = `${metrics.temperature}°C / ${metrics.humidity}%`;

  // Simulation sliders
  const rainSlider = document.getElementById('telSimRainSlider');
  const moistureSlider = document.getElementById('telSimMoistureSlider');
  if (rainSlider) rainSlider.value = Math.round(metrics.rainfall1h);
  if (moistureSlider) moistureSlider.value = Math.round(metrics.soilMoisture);

  handleTelemetrySimulation(false);
}

function initTelemetryCharts() {
  const canvas = document.getElementById('deepTelemetryChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  telemetryChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: HISTORICAL_SERIES.hours,
      datasets: [
        {
          label: 'Shallow 0.5m Moisture (%)',
          data: HISTORICAL_SERIES.shallowMoisture,
          borderColor: '#f59e0b',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.35
        },
        {
          label: 'Core 1.2m Moisture (%)',
          data: HISTORICAL_SERIES.soilMoisture,
          borderColor: '#eab308',
          borderWidth: 2.5,
          pointRadius: 3,
          tension: 0.35
        },
        {
          label: 'Deep 2.5m Moisture (%)',
          data: HISTORICAL_SERIES.deepMoisture,
          borderColor: '#10b981',
          borderWidth: 1.5,
          pointRadius: 2,
          tension: 0.35
        },
        {
          label: 'Rainfall (mm/h)',
          data: HISTORICAL_SERIES.rainfall1h,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          borderWidth: 2,
          pointRadius: 3,
          yAxisID: 'yRain',
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: '#334155',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: '#1e293b' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          min: 20,
          max: 100,
          grid: { color: '#1e293b' },
          ticks: {
            color: '#f59e0b',
            callback: (v) => `${v}%`
          }
        },
        yRain: {
          position: 'right',
          min: 0,
          max: 60,
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#3b82f6',
            callback: (v) => `${v} mm`
          }
        }
      }
    }
  });
}

function updateTelemetryCharts() {
  if (telemetryChartInstance) {
    telemetryChartInstance.update();
  }
}

function handleTelemetrySimulation(updateChart = true) {
  const rain = parseFloat(document.getElementById('telSimRainSlider').value);
  const moisture = parseFloat(document.getElementById('telSimMoistureSlider').value);

  document.getElementById('telSimRainVal').textContent = `${rain.toFixed(1)} mm/h`;
  document.getElementById('telSimMoistureVal').textContent = `${moisture.toFixed(1)}% VWC`;

  let score = Math.min(100, Math.round((moisture * 0.6) + (rain * 0.7)));
  let fos = (1.6 - (moisture / 100 * 0.8) - (rain / 90 * 0.3)).toFixed(2);
  if (fos < 0.75) fos = "0.74 (Liquefaction Imminent)";

  const badge = document.getElementById('telSimBadge');
  const fosEl = document.getElementById('telSimFos');
  const summary = document.getElementById('telSimSummary');

  if (fosEl) fosEl.textContent = `Factor of Safety (FoS) = ${fos}`;

  let statusName = "NORMAL";
  let statusColor = "emerald";

  if (score >= 82) {
    statusName = "CRITICAL EVACUATE";
    statusColor = "red";
    if (badge) badge.className = "px-3 py-1 rounded text-xs font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/50";
    if (summary) summary.textContent = "Shear failure threshold breached. Soil liquefaction and debris torrent active!";
  } else if (score >= 65) {
    statusName = "WARNING";
    statusColor = "orange";
    if (badge) badge.className = "px-3 py-1 rounded text-xs font-bold uppercase bg-orange-500/20 text-orange-300 border border-orange-500/50";
    if (summary) summary.textContent = "Active soil creep and tension cracks developing along escarpment.";
  } else if (score >= 40) {
    statusName = "ADVISORY";
    statusColor = "amber";
    if (badge) badge.className = "px-3 py-1 rounded text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40";
    if (summary) summary.textContent = "High pore water pressure. Topsoil saturated on steep gradient.";
  } else {
    statusName = "NORMAL";
    statusColor = "emerald";
    if (badge) badge.className = "px-3 py-1 rounded text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
    if (summary) summary.textContent = "Geological equilibrium stable. Surface drainage margin optimal.";
  }

  if (badge) badge.textContent = statusName;

  // Update Top Banner
  const bannerBadge = document.getElementById('bannerRiskBadge');
  const bannerText = document.getElementById('bannerText');
  const banner = document.getElementById('emergencyBanner');
  if (bannerBadge) bannerBadge.textContent = statusName;
  if (bannerText) {
    bannerText.textContent = `Simulation: Precipitation at ${rain} mm/h and soil moisture at ${moisture}%. Risk level: ${statusName}.`;
  }
  if (banner) {
    banner.className = statusColor === 'red'
      ? "bg-red-600 text-white px-4 py-2 text-xs md:text-sm font-semibold flex items-center justify-between shadow-md transition-colors duration-500"
      : (statusColor === 'emerald'
          ? "bg-emerald-600 text-white px-4 py-2 text-xs md:text-sm font-semibold flex items-center justify-between shadow-md transition-colors duration-500"
          : "bg-amber-500 text-slate-950 px-4 py-2 text-xs md:text-sm font-semibold flex items-center justify-between shadow-md transition-colors duration-500");
  }

  // Update card meters
  const moistureVal = document.getElementById('telMoistureVal');
  const moistureBar = document.getElementById('telMoistureBar');
  const rainVal = document.getElementById('telRain1hVal');
  if (moistureVal) moistureVal.textContent = moisture.toFixed(1);
  if (moistureBar) moistureBar.style.width = `${moisture}%`;
  if (rainVal) rainVal.textContent = rain.toFixed(1);

  if (updateChart && telemetryChartInstance) {
    const len = HISTORICAL_SERIES.soilMoisture.length;
    HISTORICAL_SERIES.soilMoisture[len - 1] = moisture;
    HISTORICAL_SERIES.rainfall1h[len - 1] = rain;
    telemetryChartInstance.update('none');
  }
}

function exportTelemetryCsv() {
  const station = STATIONS_DATA.find(s => s.id === activeStationId) || STATIONS_DATA[0];
  let csvContent = "data:text/csv;charset=utf-8,Timestamp,Station,SoilMoisture_Percent,Rainfall_mm_h,SlopeTilt_deg,PorePressure_kPa\n";
  
  HISTORICAL_SERIES.hours.forEach((h, i) => {
    csvContent += `Today ${h},${station.name},${HISTORICAL_SERIES.soilMoisture[i]},${HISTORICAL_SERIES.rainfall1h[i]},${HISTORICAL_SERIES.tiltDegrees[i]},${HISTORICAL_SERIES.porePressure[i]}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `landguard_telemetry_${activeStationId}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// PAGE 5: COMMUNITY PREPAREDNESS & CHECKLIST
// ==========================================
function initCommunityPage() {
  initCommunityChecklist();
  renderEmergencyContacts('communityContactsGrid');
}

function initCommunityChecklist() {
  const container = document.getElementById('communityChecklistItems');
  if (!container) return;

  let saved = null;
  try {
    const raw = localStorage.getItem('landguard_checklist');
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }

  const checklistData = saved || DEFAULT_CHECKLIST;

  container.innerHTML = checklistData.map(item => `
    <label class="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:bg-slate-900 cursor-pointer transition select-none">
      <input 
        type="checkbox" 
        id="${item.id}" 
        ${item.checked ? 'checked' : ''} 
        onchange="toggleCommunityChecklistItem('${item.id}')"
        class="checklist-checkbox w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 focus:ring-offset-slate-900 bg-slate-800 border-slate-600 cursor-pointer"
      />
      <span class="text-xs sm:text-sm text-slate-200 transition-colors">${item.label}</span>
    </label>
  `).join('');

  updateCommunityChecklistBadge(checklistData);
}

function toggleCommunityChecklistItem(id) {
  const checkboxes = document.querySelectorAll('.checklist-checkbox');
  const items = [];
  checkboxes.forEach(cb => {
    const labelSpan = cb.parentElement.querySelector('span');
    items.push({
      id: cb.id,
      label: labelSpan ? labelSpan.textContent : '',
      checked: cb.checked
    });
  });

  try {
    localStorage.setItem('landguard_checklist', JSON.stringify(items));
  } catch (e) {
    console.warn(e);
  }

  updateCommunityChecklistBadge(items);
}

function updateCommunityChecklistBadge(items) {
  const badge = document.getElementById('communityProgressBadge');
  const progressBar = document.getElementById('communityProgressBar');
  if (!badge) return;

  const count = items.filter(i => i.checked).length;
  const total = items.length;
  const pct = Math.round((count / total) * 100);

  badge.textContent = `${count} of ${total} Items Ready (${pct}%)`;
  if (progressBar) progressBar.style.width = `${pct}%`;

  if (count === total) {
    badge.className = "text-xs font-mono font-bold bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full";
  } else {
    badge.className = "text-xs font-mono font-bold bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full";
  }
}

// ==========================================
// PAGE 6: CITIZEN HAZARD REPORTING
// ==========================================
function initReportsPage() {
  loadAndRenderCitizenReports();
  initReportForm();
}

function getStoredReports() {
  let stored = null;
  try {
    const raw = localStorage.getItem('landguard_citizen_reports');
    if (raw) stored = JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return stored || INITIAL_CITIZEN_REPORTS;
}

function loadAndRenderCitizenReports(filter = 'all') {
  const container = document.getElementById('citizenReportsList');
  if (!container) return;

  const reports = getStoredReports();
  const filtered = filter === 'all' 
    ? reports 
    : reports.filter(r => r.status.toLowerCase().includes(filter.toLowerCase()) || r.severity.toLowerCase().includes(filter.toLowerCase()));

  container.innerHTML = filtered.map(r => `
    <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-3 hover:border-slate-600 transition shadow">
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold text-white">${r.hazardType}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.severity === 'High' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
              ${r.severity} Severity
            </span>
          </div>
          <p class="text-xs text-emerald-400 font-medium mt-0.5 flex items-center space-x-1">
            <i data-lucide="map-pin" class="w-3 h-3"></i>
            <span>${r.location}</span>
          </p>
        </div>
        <span class="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
          ${r.status}
        </span>
      </div>

      <p class="text-xs text-slate-300 leading-relaxed">${r.description}</p>

      <div class="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-400">
        <span class="text-[11px]">Reported by: <strong>${r.reporterName}</strong> • ${r.timestamp}</span>
        <button onclick="upvoteReport('${r.id}')" class="flex items-center space-x-1 text-slate-300 hover:text-emerald-400 bg-slate-800 px-2 py-1 rounded border border-slate-700 transition">
          <i data-lucide="thumbs-up" class="w-3.5 h-3.5"></i>
          <span id="upvote-${r.id}">${r.upvotes || 1} Confirmations</span>
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function initReportForm() {
  const form = document.getElementById('citizenReportForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('repName').value;
    const location = document.getElementById('repLocation').value;
    const hazardType = document.getElementById('repHazardType').value;
    const severity = document.getElementById('repSeverity').value;
    const desc = document.getElementById('repDesc').value;

    const newReport = {
      id: `rep-${Date.now()}`,
      reporterName: name,
      location: location,
      hazardType: hazardType,
      severity: severity,
      timestamp: "Just now",
      description: desc,
      status: "Pending Field Verification",
      coordinates: [31.1000, 77.1700],
      upvotes: 1
    };

    const current = getStoredReports();
    current.unshift(newReport);

    try {
      localStorage.setItem('landguard_citizen_reports', JSON.stringify(current));
    } catch (err) {
      console.warn(err);
    }

    form.reset();
    const successMsg = document.getElementById('reportSubmittedSuccess');
    if (successMsg) successMsg.classList.remove('hidden');

    loadAndRenderCitizenReports();
  });
}

function autoDetectLocation() {
  const locInput = document.getElementById('repLocation');
  if (locInput) {
    locInput.value = "GPS: 31.1022° N, 77.1748° E (North Ridge Upper Contour)";
  }
}

function upvoteReport(reportId) {
  const current = getStoredReports();
  const target = current.find(r => r.id === reportId);
  if (target) {
    target.upvotes = (target.upvotes || 1) + 1;
    try {
      localStorage.setItem('landguard_citizen_reports', JSON.stringify(current));
    } catch (e) {}
    const span = document.getElementById(`upvote-${reportId}`);
    if (span) span.textContent = `${target.upvotes} Confirmations`;
  }
}

// ==========================================
// SHARED EMERGENCY CONTACTS RENDERER
// ==========================================
function renderEmergencyContacts(containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  grid.innerHTML = EMERGENCY_CONTACTS.map(c => `
    <div class="bg-slate-900/90 rounded-2xl border border-red-900/30 p-4 space-y-2 hover:border-red-500/50 transition shadow">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold uppercase tracking-wider text-red-400">${c.type}</span>
        <span class="text-xs font-mono font-black text-white bg-red-950/80 px-2 py-0.5 rounded border border-red-800/80">#${c.number}</span>
      </div>
      <h4 class="text-xs font-bold text-white leading-tight">${c.role}</h4>
      <div class="pt-2 flex items-center justify-between">
        <span class="text-[11px] font-mono text-slate-400">${c.direct}</span>
        <a href="tel:${c.direct}" class="inline-flex items-center space-x-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-md shadow-red-950/40">
          <i data-lucide="phone" class="w-3.5 h-3.5"></i>
          <span>Dial</span>
        </a>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}
