@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo Instala Node.js 22.16 o superior.&pause&exit /b 1)
where docker >nul 2>&1 || (echo Instala Docker Desktop y abrelo.&pause&exit /b 1)
if not exist "backend\.env" (
  copy "backend\.env.example" "backend\.env" >nul
  echo Archivo backend\.env creado. Edita JWT_SECRET y GROQ_API_KEY antes de continuar.
  notepad "backend\.env"
)
echo Iniciando MySQL...
docker compose up -d db || (pause&exit /b 1)
echo Instalando dependencias...
call npm install || (pause&exit /b 1)
echo Ejecutando migraciones...
call npm run db:migrate || (pause&exit /b 1)
echo Iniciando React y API...
call npm run dev
pause
