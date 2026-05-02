param(
    [string]$Email = "elvisedvais203@gmail.com",
    [string]$Phone = "+243895966288",
    [string]$Password = "Edvais@CongoLove2026!",
    [string]$DisplayName = "Edvais Makina",
    [string]$ApiUrl = "https://solola-api.onrender.com/api"
)

$ErrorActionPreference = "Stop"

Write-Host "Creating superadmin account via API..." -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl" -ForegroundColor Gray
Write-Host "Email: $Email" -ForegroundColor Gray
Write-Host "Phone: $Phone" -ForegroundColor Gray

# Test API connectivity
Write-Host "Testing API connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$ApiUrl" -Method GET -UseBasicParsing -TimeoutSec 10
    Write-Host "✓ API is accessible" -ForegroundColor Green
} catch {
    Write-Host "✗ ERROR: API is not accessible at $ApiUrl" -ForegroundColor Red
    Write-Host "Make sure the solola-api service is deployed and running in Render" -ForegroundColor Red
    exit 1
}

# Create the superadmin account
Write-Host "Creating superadmin account..." -ForegroundColor Yellow

$body = @{
    email = $Email
    password = $Password
    displayName = $DisplayName
    phone = $Phone
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/auth/email/register" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 30

    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
        Write-Host "✓ Superadmin account created successfully!" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Gray
        Write-Host $response.Content -ForegroundColor White
        Write-Host ""
        Write-Host "You can now login with:" -ForegroundColor Cyan
        Write-Host "Email: $Email" -ForegroundColor White
        Write-Host "Password: $Password" -ForegroundColor White
    } else {
        Write-Host "✗ Unexpected response status: $($response.StatusCode)" -ForegroundColor Red
        Write-Host "Response:" -ForegroundColor Gray
        Write-Host $response.Content -ForegroundColor White
    }
} catch {
    Write-Host "✗ ERROR: Failed to create superadmin account" -ForegroundColor Red
    Write-Host "Error details:" -ForegroundColor Gray
    Write-Host $_.Exception.Message -ForegroundColor White
    if ($_.Exception.Response) {
        Write-Host "Response content:" -ForegroundColor Gray
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseContent = $reader.ReadToEnd()
        Write-Host $responseContent -ForegroundColor White
    }
    exit 1
}

Write-Host ""
Write-Host "Script completed." -ForegroundColor Green