@echo off
setlocal
cd /d "%~dp0.."
echo Starting JATcam Bridge...
node bridge\server.mjs
pause
