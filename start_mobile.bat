@echo off
set PATH=C:\node20\node-v20.19.0-win-x64;%PATH%
cd /d C:\dev\dla-mobile
"C:\node20\node-v20.19.0-win-x64\npx.cmd" expo start --web --port 8082 --clear --max-workers 1
