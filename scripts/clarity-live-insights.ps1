param(
  [Parameter(Mandatory = $true)]
  [string]$Token,
  [int]$Days = 1
)

$ErrorActionPreference = "Stop"

if ($Days -lt 1) {
  throw "Days parametresi 1 veya daha buyuk olmali."
}

$headers = @{
  Authorization = "Bearer $Token"
  "Content-Type" = "application/json"
}

$uri = "https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=$Days&dimension1=URL"
$response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get

function Print-Section {
  param(
    [string]$MetricName
  )

  $rows = ($response | Where-Object metricName -eq $MetricName).information
  if (-not $rows) { return }

  Write-Host "=== $MetricName (PROD URL) ==="
  $rows |
    Where-Object { $_.URL -like "https://nisankoltukyikama.com*" -or $_.Url -like "https://nisankoltukyikama.com*" } |
    Sort-Object { if ($_.PSObject.Properties.Name -contains "subTotal") { [int]$_.subTotal } elseif ($_.PSObject.Properties.Name -contains "totalSessionCount") { [int]$_.totalSessionCount } else { 0 } } -Descending |
    Select-Object -First 10 |
    ConvertTo-Json -Depth 3
}

Print-Section -MetricName "Traffic"
Print-Section -MetricName "DeadClickCount"
Print-Section -MetricName "RageClickCount"
Print-Section -MetricName "QuickbackClick"
Print-Section -MetricName "EngagementTime"
Print-Section -MetricName "ScrollDepth"
