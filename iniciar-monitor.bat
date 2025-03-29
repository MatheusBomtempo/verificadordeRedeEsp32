
@echo off
echo Iniciando Monitor de ESP32 Multi-Dispositivos...

cd %~dp0
npm start

echo.
echo Se o monitor não iniciar, verifique se o Node.js está instalado.
echo Para instalar o Node.js: https://nodejs.org (versão LTS)
echo.
pause