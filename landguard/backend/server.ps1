# LandGuard Windows PowerShell Native Backend Server
# Runs out-of-the-box on Windows using .NET HttpListener

$Port = 8080
$WebRoot = (Get-Item "$PSScriptRoot\..").FullName
$Prefix = "http://localhost:$Port/"

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Prefix)
$Listener.Start()

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "🚀 LandGuard PowerShell Backend Live at $Prefix" -ForegroundColor Green
Write-Host "   Serving static files from: $WebRoot" -ForegroundColor Yellow
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "=================================================" -ForegroundColor Cyan

# Initial in-memory data
$Telemetry = @{
    stationId = "station-alpha"
    riskTier = "ADVISORY"
    metrics = @{
        soilMoisture = 76.4
        rainfall1h = 38.5
        rainfall24h = 124.0
        slopeTilt = 2.15
        porePressure = 42.8
    }
    factorOfSafety = 1.18
}

try {
    while ($Listener.IsListening) {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        $Path = $Request.Url.AbsolutePath
        $Method = $Request.HttpMethod

        # CORS Headers
        $Response.AddHeader("Access-Control-Allow-Origin", "*")
        $Response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $Response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

        if ($Method -eq "OPTIONS") {
            $Response.StatusCode = 204
            $Response.Close()
            continue
        }

        # REST API Routes
        if ($Path -eq "/api/health") {
            $Json = @{ status = "UP"; runtime = "PowerShell-.NET"; timestamp = (Get-Date).ToString("o") } | ConvertTo-Json
            $Buffer = [System.Text.Encoding]::UTF8.GetBytes($Json)
            $Response.ContentType = "application/json"
            $Response.OutputStream.Write($Buffer, 0, $Buffer.Length)
            $Response.Close()
            continue
        }

        if ($Path -eq "/api/telemetry" -and $Method -eq "GET") {
            $Json = $Telemetry | ConvertTo-Json -Depth 5
            $Buffer = [System.Text.Encoding]::UTF8.GetBytes($Json)
            $Response.ContentType = "application/json"
            $Response.OutputStream.Write($Buffer, 0, $Buffer.Length)
            $Response.Close()
            continue
        }

        # Static File Serving
        $RelativePath = if ($Path -eq "/" -or $Path -eq "") { "index.html" } else { $Path.TrimStart('/') }
        $FilePath = Join-Path $WebRoot $RelativePath

        if (Test-Path $FilePath -PathType Leaf) {
            $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
            if ($FilePath.EndsWith(".html")) { $Response.ContentType = "text/html; charset=utf-8" }
            elseif ($FilePath.EndsWith(".css")) { $Response.ContentType = "text/css" }
            elseif ($FilePath.EndsWith(".js")) { $Response.ContentType = "application/javascript" }
            elseif ($FilePath.EndsWith(".json")) { $Response.ContentType = "application/json" }
            else { $Response.ContentType = "application/octet-stream" }

            $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
            $Response.Close()
        } else {
            $Response.StatusCode = 404
            $Buffer = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 Not Found</h1>")
            $Response.OutputStream.Write($Buffer, 0, $Buffer.Length)
            $Response.Close()
        }
    }
} finally {
    $Listener.Stop()
}
