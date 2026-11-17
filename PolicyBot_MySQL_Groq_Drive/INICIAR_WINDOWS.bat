@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo Instala Node.js 22.16 o superior.&pause&exit /b 1)
where docker >nul 2>&1 || (echo Instala Docker Desktop y abrelo.&pause&exit /b 1)
call npm run setup:env || (pause&exit /b 1)
echo Iniciando MySQL...
docker compose up -d --wait db || (pause&exit /b 1)
echo Instalando dependencias...
call npm ci || (pause&exit /b 1)
echo Ejecutando migraciones...
call npm run db:migrate || (pause&exit /b 1)
echo Iniciando React y API...
call npm run dev
pause
