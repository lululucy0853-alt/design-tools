@echo off
chcp 65001 >nul
setlocal
rem 把「文件夹」或「一堆图片」拖到本文件图标上即可批量裁透明边。
rem 结果默认另存到每张图同目录下的 _trimmed 子文件夹，不会覆盖原图。

set "SCRIPT=%~dp0trim_alpha.py"
set "PYEXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"

if exist "%PYEXE%" (
    "%PYEXE%" "%SCRIPT%" %*
    goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
    py "%SCRIPT%" %*
    goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
    python "%SCRIPT%" %*
    goto :eof
)
echo 找不到 Python。请先安装 Python，或让 Claude 帮你重装。
pause
