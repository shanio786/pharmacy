@echo off
title PharmaCare - Backup
color 0A
cls

echo ============================================
echo   PharmaCare - Data Backup
echo ============================================
echo.

cd /d "%~dp0.."

:: Create backups folder
if not exist "backups" mkdir backups

:: Get current date/time for filename
set DATETIME=%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%
set DATETIME=%DATETIME: =0%
set BACKUPFILE=backups\pharmacare_backup_%DATETIME%.sql

echo Backup ho raha hai: %BACKUPFILE%
echo [PostgreSQL password poochega - "pharma123" daalo]
echo.

pg_dump -U pharmauser -h localhost pharmacare > "%BACKUPFILE%"

if exist "%BACKUPFILE%" (
    echo.
    echo [OK] Backup mukammal: %BACKUPFILE%
) else (
    color 0C
    echo [ERROR] Backup fail hua!
)
echo.
pause
