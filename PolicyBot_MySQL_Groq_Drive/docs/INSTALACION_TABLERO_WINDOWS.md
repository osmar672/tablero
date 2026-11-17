# Instalación de PolicyBot en Windows

Requiere Node.js 22.16 o superior y MySQL 8.4. Con Docker, abre Docker Desktop antes de comenzar. Usa una base dedicada a esta aplicación: el esquema actual utiliza `plans`, `companies`, `users`, `documents`, `chunks`, `messages` y `sync_runs`, sin prefijo. No comparte tablas con otros productos.

## Configuración inicial

Desde la carpeta que contiene `package.json`:

```powershell
npm run setup:env
```

Crea `backend/.env` con JWT aleatorio. Si el archivo ya existe, conserva todos sus valores. No publiques este archivo ni las credenciales de Drive. Si compartiste claves por chat o en un archivo público, revócalas y usa otras nuevas.

La configuración inicial usa el servicio Docker del proyecto: puerto 3307, usuario `policybot`, base `policybot` y contraseña local de demostración del Compose. Ejecuta:

```powershell
docker compose up -d --wait db
npm ci
npm run db:doctor
npm run db:migrate
npm run dev
```

Abre `http://127.0.0.1:5173`. También puedes ejecutar `INICIAR_WINDOWS.bat`; usa los mismos comandos. La migración crea las tablas dentro de la base existente, pero no crea la base ni usuarios de MySQL.

## Usar una base llamada tablero

Si ya tienes un MySQL propio, configura en `backend/.env` el host, puerto, usuario de aplicación, contraseña y `MYSQL_DATABASE=tablero`. El administrador debe crear esa base dedicada y otorgar permisos al usuario antes de migrar. En instalaciones locales de MySQL el puerto suele ser 3306; el Compose de este proyecto publica 3307.

En el entorno en la nube se preparó `tablero` con un usuario limitado y contraseña aleatoria. Esas credenciales pertenecen a esa instancia y no se copian a Windows automáticamente.

Cambiar una variable del Compose no modifica un volumen MySQL ya creado. No borres el volumen para resolver un problema de configuración. Comprueba la base y los permisos con el administrador. `database/WORKBENCH_TABLERO.sql` contiene una alternativa manual del esquema actual; se recomienda el migrador de Node. Las tablas `pb_*` de versiones anteriores no son el esquema de esta versión y no se convierten automáticamente.

## Datos de demostración y comprobaciones

```powershell
npm run db:seed
npm test
npm run smoke
npm run check:api
npm run build
```

El seed crea dos empresas de desarrollo. Las cuentas están en el README. `smoke` y `check:api` necesitan la API iniciada y los datos demo; no validan Groq ni Drive. Para comprobar cuotas simultáneas con datos temporales, usa `npm run check:concurrency` únicamente en desarrollo.

## Integraciones opcionales

Para respuestas generadas, configura una clave nueva de Groq en los ajustes seguros del entorno o en el `.env` local privado. El modelo se elige con `GROQ_MODEL`. La biblioteca, los usuarios y los embeddings locales pueden probarse sin esas credenciales, pero las respuestas sobre fuentes requieren Groq.

`GOOGLE_APPLICATION_CREDENTIALS` debe apuntar al archivo JSON de una cuenta de servicio de Google, por ejemplo `./credentials/service-account.json` dentro del backend. Un identificador de clave no sustituye el archivo. Habilita Drive API y comparte la carpeta con el correo de la cuenta como lector. El ID de carpeta se configura en la interfaz.

Voyage es opcional. Al cambiar proveedor de embeddings, reindexa los documentos.

## Diagnóstico

- `ECONNREFUSED`: comprueba que MySQL esté iniciado y que el puerto coincida.
- `ER_ACCESS_DENIED_ERROR`: revisa usuario, contraseña y permisos.
- `ER_BAD_DB_ERROR`: el administrador debe crear la base antes de migrar.
- Configuración JWT inválida: ejecuta la generación inicial si todavía no tienes `.env`, o reemplaza el secreto local por uno aleatorio de al menos 32 caracteres.
- Archivo rechazado: revisa formato, tamaño, codificación UTF-8 y si el documento está dañado o protegido.

No se ha validado esta instalación en una máquina Windows durante la revisión en la nube. Los comandos de Node, las migraciones y MySQL sí se ejecutaron en Linux; el archivo BAT se revisó sin ejecutarlo.
