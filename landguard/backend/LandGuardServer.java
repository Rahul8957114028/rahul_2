package backend;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * LandGuard Autonomous Geotechnical Backend Server & REST API
 * Zero-dependency, lightweight HTTP server powering landslide telemetry,
 * threshold evaluation, broadcast dispatching, and citizen hazard reports.
 */
public class LandGuardServer {

    private static final int PORT = 8080;
    private static final Path WEB_ROOT = findWebRoot();

    private static Path findWebRoot() {
        Path p = Paths.get(".").toAbsolutePath().normalize();
        if (Files.exists(p.resolve("index.html"))) return p;
        if (Files.exists(p.resolve("..").resolve("index.html"))) return p.resolve("..").normalize();
        return p;
    }

    // In-memory thread-safe state stores
    private static final List<String> citizenReports = new CopyOnWriteArrayList<>();
    private static final List<String> subscribers = new CopyOnWriteArrayList<>();
    private static final List<String> broadcastBulletins = new CopyOnWriteArrayList<>();
    
    // Station telemetry state
    private static double stationAlphaMoisture = 76.4;
    private static double stationAlphaRain1h = 38.5;
    private static double stationAlphaRain24h = 124.0;
    private static double stationAlphaTilt = 2.15;
    private static double stationAlphaPore = 42.8;
    private static String currentRiskTier = "ADVISORY";

    public static void main(String[] args) throws IOException {
        seedInitialData();

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        System.out.println("=================================================");
        System.out.println("🚀 LandGuard Geotechnical Backend Server Starting");
        System.out.println("   Port: " + PORT);
        System.out.println("   Web Root: " + WEB_ROOT);
        System.out.println("=================================================");

        // API Endpoints
        server.createContext("/api/health", new HealthHandler());
        server.createContext("/api/stations", new StationsHandler());
        server.createContext("/api/telemetry", new TelemetryHandler());
        server.createContext("/api/alerts", new AlertsHandler());
        server.createContext("/api/reports", new ReportsHandler());
        server.createContext("/api/shelters", new SheltersHandler());

        // Static File Serving
        server.createContext("/", new StaticFileHandler());

        server.setExecutor(null); // default executor
        server.start();

        System.out.println("✅ LandGuard Backend running live at: http://localhost:" + PORT + "/");
        System.out.println("   API Health: http://localhost:" + PORT + "/api/health");
        System.out.println("   Live Web App: http://localhost:" + PORT + "/index.html");
    }

    private static void seedInitialData() {
        // Initial Bulletins
        broadcastBulletins.add("{\"id\":\"b-1\",\"time\":\"10:45 AM\",\"category\":\"Evacuation\",\"level\":\"CRITICAL\",\"title\":\"North Ridge Escarpment: Ground Movement Advisory\",\"text\":\"Station Alpha inclinometer detected 2.15° slope displacement. TDR soil moisture is 76.4%. Families within 200m of Ridge Cut are advised to move to Govt School Shelter.\"}");
        broadcastBulletins.add("{\"id\":\"b-2\",\"time\":\"09:15 AM\",\"category\":\"Weather\",\"level\":\"WEATHER\",\"title\":\"IMD Orange Alert: Cloudburst Warning for Shimla Hills\",\"text\":\"Heavy precipitation in excess of 40mm/h predicted over next 4 hours. Flash surge risk high in mountain gullies.\"}");
        broadcastBulletins.add("{\"id\":\"b-3\",\"time\":\"07:30 AM\",\"category\":\"Shelter\",\"level\":\"INFO\",\"title\":\"Evacuation Shelters Activated\",\"text\":\"Higher Secondary School Auditorium and Civic Center West Wing have been opened with power backup and medical supplies.\"}");

        // Initial Citizen Reports
        citizenReports.add("{\"id\":\"rep-101\",\"reporterName\":\"Rajesh Thakur\",\"location\":\"North Ridge Road, km 4.2\",\"hazardType\":\"Ground Fissure\",\"severity\":\"High\",\"timestamp\":\"35 mins ago\",\"description\":\"3-inch wide tension crack running across asphalt towards hillside retaining wall.\",\"status\":\"Verified by SDRF\",\"upvotes\":14}");
        citizenReports.add("{\"id\":\"rep-102\",\"reporterName\":\"Sunita Verma\",\"location\":\"Pine Valley School Trail\",\"hazardType\":\"Muddy Spring Seepage\",\"severity\":\"Moderate\",\"timestamp\":\"2 hours ago\",\"description\":\"Previously clear spring is now running thick with orange mud and silt.\",\"status\":\"Inspection Scheduled\",\"upvotes\":8}");
        citizenReports.add("{\"id\":\"rep-103\",\"reporterName\":\"Anil Kumar (Forest Guard)\",\"location\":\"Upper Ridge Trailhead\",\"hazardType\":\"Tilted Pine Trees\",\"severity\":\"High\",\"timestamp\":\"4 hours ago\",\"description\":\"Cluster of 5 mature deodar cedar trees tilting downhill at 15 degrees.\",\"status\":\"Actioned - Path Closed\",\"upvotes\":22}");

        // Initial Subscriber
        subscribers.add("{\"phone\":\"9816012345\",\"village\":\"North Ridge\",\"channel\":\"SMS + WhatsApp\",\"registeredAt\":\"2026-09-04\"}");
    }

    // ==========================================
    // CORS & HTTP HELPER METHODS
    // ==========================================
    private static void setCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    }

    private static void sendJsonResponse(HttpExchange exchange, int statusCode, String jsonResponse) throws IOException {
        setCorsHeaders(exchange);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        byte[] bytes = jsonResponse.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String readRequestBody(HttpExchange exchange) throws IOException {
        InputStream is = exchange.getRequestBody();
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[1024];
        int nRead;
        while ((nRead = is.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }
        return buffer.toString(StandardCharsets.UTF_8);
    }

    // ==========================================
    // 1. HEALTHCHECK HANDLER
    // ==========================================
    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                setCorsHeaders(exchange);
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            String json = String.format(
                "{\"status\":\"UP\",\"service\":\"LandGuard-Backend-Engine\",\"version\":\"2.4.0\",\"runtime\":\"Java 26 SE\",\"riskTier\":\"%s\",\"timestamp\":\"%s\"}",
                currentRiskTier,
                LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            );
            sendJsonResponse(exchange, 200, json);
        }
    }

    // ==========================================
    // 2. STATIONS HANDLER
    // ==========================================
    static class StationsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                setCorsHeaders(exchange);
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            String json = "[" +
                "{\"id\":\"station-alpha\",\"name\":\"Station Alpha - North Ridge\",\"elevation\":\"1420m\",\"slopeAngle\":38,\"riskTier\":\"" + currentRiskTier + "\",\"lat\":31.1048,\"lng\":77.1734}," +
                "{\"id\":\"station-beta\",\"name\":\"Station Beta - Valley Pass\",\"elevation\":\"980m\",\"slopeAngle\":26,\"riskTier\":\"Advisory\",\"lat\":31.0965,\"lng\":77.1812}," +
                "{\"id\":\"station-gamma\",\"name\":\"Station Gamma - Creek Basin\",\"elevation\":\"740m\",\"slopeAngle\":18,\"riskTier\":\"Normal\",\"lat\":31.0880,\"lng\":77.1645}" +
                "]";
            sendJsonResponse(exchange, 200, json);
        }
    }

    // ==========================================
    // 3. TELEMETRY INGESTION & QUERY HANDLER
    // ==========================================
    static class TelemetryHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                setCorsHeaders(exchange);
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = readRequestBody(exchange);
                // Parse simple key-values or simulate update
                if (body.contains("soilMoisture")) {
                    try {
                        String[] parts = body.split("\"soilMoisture\":");
                        if (parts.length > 1) {
                            String val = parts[1].split("[,}]")[0].trim();
                            stationAlphaMoisture = Double.parseDouble(val);
                        }
                    } catch (Exception ignored) {}
                }
                if (body.contains("rainfall1h")) {
                    try {
                        String[] parts = body.split("\"rainfall1h\":");
                        if (parts.length > 1) {
                            String val = parts[1].split("[,}]")[0].trim();
                            stationAlphaRain1h = Double.parseDouble(val);
                        }
                    } catch (Exception ignored) {}
                }

                // Automated LandGuard Geotechnical Rule Engine Evaluation
                evaluateThresholds();

                String response = String.format(
                    "{\"status\":\"INGESTED\",\"stationId\":\"station-alpha\",\"evaluatedRiskTier\":\"%s\",\"soilMoisture\":%.1f,\"rainfall1h\":%.1f,\"factorOfSafety\":%.2f}",
                    currentRiskTier,
                    stationAlphaMoisture,
                    stationAlphaRain1h,
                    calculateFactorOfSafety(stationAlphaMoisture, stationAlphaRain1h)
                );
                sendJsonResponse(exchange, 200, response);
                return;
            }

            // GET Request
            double fos = calculateFactorOfSafety(stationAlphaMoisture, stationAlphaRain1h);
            String json = String.format(
                "{\"stationId\":\"station-alpha\",\"name\":\"North Ridge Station\",\"riskTier\":\"%s\"," +
                "\"metrics\":{\"soilMoisture\":%.1f,\"soilMoistureShallow\":%.1f,\"soilMoistureDeep\":%.1f," +
                "\"rainfall1h\":%.1f,\"rainfall24h\":%.1f,\"slopeTilt\":%.2f,\"displacementMm\":%.1f," +
                "\"porePressure\":%.1f,\"temperature\":16.2,\"humidity\":94}," +
                "\"factorOfSafety\":%.2f,\"historyHours\":[\"00:00\",\"04:00\",\"08:00\",\"12:00\",\"16:00\",\"20:00\",\"Now\"]," +
                "\"historyMoisture\":[42,48,58,69,73,%.1f,%.1f]," +
                "\"historyRain\":[2,8,22,32,36,%.1f,%.1f]}",
                currentRiskTier,
                stationAlphaMoisture,
                Math.min(98.0, stationAlphaMoisture + 5.7),
                Math.max(30.0, stationAlphaMoisture - 11.4),
                stationAlphaRain1h,
                stationAlphaRain24h,
                stationAlphaTilt,
                14.2,
                stationAlphaPore,
                fos,
                stationAlphaMoisture,
                stationAlphaMoisture,
                stationAlphaRain1h,
                stationAlphaRain1h
            );
            sendJsonResponse(exchange, 200, json);
        }
    }

    private static double calculateFactorOfSafety(double moisture, double rain) {
        double fos = 1.6 - (moisture / 100.0 * 0.8) - (rain / 90.0 * 0.3);
        return Math.max(0.74, Math.round(fos * 100.0) / 100.0);
    }

    private static void evaluateThresholds() {
        if (stationAlphaMoisture >= 85.0 || stationAlphaRain1h >= 50.0) {
            currentRiskTier = "CRITICAL EVACUATE";
        } else if (stationAlphaMoisture >= 75.0 || stationAlphaRain1h >= 30.0) {
            currentRiskTier = "WARNING";
        } else if (stationAlphaMoisture >= 65.0 || stationAlphaRain1h >= 15.0) {
            currentRiskTier = "ADVISORY";
        } else {
            currentRiskTier = "NORMAL";
        }
    }

    // ==========================================
    // 4. ALERTS & BROADCAST DISPATCHER HANDLER
    // ==========================================
    static class AlertsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                setCorsHeaders(exchange);
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String path = exchange.getRequestURI().getPath();

            // POST /api/alerts/subscribe
            if (path.endsWith("/subscribe") && "POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = readRequestBody(exchange);
                subscribers.add(body);
                sendJsonResponse(exchange, 201, "{\"status\":\"SUBSCRIBED\",\"message\":\"Mobile number registered for GSM cell broadcasts.\"}");
                return;
            }

            // POST /api/alerts/broadcast
            if (path.endsWith("/broadcast") && "POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = readRequestBody(exchange);
                broadcastBulletins.add(0, body); // prepend to top
                sendJsonResponse(exchange, 201, "{\"status\":\"DISPATCHED\",\"subscribersNotified\":" + Math.max(1, subscribers.size()) + "}");
                return;
            }

            // GET /api/alerts
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < broadcastBulletins.size(); i++) {
                sb.append(broadcastBulletins.get(i));
                if (i < broadcastBulletins.size() - 1) sb.append(",");
            }
            sb.append("]");
            sendJsonResponse(exchange, 200, sb.toString());
        }
    }

    // ==========================================
    // 5. CITIZEN HAZARD REPORTS HANDLER
    // ==========================================
    static class ReportsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                setCorsHeaders(exchange);
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = readRequestBody(exchange);
                String id = "rep-" + System.currentTimeMillis();
                // If it's an upvote/verification
                if (exchange.getRequestURI().getPath().contains("/verify")) {
                    sendJsonResponse(exchange, 200, "{\"status\":\"VERIFIED\",\"message\":\"Report confirmed by community member.\"}");
                    return;
                }

                // Add newly reported incident
                String jsonItem = body.trim();
                if (!jsonItem.contains("\"id\"")) {
                    jsonItem = jsonItem.substring(0, jsonItem.length() - 1) + ",\"id\":\"" + id + "\",\"timestamp\":\"Just now\",\"status\":\"Pending Field Verification\",\"upvotes\":1}";
                }
                citizenReports.add(0, jsonItem);
                sendJsonResponse(exchange, 201, "{\"status\":\"SUBMITTED\",\"id\":\"" + id + "\"}");
                return;
            }

            // GET Reports
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < citizenReports.size(); i++) {
                sb.append(citizenReports.get(i));
                if (i < citizenReports.size() - 1) sb.append(",");
            }
            sb.append("]");
            sendJsonResponse(exchange, 200, sb.toString());
        }
    }

    // ==========================================
    // 6. SHELTERS HANDLER
    // ==========================================
    static class SheltersHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                setCorsHeaders(exchange);
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            String json = "[" +
                "{\"id\":\"shelter-1\",\"name\":\"Govt Higher Secondary School Auditorium\",\"coordinates\":[31.0920,77.1700],\"capacity\":\"350 people\",\"currentOccupancy\":38,\"elevation\":\"820m\",\"phone\":\"+91 98160 12345\",\"status\":\"Open & Ready\",\"route\":\"Tara Devi Ridge Bypass\"}," +
                "{\"id\":\"shelter-2\",\"name\":\"Community Civic Center - West Wing\",\"coordinates\":[31.0845,77.1770],\"capacity\":\"500 people\",\"currentOccupancy\":0,\"elevation\":\"760m\",\"phone\":\"+91 98160 54321\",\"status\":\"Standby\",\"route\":\"Circular Road via West Ridge\"}," +
                "{\"id\":\"shelter-3\",\"name\":\"St. John Sports Complex Safe Pavilion\",\"coordinates\":[31.1080,77.1850],\"capacity\":\"250 people\",\"currentOccupancy\":12,\"elevation\":\"1100m\",\"phone\":\"+91 98160 98765\",\"status\":\"Open & Ready\",\"route\":\"Ridge North Bedrock corridor\"}" +
                "]";
            sendJsonResponse(exchange, 200, json);
        }
    }

    // ==========================================
    // 7. STATIC FILE SERVING HANDLER
    // ==========================================
    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String requestPath = exchange.getRequestURI().getPath();
            if (requestPath.equals("/") || requestPath.isEmpty()) {
                requestPath = "/index.html";
            }

            Path requestedFile = WEB_ROOT.resolve(requestPath.substring(1)).normalize();

            // Prevent path traversal
            if (!requestedFile.startsWith(WEB_ROOT) || !Files.exists(requestedFile) || Files.isDirectory(requestedFile)) {
                String notFound = "<h1>404 Not Found</h1><p>The requested file does not exist on LandGuard server.</p>";
                exchange.sendResponseHeaders(404, notFound.getBytes(StandardCharsets.UTF_8).length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(notFound.getBytes(StandardCharsets.UTF_8));
                }
                return;
            }

            String contentType = getContentType(requestedFile.toString());
            byte[] fileBytes = Files.readAllBytes(requestedFile);

            setCorsHeaders(exchange);
            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.sendResponseHeaders(200, fileBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(fileBytes);
            }
        }

        private String getContentType(String path) {
            if (path.endsWith(".html")) return "text/html; charset=UTF-8";
            if (path.endsWith(".css")) return "text/css; charset=UTF-8";
            if (path.endsWith(".js")) return "application/javascript; charset=UTF-8";
            if (path.endsWith(".json")) return "application/json; charset=UTF-8";
            if (path.endsWith(".png")) return "image/png";
            if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
            if (path.endsWith(".svg")) return "image/svg+xml";
            if (path.endsWith(".ico")) return "image/x-icon";
            return "text/plain; charset=UTF-8";
        }
    }
}
