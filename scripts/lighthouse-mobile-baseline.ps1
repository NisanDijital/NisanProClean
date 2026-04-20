param(
  [string]$Url = "https://nisankoltukyikama.com/",
  [string]$OutDir = ".\reports",
  [string]$ApiKey = $env:PSI_API_KEY
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir | Out-Null
}

$encodedUrl = [uri]::EscapeDataString($Url)
$api = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$encodedUrl&strategy=mobile&category=performance"
if ($ApiKey) {
  $api = "$api&key=$ApiKey"
}

$resp = $null
$maxAttempts = 5
for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
  try {
    $resp = Invoke-RestMethod -Uri $api -Method Get
    break
  } catch {
    $isTooManyRequests = $_.Exception.Message -like "*(429)*"
    if ($attempt -lt $maxAttempts -and $isTooManyRequests) {
      Start-Sleep -Seconds (5 * $attempt)
      continue
    }
    if ($isTooManyRequests) {
      throw "PageSpeed API 429 (rate-limit). PSI_API_KEY tanimlayip tekrar deneyin: `$env:PSI_API_KEY='YOUR_KEY'"
    }
    throw
  }
}
$lhr = $resp.lighthouseResult
$audits = $lhr.audits

function MetricValue($id) {
  if ($audits.PSObject.Properties.Name -contains $id) {
    return $audits.$id.numericValue
  }
  return $null
}

function MetricDisplay($id) {
  if ($audits.PSObject.Properties.Name -contains $id) {
    return $audits.$id.displayValue
  }
  return ""
}

$score = [math]::Round(($lhr.categories.performance.score * 100), 0)
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$data = [ordered]@{
  checked_at_utc = $timestamp
  url = $Url
  strategy = "mobile"
  performance_score = $score
  metrics = [ordered]@{
    first_contentful_paint = [ordered]@{ numeric = MetricValue "first-contentful-paint"; display = MetricDisplay "first-contentful-paint" }
    largest_contentful_paint = [ordered]@{ numeric = MetricValue "largest-contentful-paint"; display = MetricDisplay "largest-contentful-paint" }
    speed_index = [ordered]@{ numeric = MetricValue "speed-index"; display = MetricDisplay "speed-index" }
    total_blocking_time = [ordered]@{ numeric = MetricValue "total-blocking-time"; display = MetricDisplay "total-blocking-time" }
    cumulative_layout_shift = [ordered]@{ numeric = MetricValue "cumulative-layout-shift"; display = MetricDisplay "cumulative-layout-shift" }
    interaction_to_next_paint = [ordered]@{ numeric = MetricValue "interaction-to-next-paint"; display = MetricDisplay "interaction-to-next-paint" }
  }
}

$jsonPath = Join-Path $OutDir "lighthouse-mobile-baseline.json"
$mdPath = Join-Path $OutDir "lighthouse-mobile-baseline.md"

$data | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = @()
$lines += "# Lighthouse Mobile Baseline"
$lines += ""
$lines += "- Date (UTC): $timestamp"
$lines += "- URL: $Url"
$lines += "- Performance score: $score"
$lines += ""
$lines += "## Core metrics"
$lines += ""
$lines += "- FCP: $($data.metrics.first_contentful_paint.display)"
$lines += "- LCP: $($data.metrics.largest_contentful_paint.display)"
$lines += "- Speed Index: $($data.metrics.speed_index.display)"
$lines += "- TBT: $($data.metrics.total_blocking_time.display)"
$lines += "- CLS: $($data.metrics.cumulative_layout_shift.display)"
$lines += "- INP: $($data.metrics.interaction_to_next_paint.display)"
$lines += ""
$lines += "Raw JSON: reports/lighthouse-mobile-baseline.json"

$lines -join "`n" | Set-Content -Path $mdPath -Encoding UTF8

Write-Output "JSON_REPORT=$jsonPath"
Write-Output "MARKDOWN_REPORT=$mdPath"
Write-Output "PERFORMANCE_SCORE=$score"
