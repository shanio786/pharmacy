@echo off
title PharmaCare - Restore
color 0C
cls

echo ============================================
echo   PharmaCare - Data Restore
echo   KHABARDAR: Purana data delete ho jayega!
echo ============================================
echo.

set /p CONFIRM=Kya aap sure hain? (yes daalo): 
if /i not "%CONFIRM%"=="yes" (
    echo Restore cancel hua.
    pause
    exit /b 0
)

echo.
echo Backup files:
dir /b "%~dp0..\backups\*.sql" 2>nul
echo.
set /p BACKUPFILE=Backup file ka naam daalo (poora path): 

if not exist "%BACKUPFILE%" (
    echo [ERROR] File nahi mili: %BACKUPFILE%
    pause
    exit /b 1
)

echo.
echo Restore ho raha hai...
echo [PostgreSQL password poochega - "pharma123" daalo]
psql -U pharmauser -h localhost pharmacare < "%BACKUPFILE%"

echo.
echo [OK] Restore mukammal!
pause
