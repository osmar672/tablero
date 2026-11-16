# Instalación de PolicyBot con la base de datos `tablero` (Windows)

Este proyecto utiliza **MySQL 8.4 y tablas prefijadas `pb_`**. No elimina ni cambia tablas de otro proyecto en `tablero`.

## Paso 1. Crea tu configuración privada

Desde PowerShell, en la carpeta que contiene `package.json` y `docker-compose.yml`:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Si ya tienes `backend/.env` de la versión anterior, **NO lo borres**. Copia sus valores a la nueva versión y comprueba que `MYSQL_DATABASE=tablero`. Si las claves estaban dentro de un ZIP compartido públicamente, rótalas.

Genera JWT_SECRET:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Guarda el resultado en `JWT_SECRET`. Para Groq, coloca tu clave en `GROQ_API_KEY`.

### Opción A: MySQL instalado en Windows, Workbench, XAMPP, WAMP

Configura tu puerto REAL, normalmente **3306**:

```ini
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=TU_CONTRASENA_REAL
MYSQL_DATABASE=tablero
```

**No escribas literalmente `TU_CONTRASENA_REAL`.** Si tu servidor usa otro usuario, usa sus credenciales. Ver una base de datos en Workbench no implica que el servicio esté escuchando en 3307.

### Opción B: MySQL dentro de Docker

Abre Docker Desktop y, desde la raíz del proyecto:

```powershell
docker compose up -d db
docker compose ps
```

Configura `backend/.env` con:

```ini
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3307
MYSQL_USER=policybot
MYSQL_PASSWORD=policybot_local
MYSQL_DATABASE=tablero
```

**Nota sobre volúmenes Docker antiguos:** cambiar `MYSQL_DATABASE` en `docker-compose.yml` no cambia bases ya creadas dentro de un volumen. En ese caso, crea `tablero` y otorga permisos de forma manual usando el administrador de MySQL. **No ejecutes `docker compose down -v`**: eso borraría datos existentes.

## Paso 2. Diagnostica, migra y carga datos opcionales

Si prefieres ejecutar SQL manualmente, abre `database/WORKBENCH_TABLERO.sql` en MySQL Workbench. Usando `npm run db:migrate` no hace falta abrir ese archivo.

```powershell
npm install
npm run db:doctor
npm run db:dry-run
npm run db:migrate
npm run db:status
```

La primera migración es `database/migrations/001_init.sql`. Crea **siete tablas de negocio**: `pb_plans`, `pb_companies`, `pb_users`, `pb_documents`, `pb_chunks`, `pb_messages`, `pb_sync_runs`. La tabla `pb_schema_migrations` lleva el historial y la huella SHA-256. Las migraciones no se vuelven a ejecutar si ya constan como aplicadas. No se hace ningún DROP ni TRUNCATE.

Opcional, para las dos empresas ficticias de la práctica (ejecutar solo en entorno local de desarrollo):

```powershell
npm run db:seed
```

## Paso 3. Ejecuta el programa

```powershell
npm run dev
```

Abre http://127.0.0.1:5173. La API responde en http://127.0.0.1:4000/api/health.

## Google Drive

`GOOGLE_APPLICATION_CREDENTIALS` **NO** contiene el ID numérico de la cuenta de servicio, ni su identificador de clave. Contiene una **ruta al archivo JSON descargado** de Google Cloud:

```ini
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json
```

Guarda el JSON dentro de `backend/credentials/service-account.json`, habilita Google Drive API y comparte la carpeta de Drive con el `client_email` del JSON (permiso de lector). El ID de **la carpeta** se pega en la interfaz de PolicyBot. No publiques el JSON ni el `.env`.

## Errores frecuentes

| Mensaje | Causa habitual | Acción |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:3307` | Docker/MySQL no está escuchando en ese puerto | Inicia Docker o configura el puerto real 3306 |
| `ER_ACCESS_DENIED_ERROR` | Usuario o contraseña incorrectos | Actualiza `MYSQL_USER` y `MYSQL_PASSWORD` |
| `ER_BAD_DB_ERROR` | La base `tablero` no existe | Ejecución de migración con usuario que pueda crear bases, o crea `tablero` en Workbench |
| `Faltan las tablas de PolicyBot` | No se ejecutó la migración | `npm run db:migrate` |
| `Configura JWT_SECRET` | Variable vacía o demasiado corta | Genera un secreto de al menos 32 caracteres |
| `No existe el JSON de Google Drive` | Se escribió un ID en vez de ruta, o falta el archivo | Descarga el JSON y configura la ruta correcta |
| `GROQ_API_KEY` | Falta o no corresponde al proveedor | Configura la clave en `backend/.env` |

**Importante:** no hemos podido conectar este entorno a tu MySQL de Windows. El SQL está preparado, pero debes ejecutarlo en tu equipo para acreditar una migración real.

### Si usabas las tablas originales de otra versión de PolicyBot

Las tablas sin prefijo (`users`, `companies`, etc.) se mantienen intactas. La nueva versión no las utiliza. No se hace una copia automática de usuarios o documentos por seguridad y para evitar confundir datos de otras aplicaciones. Realiza un respaldo y revisa la migración de datos aparte si necesitas esos registros.
