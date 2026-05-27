@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
cd /d "%~dp0"
echo.
echo ════════════════════════════════════════
echo   Full Sync - جلب كل بيانات المابات
echo ════════════════════════════════════════
echo.
echo  المرحلة 1: كل المابات من Epic API
echo  المرحلة 2: إحصائيات كل ماب (CCU / plays / favorites)
echo  المرحلة 3: صور كل ماب
echo.
echo  قد يأخذ 30-60 دقيقة...
echo.
node scripts/full-sync.mjs
echo.
pause
