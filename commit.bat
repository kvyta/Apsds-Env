@echo off
setlocal
cd /d "%~dp0"

rem Usage: commit.bat            (message = "Update <date time>")
rem        commit.bat my message (message = "my message")

where git >nul 2>&1 || (echo Git is not installed or not on PATH. & pause & exit /b 1)

rem Rebuild the exercise menu
where python >nul 2>&1 && python tools\build_manifest.py || (where py >nul 2>&1 && py tools\build_manifest.py || echo Warning: Python not found, manifest not rebuilt.)

if not exist ".git" (
  echo This folder is not a git repo yet. Run once:
  echo   git init ^&^& git branch -M main ^&^& git remote add origin https://github.com/kvyta/Apsds-Env.git
  pause
  exit /b 1
)

set "MSG=%*"
if "%MSG%"=="" set "MSG=Update %date% %time:~0,8%"

git add -A
git diff --cached --quiet && (echo Nothing to commit. & pause & exit /b 0)

git commit -m "%MSG%" || (pause & exit /b 1)
git push || (echo Push failed. If this is the first push, run: git push -u origin main & pause & exit /b 1)

echo.
echo Done: "%MSG%"
pause
