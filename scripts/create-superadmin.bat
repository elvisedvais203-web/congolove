@echo off
echo Creating superadmin account via API...

REM Replace these with your actual values
set SUPERADMIN_EMAIL=elvisedvais203@gmail.com
set SUPERADMIN_PHONE=+243895966288
set SUPERADMIN_PASSWORD=Edvais@CongoLove2026!

REM API endpoint
set API_URL=https://solola-api.onrender.com/api

echo Testing API connectivity...
curl -s "%API_URL%" >nul 2>&1
if errorlevel 1 (
    echo ERROR: API is not accessible at %API_URL%
    echo Make sure the solola-api service is deployed and running in Render
    pause
    exit /b 1
)

echo API is accessible. Creating superadmin account...

REM Create the superadmin account
curl -X POST "%API_URL%/auth/email/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"%SUPERADMIN_EMAIL%\",\"password\":\"%SUPERADMIN_PASSWORD%\",\"displayName\":\"Edvais Makina\",\"phone\":\"%SUPERADMIN_PHONE%\"}" ^
  > response.json 2>nul

REM Check if the request was successful
if errorlevel 1 (
    echo ERROR: Failed to create superadmin account
    type response.json 2>nul
    pause
    exit /b 1
)

echo Superadmin account creation response:
type response.json

echo.
echo If successful, you can now login with:
echo Email: %SUPERADMIN_EMAIL%
echo Password: %SUPERADMIN_PASSWORD%
echo.

pause