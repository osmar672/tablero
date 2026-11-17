# Arquitectura e invariantes de aislamiento

## Componentes

React/Vite → Express → MySQL 8.4. La API usa Groq para generación, una cuenta de servicio de Google para Drive y embeddings de hashing, Transformers local en CPU o Voyage. Solo el backend ve credenciales de terceros.

- `auth`: cookie HTTP-only `SameSite=Lax`, firma JWT, expiración 8h y versión de sesión contrastada con MySQL. Cada request obtiene `company_id` del usuario; no acepta empresas aportadas por el cliente. Recuperar contraseña incrementa la versión e invalida sesiones anteriores.
- `access`/`mail`: enlaces con tokens aleatorios, hash, propósito, caducidad y consumo transaccional; SMTP envía invitaciones/recuperación. La cuenta invitada se crea al confirmar, no al emitir el enlace.
- `documents`: documentos con FK a `companies`. Extracción PDF/DOCX/texto y OCR opcional de PNG/JPEG/PDF mediante procesos limitados. Los chunks conservan página cuando se conoce, contenido y embedding JSON.
- `rag`: `rankChunks(companyId, pregunta)` consulta chunks y documentos con filtro de empresa para ambas tablas, luego calcula similitud coseno. El prompt incluye únicamente los más relevantes.
- `conversations`/`chat`: temas privados por usuario y empresa; reserva de cuota bajo bloqueo de empresa y una respuesta activa por tema. Contexto de hasta seis respuestas propias, fuentes actuales como evidencia, SSE y almacenamiento de respuesta/tokens/citas. Búsqueda y exportación siempre verifican al propietario, incluso dentro de la misma empresa.
- `backup`: snapshot consistente, AES-256-GCM y retención por cron UTC. Solo CLI/servidor; nunca entrega datos de todas las empresas a un administrador de organización. La restauración exige otro esquema vacío y revoca sesiones/enlaces anteriores.
- `drive`: carpeta por empresa, validación `folderId`, lectura `drive.readonly`, detección de modificaciones, trabajo manual o cron. No permite escribir en la cuenta Google del usuario.

## Modelo SQL

`plans` 1:N `companies` 1:N `users` / `documents` / `messages` / `sync_runs`. `documents` 1:N `chunks`. `chunks` tiene FK **compuesta** (`document_id`, `company_id`) a `documents` para impedir referencias cruzadas. `messages` tiene FK compuesta (`user_id`, `company_id`) a `users`.

`users` 1:N `conversations`; la FK (`conversation_id`, `company_id`, `user_id`) de `messages` exige que cada mensaje pertenezca al propietario del tema. `auth_tokens` tiene FK de empresa y, cuando corresponde, FK compuesta de usuario. Son nueve tablas de aplicación más el registro `schema_migrations`. El historial anterior se migra sin mezclar usuarios.

## Seguridad

- Las rutas `/api/users`, `/api/drive`, `/api/integrations` y la carga/borrado de documentos requieren rol `admin`.
- MySQL usa parámetros preparados, validación Zod, bcrypt y límites de subida.
- Aislamiento de inquilino en SQL y en cada repositorio de acceso a datos.
- Prompts restringidos a contexto; documentos se marcan como datos no confiables. Este control reduce, pero no elimina completamente, el riesgo de inyección de prompt.
- No se guarda el contenido del archivo original, únicamente el texto indexado y los vectores; los archivos Drive permanecen en Drive.
- Cookies HTTP-only reducen la exposición al JavaScript del navegador; se rechazan operaciones mutables con `Origin` externo.

## Para producción

Configurar HTTPS/APP_URL, rotación de secretos, SMTP, claves de proveedores, almacenamiento persistente y copia externa de respaldos. Quedan como ampliaciones la observabilidad central, colas distribuidas de indexación, análisis antivirus y pruebas de carga/seguridad de producción. Los bloqueos de OCR/Drive son por proceso y no sustituyen coordinación distribuida. MySQL JSON con similitud en Node y snapshots en memoria son apropiados para volúmenes reducidos; no para un volumen alto sin rediseño.
