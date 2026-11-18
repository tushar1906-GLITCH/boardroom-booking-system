@echo off
setlocal
if "%PGDATA_DIR%"=="" set "PGDATA_DIR=%USERPROFILE%\.gemini\antigravity\scratch\pgdata"
if "%PG_BIN%"=="" set "PG_BIN=C:\Program Files\PostgreSQL\18\bin\postgres.exe"
echo Starting PostgreSQL database on port 5433 using data dir: %PGDATA_DIR%
if exist "%PG_BIN%" (
  "%PG_BIN%" -D "%PGDATA_DIR%" -p 5433
) else (
  postgres -D "%PGDATA_DIR%" -p 5433
)
