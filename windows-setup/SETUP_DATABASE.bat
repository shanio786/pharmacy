@echo off
title PharmaCare - Database Setup
color 0A
cls

echo ============================================
echo   PharmaCare - Database Setup (Pehli baar)
echo ============================================
echo.
echo Yeh script sirf EK BAAR chalani hai.
echo.

:: Check PostgreSQL
psql --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] PostgreSQL nahi mila!
    echo.
    echo Pehle PostgreSQL install karein:
    echo https://www.postgresql.org/download/windows/
    echo.
    echo Install karte waqt:
    echo  - Password: pharma123  (yaad rakhein)
    echo  - Port: 5432 (default)
    echo.
    pause
    exit /b 1
)

echo PostgreSQL mila. Database setup ho raha hai...
echo.
echo [PostgreSQL ka password poochega - "pharma123" daalo]
echo.

:: Create user and database
psql -U postgres -c "CREATE USER pharmauser WITH PASSWORD 'pharma123';" 2>nul
psql -U postgres -c "CREATE DATABASE pharmacare OWNER pharmauser;" 2>nul
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE pharmacare TO pharmauser;" 2>nul

echo.
echo [OK] Database aur user bana diye.
echo.

:: Create .env.local
cd /d "%~dp0.."
echo DATABASE_URL=postgresql://pharmauser:pharma123@localhost:5432/pharmacare > .env.local
echo PORT=8080 >> .env.local
echo FRONTEND_PORT=8081 >> .env.local
echo JWT_SECRET=pharmacare_jwt_secret_pk_2026_stable >> .env.local
echo NODE_ENV=production >> .env.local

echo [OK] .env.local file bana di.
echo.

:: Install dependencies
echo Dependencies install ho rahi hain (internet chahiye pehli baar)...
cd /d "%~dp0.."
call pnpm install
echo.

:: Run migrations
echo Database tables ban rahe hain...
cd lib/db
call npx drizzle-kit push 2>nul || echo [WARN] Migration manually run karein
cd /d "%~dp0.."
echo.

:: Seed initial data
echo Admin user aur default data ban raha hai...
cd artifacts/api-server
call pnpm run seed 2>nul
cd /d "%~dp0.."
echo.

:: Build frontend
echo Frontend build ho raha hai...
cd artifacts/pharmacy
call pnpm run build
cd /d "%~dp0.."
echo.

echo ============================================
echo   Setup mukammal!
echo.
echo   Ab START_SERVER.bat chalayein
echo.
echo   Login credentials:
echo   Username: admin
echo   Password: admin123
echo ============================================
echo.
pause
