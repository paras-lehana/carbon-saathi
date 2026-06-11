# One-command Cloud Run deployment for Carbon Saathi (Windows PowerShell).
# Prerequisites: gcloud CLI authenticated (gcloud auth login) and a billing-enabled project.
# Usage: .\scripts\deploy.ps1 -ProjectId <gcp-project-id> [-Region asia-south1]
param(
  [Parameter(Mandatory = $true)] [string]$ProjectId,
  [string]$Region = 'asia-south1'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "==> Target project: $ProjectId ($Region)"
gcloud config set project $ProjectId | Out-Null

Write-Host '==> Enabling required services (idempotent)'
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

Write-Host '==> Ensuring Artifact Registry repo exists'
$repoExists = gcloud artifacts repositories list --location=$Region --format='value(name)' 2>$null | Select-String 'carbon-saathi'
if (-not $repoExists) {
  gcloud artifacts repositories create carbon-saathi --repository-format=docker --location=$Region --description='Carbon Saathi images'
}

Write-Host '==> Building + deploying API'
gcloud builds submit --config cloudbuild-api.yaml --substitutions=_REGION=$Region

# Security: the Gemini key travels straight from the local gitignored .env to
# the Cloud Run service environment — it never enters an image or the repo.
$envFile = Join-Path $repoRoot 'apps\api\.env'
if (Test-Path $envFile) {
  $geminiKey = (Select-String -Path $envFile -Pattern '^GEMINI_API_KEY=(.+)$').Matches | ForEach-Object { $_.Groups[1].Value.Trim() } | Select-Object -First 1
  $geminiModel = (Select-String -Path $envFile -Pattern '^GEMINI_MODEL=(.+)$').Matches | ForEach-Object { $_.Groups[1].Value.Trim() } | Select-Object -First 1
  if ($geminiKey) {
    Write-Host '==> Attaching Gemini key to the API service (live mode)'
    if (-not $geminiModel) { $geminiModel = 'gemini-2.5-flash' }
    gcloud run services update carbon-saathi-api --region=$Region --update-env-vars="GEMINI_API_KEY=$geminiKey,GEMINI_MODEL=$geminiModel"
  }
}

$apiUrl = gcloud run services describe carbon-saathi-api --region=$Region --format='value(status.url)'
Write-Host "==> API live at: $apiUrl"

Write-Host '==> Building + deploying web (proxying to the API)'
gcloud builds submit --config cloudbuild-web.yaml --substitutions=_REGION=$Region,_API_BASE_URL=$apiUrl

Write-Host '==> Allowing the web origin through API CORS'
$webUrl = gcloud run services describe carbon-saathi-web --region=$Region --format='value(status.url)'
gcloud run services update carbon-saathi-api --region=$Region --update-env-vars="ALLOWED_ORIGINS=$webUrl,http://localhost:3000"

Write-Host ''
Write-Host '================ DEPLOYED ================'
Write-Host "Web: $webUrl"
Write-Host "API: $apiUrl"
Write-Host "Smoke check: curl $apiUrl/api/health"
