@echo off
chcp 65001 > nul
echo ========================================================
echo   Configuración y subida de Lista de la Compra a GitHub
echo ========================================================
echo.

set DEFAULT_USER=alexnoguera
set /p GITHUB_USER="Introduce tu usuario de GitHub [%DEFAULT_USER%]: "
if "%GITHUB_USER%"=="" set GITHUB_USER=%DEFAULT_USER%

set REPO_NAME=lista-compra

echo.
echo 1. Inicializando repositorio Git local...
git init
git add .
git commit -m "Initial commit: Lista de la compra compartida privada"

echo.
echo 2. Configurando rama principal (main)...
git branch -M main

echo.
echo 3. Vinculando con https://github.com/%GITHUB_USER%/%REPO_NAME%.git ...
git remote remove origin 2>nul
git remote add origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git

echo.
echo 4. Subiendo a GitHub...
echo (Si te pide credenciales, introduce tu usuario y token o inicia sesión en el navegador)
git push -u origin main

echo.
echo ========================================================
echo   ¡Listo!
echo   Ahora ve a GitHub: Settings ^> Pages
echo   y selecciona la rama 'main' para activar tu web.
echo ========================================================
pause
