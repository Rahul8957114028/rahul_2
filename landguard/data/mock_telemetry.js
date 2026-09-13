// LandGuard Mock Telemetry & Hazard Configuration Data

const STATIONS_DATA = [
  {
    id: "station-alpha",
    name: "Station Alpha - North Ridge",
    elevation: "1,420 m",
    coordinates: [31.1048, 77.1734],
    slopeAngle: 38,
    riskTier: "Warning",
    soilType: "Clay Loam over Fractured Sandstone",
    lastPing: "Just now",
    metrics: {
      soilMoisture: 76.4, // % VWC (average)
      soilMoistureShallow: 82.1, // 0.5m depth
      soilMoistureMid: 76.4,     // 1.2m depth
      soilMoistureDeep: 65.0,    // 2.5m depth
      rainfall1h: 38.5,   // mm/h
      rainfall24h: 124.0, // mm cumulative
      slopeTilt: 2.15,    // degrees displacement
      displacementMm: 14.2, // mm total creep
      porePressure: 42.8, // kPa
      temperature: 16.2,  // °C
      humidity: 94,       // %
      barometric: 1004.2  // hPa
    },
    thresholds: {
      moistureWarning: 70,
      moistureCritical: 85,
      rainWarning: 30,
      rainCritical: 50,
      tiltWarning: 1.5,
      tiltCritical: 3.0
    }
  },
  {
    id: "station-beta",
    name: "Station Beta - Valley Pass",
    elevation: "980 m",
    coordinates: [31.0965, 77.1812],
    slopeAngle: 26,
    riskTier: "Advisory",
    soilType: "Silty Gravel Deposit",
    lastPing: "1 min ago",
    metrics: {
      soilMoisture: 62.1,
      soilMoistureShallow: 68.4,
      soilMoistureMid: 62.1,
      soilMoistureDeep: 54.2,
      rainfall1h: 22.0,
      rainfall24h: 78.5,
      slopeTilt: 0.85,
      displacementMm: 4.8,
      porePressure: 28.4,
      temperature: 18.5,
      humidity: 88,
      barometric: 1008.5
    },
    thresholds: {
      moistureWarning: 68,
      moistureCritical: 82,
      rainWarning: 28,
      rainCritical: 48,
      tiltWarning: 1.2,
      tiltCritical: 2.5
    }
  },
  {
    id: "station-gamma",
    name: "Station Gamma - Creek Basin",
    elevation: "740 m",
    coordinates: [31.0880, 77.1645],
    slopeAngle: 18,
    riskTier: "Normal",
    soilType: "Alluvial Silty Sand",
    lastPing: "2 mins ago",
    metrics: {
      soilMoisture: 44.8,
      soilMoistureShallow: 49.0,
      soilMoistureMid: 44.8,
      soilMoistureDeep: 38.5,
      rainfall1h: 9.5,
      rainfall24h: 36.0,
      slopeTilt: 0.12,
      displacementMm: 0.6,
      porePressure: 15.1,
      temperature: 20.1,
      humidity: 81,
      barometric: 1012.0
    },
    thresholds: {
      moistureWarning: 72,
      moistureCritical: 86,
      rainWarning: 35,
      rainCritical: 55,
      tiltWarning: 1.8,
      tiltCritical: 3.2
    }
  }
];

const SHELTERS_DATA = [
  {
    id: "shelter-1",
    name: "Govt Higher Secondary School Auditorium",
    coordinates: [31.0920, 77.1700],
    capacity: "350 people",
    currentOccupancy: 38,
    elevation: "820 m (Flat Safe Plateau)",
    supplies: "Power Generator, Medical Station, Water Tanker (5000L), Blankets",
    contactPerson: "Dr. K. Sharma (Evacuation Coordinator)",
    phone: "+91 98160 12345",
    status: "Open & Ready",
    routeDirections: "From North Ridge, take bypass road via Tara Devi safe ridge (avoid valley road)."
  },
  {
    id: "shelter-2",
    name: "Community Civic Center - West Wing",
    coordinates: [31.0845, 77.1770],
    capacity: "500 people",
    currentOccupancy: 0,
    elevation: "760 m (Reinforced Concrete Structure)",
    supplies: "Community Kitchen, Emergency Radio, 40 Cots, First Aid Kits",
    contactPerson: "Capt. S. Negi (Shelter Warden)",
    phone: "+91 98160 54321",
    status: "Standby",
    routeDirections: "Access via Circular Road; high clearance vehicles recommended during monsoon."
  },
  {
    id: "shelter-3",
    name: "St. John Sports Complex Safe Pavilion",
    coordinates: [31.1080, 77.1850],
    capacity: "250 people",
    currentOccupancy: 12,
    elevation: "1,100 m (Bedrock Foundation)",
    supplies: "Emergency Lighting, Food Rations, High-Capacity Heaters",
    contactPerson: "Officer V. Rawat",
    phone: "+91 98160 98765",
    status: "Open & Ready",
    routeDirections: "Proceed via Ridge North corridor; clear of active drainage channels."
  }
];

const HAZARD_ZONES = [
  {
    id: "zone-a",
    name: "Zone A - North Ridge Escarpment",
    severity: "High",
    color: "#ef4444",
    polygon: [
      [31.1090, 77.1680],
      [31.1120, 77.1760],
      [31.1030, 77.1810],
      [31.1000, 77.1710]
    ],
    slopeGradient: "38° - 44°",
    soilSaturation: "76.4% VWC",
    failingFactor: "0.86 (Critical)",
    description: "Steep escarpment with high pore-pressure saturation. Active tension fissures detected along crown."
  },
  {
    id: "zone-b",
    name: "Zone B - Valley Pass Cut Slope",
    severity: "Moderate",
    color: "#f59e0b",
    polygon: [
      [31.1000, 77.1780],
      [31.1020, 77.1870],
      [31.0930, 77.1890],
      [31.0920, 77.1800]
    ],
    slopeGradient: "26° - 32°",
    soilSaturation: "62.1% VWC",
    failingFactor: "1.24 (Advisory)",
    description: "Engineered road cut. Soil creep and weeping weep-holes in stone masonry retaining wall."
  },
  {
    id: "zone-c",
    name: "Zone C - Creek Alluvial Fan",
    severity: "Low to Moderate",
    color: "#eab308",
    polygon: [
      [31.0850, 77.1620],
      [31.0910, 77.1670],
      [31.0880, 77.1740],
      [31.0820, 77.1690]
    ],
    slopeGradient: "14° - 20°",
    soilSaturation: "44.8% VWC",
    failingFactor: "1.52 (Normal)",
    description: "Downslope deposition basin. Susceptible to mud deposition if upper escarpment fails."
  }
];

// Advanced Evacuation Corridors
const EVACUATION_ROUTES = [
  {
    id: "route-1",
    name: "North Ridge Safe Crest Corridor -> School Shelter",
    distanceKm: 1.6,
    estimatedWalkMins: 22,
    safetyRating: "High (Bedrock Ridge)",
    color: "#10b981",
    path: [
      [31.1048, 77.1734],
      [31.1020, 77.1718],
      [31.0980, 77.1705],
      [31.0950, 77.1695],
      [31.0920, 77.1700]
    ]
  },
  {
    id: "route-2",
    name: "Valley Pass Bypass Corridor -> Civic Center",
    distanceKm: 1.4,
    estimatedWalkMins: 18,
    safetyRating: "Moderate (Clear of Gully)",
    color: "#059669",
    path: [
      [31.0965, 77.1812],
      [31.0925, 77.1820],
      [31.0880, 77.1800],
      [31.0845, 77.1770]
    ]
  },
  {
    id: "route-3",
    name: "East Crest Ridge -> St. John Pavilion",
    distanceKm: 0.9,
    estimatedWalkMins: 11,
    safetyRating: "Very High (Upper Plateau)",
    color: "#34d399",
    path: [
      [31.1030, 77.1800],
      [31.1055, 77.1825],
      [31.1080, 77.1850]
    ]
  }
];

// Active Debris Flow Trajectories (Gullies where mud/rock torrents flow)
const DEBRIS_FLOW_PATHS = [
  {
    id: "gully-1",
    name: "North Ravine Debris Torrent Path",
    gradient: "42° average drop",
    predictedVelocity: "14 - 18 m/s",
    path: [
      [31.1110, 77.1730],
      [31.1070, 77.1720],
      [31.1020, 77.1690],
      [31.0960, 77.1660],
      [31.0890, 77.1640]
    ]
  },
  {
    id: "gully-2",
    name: "Valley Pass Cut Drainage Runoff",
    gradient: "29° drop",
    predictedVelocity: "8 - 12 m/s",
    path: [
      [31.1015, 77.1825],
      [31.0980, 77.1840],
      [31.0940, 77.1855],
      [31.0900, 77.1865]
    ]
  }
];

// Elevation Transect Data (Cross-Section from North Ridge to Creek Basin)
const ELEVATION_TRANSECT = [
  { point: "Crown Ridge", distanceM: 0, elevationM: 1420, slope: 42 },
  { point: "Station Alpha Anchor", distanceM: 320, elevationM: 1290, slope: 38 },
  { point: "Mid-Slope Escarpment", distanceM: 650, elevationM: 1140, slope: 35 },
  { point: "Road Cut Bypass", distanceM: 980, elevationM: 990, slope: 28 },
  { point: "School Shelter Plateau", distanceM: 1420, elevationM: 820, slope: 6 },
  { point: "Creek Basin Bottom", distanceM: 1850, elevationM: 740, slope: 4 }
];

// Historical time-series for Station Alpha
const HISTORICAL_SERIES = {
  hours: ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "Now"],
  soilMoisture: [42, 43, 45, 48, 52, 58, 64, 69, 71, 73, 75, 76.4, 76.4],
  shallowMoisture: [45, 47, 50, 55, 62, 69, 74, 78, 80, 81, 82, 82.1, 82.1],
  deepMoisture: [38, 38, 39, 41, 44, 48, 52, 57, 60, 62, 64, 65.0, 65.0],
  rainfall1h: [2, 3, 5, 8, 14, 22, 28, 32, 35, 36, 38, 38.5, 38.5],
  porePressure: [15, 16, 17, 20, 24, 28, 33, 36, 38, 40, 41.5, 42.8, 42.8],
  tiltDegrees: [0.2, 0.2, 0.3, 0.4, 0.6, 0.9, 1.2, 1.5, 1.7, 1.9, 2.0, 2.15, 2.15]
};

const EMERGENCY_CONTACTS = [
  { role: "National Disaster Response Force (NDRF)", number: "1078", type: "Toll Free", direct: "+91 11-24363260" },
  { role: "State Disaster Emergency Ops (SDRF)", number: "1070", type: "24/7 Hotline", direct: "+91 177-2812344" },
  { role: "District Disaster Management Cell", number: "1077", type: "District Control", direct: "+91 177-2655888" },
  { role: "Emergency Ambulance Service", number: "108", type: "Medical", direct: "108" },
  { role: "Fire & Mountain Rescue", number: "101", type: "Rescue", direct: "101" },
  { role: "Local Police Helpline", number: "112", type: "Emergency", direct: "112" }
];

// Initial Citizen Hazard Reports
const INITIAL_CITIZEN_REPORTS = [
  {
    id: "rep-101",
    reporterName: "Rajesh Thakur",
    location: "North Ridge Road, km 4.2",
    hazardType: "Ground Fissure",
    severity: "High",
    timestamp: "35 mins ago",
    description: "Noticed 3-inch wide tension crack running across the asphalt and expanding toward hillside retaining wall.",
    status: "Verified by SDRF",
    coordinates: [31.1035, 77.1720],
    upvotes: 14
  },
  {
    id: "rep-102",
    reporterName: "Sunita Verma",
    location: "Pine Valley School Trail",
    hazardType: "Muddy Spring Seepage",
    severity: "Moderate",
    timestamp: "2 hours ago",
    description: "Previously crystal clear spring is now running thick with orange mud and silt. Roots appear exposed.",
    status: "Inspection Scheduled",
    coordinates: [31.0950, 77.1790],
    upvotes: 8
  },
  {
    id: "rep-103",
    reporterName: "Anil Kumar (Forest Guard)",
    location: "Upper Ridge Trailhead",
    hazardType: "Tilted Pine Trees",
    severity: "High",
    timestamp: "4 hours ago",
    description: "Cluster of 5 mature deodar cedar trees tilting downhill at roughly 15 degrees. Ground hummocky.",
    status: "Actioned - Path Closed",
    coordinates: [31.1070, 77.1750],
    upvotes: 22
  }
];
