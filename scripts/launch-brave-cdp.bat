@echo off
REM ------------------------------
REM launch-brave-cdp.bat
REM Launch Brave with remote debugging (CDP) on port 9223 using your profile
REM ------------------------------

REM Change these if needed
set "BRAVE_EXE=C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
set "USER_DATA=C:\Users\sayantan\AppData\Local\BraveSoftware\Brave-Browser\User Data"
set "PORT=9223"
set "URL="

REM If you want Brave to open a page immediately, set URL to it, e.g.
REM set "URL=https://testbook.com/TS-ssc-cgl/tests/67bc4fc03687b6d67f4c7d44/analysis?attemptNo=1"

echo Stopping any running Brave processes...
taskkill /IM brave.exe /F >nul 2>&1

REM short pause so processes finish closing
timeout /t 1 /nobreak >nul

echo Launching Brave with remote debugging on port %PORT% ...
start "" "%BRAVE_EXE%" --remote-debugging-port=%PORT% --user-data-dir="%USER_DATA%" %URL%

echo Brave launched. CDP should be available at http://localhost:%PORT%
exit /b 0
