@echo off
rem PSD doctor - drag a .psd file onto this bat to get a lag report (read-only)
chcp 65001 >nul
if "%~1"=="" (
    echo Usage: drag a .psd file onto this bat file.
    echo.
    pause
    exit /b
)
python "%~dp0psd_doctor.py" %*
echo.
pause
