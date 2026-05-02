@echo off
title PharmaCare Server
color 0A
cls

echo ============================================
echo      PharmaCare Pharmacy System
echo      Server Starting...
echo ============================================
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js nahi mila!
    echo.
    echo Please pehle install karein:
    echo https://nodejs.org  (LTS version download karein)
    echo.
    pause
    exit /b 1
)

:: Check pnpm
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo pnpm install ho rahi hai...
    call npm install -g pnpm
)

:: Set working directory to project root
cd /d "%~dp0.."

:: Load .env.local if exists
if exist ".env.local" (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env.local") do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" set "%%a=%%b"
    )
) else (
    echo [WARN] .env.local nahi mila, defaults use ho rahe hain
    set DATABASE_URL=postgresql://pharmauser:pharma123@localhost:5432/pharmacare
    set JWT_SECRET=pharmacare_jwt_secret_pk_2026_stable
    set NODE_ENV=production
)

set PORT=8080
set FRONTEND_PORT=8081

echo [OK] Configuration loaded
echo.

:: Build API if dist not exists
if not exist "artifacts\api-server\dist\index.mjs" (
    echo [1/4] API Server build ho raha hai (pehli baar)...
    cd artifacts\api-server
    call pnpm run build
    cd /d "%~dp0.."
    echo [OK] API Build complete
) else (
    echo [1/4] API Server already built - skipping
)
echo.

:: Build Frontend if dist not exists
if not exist "artifacts\pharmacy\dist\index.html" (
    echo [2/4] Frontend build ho raha hai (pehli baar)...
    cd artifacts\pharmacy
    call pnpm run build
    cd /d "%~dp0.."
    echo [OK] Frontend Build complete
) else (
    echo [2/4] Frontend already built - skipping
)
echo.

:: Start API Server
echo [3/4] API Server start ho raha hai (port 8080)...
start "PharmaCare API" /min cmd /c "cd /d %~dp0.. && set PORT=8080 && set DATABASE_URL=%DATABASE_URL% && set JWT_SECRET=%JWT_SECRET% && set NODE_ENV=production && node --enable-source-maps artifacts\api-server\dist\index.mjs"
timeout /t 3 >nul
echo [OK] API Server running
echo.

:: Start Frontend Server
echo [4/4] Frontend server start ho raha hai (port 8081)...
start "PharmaCare Web" /min cmd /c "cd /d %~dp0..\\artifacts\\pharmacy && set PORT=8081 && pnpm run serve"
timeout /t 4 >nul
echo [OK] Frontend running
echo.

:: Get LAN IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" ^| findstr /v "127.0.0.1"') do (
    set RAW_IP=%%a
    goto :got_ip
)
:got_ip
set LOCAL_IP=%RAW_IP: =%

echo ============================================
echo.
echo   PharmaCare chal raha hai!
echo.
echo   Is PC (server) par:
echo   http://localhost:8081
echo.
echo   Dosre PCs (counters) par browser mein:
echo   http://%LOCAL_IP%:8081
echo.
echo   Admin: admin / admin123
echo.
echo ============================================
echo.
echo   Server band karne ke liye:
echo   Task Manager mein "node.exe" band karein
echo   ya yeh window band karein
echo ============================================
echo.

:: Open browser on this PC
timeout /t 2 >nul
start http://localhost:8081

echo Server chal raha hai. Is window ko minimize kar sakte hain.
echo.
pause
