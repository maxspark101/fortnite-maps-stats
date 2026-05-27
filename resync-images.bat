@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ========================================
echo   Re-sync Empty Images
echo   Fix maps that have missing thumbnails
echo ========================================
echo.
node scripts/resync-empty-images.mjs
echo.
pause
