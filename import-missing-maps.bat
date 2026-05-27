@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ========================================
echo   Import ALL Missing Maps
echo   Source: fortnite.gg (9,347 pages)
echo   ~186,000 maps total
echo ========================================
echo.
echo Phase 1: Scrape all fortnite.gg pages  (~47 min)
echo Phase 2: Find codes missing from DB
echo Phase 3: Import missing via Epic API   (~30-60 min)
echo.
echo Total estimated time: 1.5 - 2 hours
echo (If you run again, Phase 1 uses cache - much faster)
echo.
node scripts/import-from-fgg.mjs 9347
echo.
echo ========================================
echo   Next: run resync-images.bat
echo   to fetch images for the new maps
echo ========================================
echo.
pause
