# Arquitectura e invariantes de aislamiento

## Componentes

React/Vite → Express → MySQL 8.4. La API usa Groq para generación, una cuenta de servicio de Google para Drive y un adaptador de embeddings local o Voyage. Solo el backend ve credenciales de terceros.

- `auth`: cookie HTTP-only `SameSite=Lax`, firma JWT, expiración 8h. Cada request busca al usuario en MySQL y obtiene `company_id` de su fila; no usa campos de empresa aportados por el cliente.
- `documents`: documentos con FK a `companies`. Extractor PDF/DOCX/TXT y chunks con embedding JSON.
- `rag`: `rankChunks(companyId, pregunta)` consulta chunks y documentos con filtro de empresa para ambas tablas, luego calcula similitud coseno. El prompt incluye únicamente los más relevantes.
- `chat`: reserva pregunta bajo bloqueo de fila de empresa, verifica cuota, comienza SSE, reporta fuentes, almacena respuesta y tokens.
- `drive`: carpeta por empresa, validación `folderId`, lectura `drive.readonly`, detección de modificaciones, trabajo manual o cron. No permite escribir en la cuenta Google del usuario.

## Modelo SQL

`plans` 1:N `companies` 1:N `users` / `documents` / `messages` / `sync_runs`. `documents` 1:N `chunks`. `chunks` tiene FK **compuesta** (`document_id`, `company_id`) a `documents` para impedir referencias cruzadas. `messages` tiene FK compuesta (`user_id`, `company_id`) a `users`.

## Seguridad

- Las rutas `/api/users`, `/api/drive` y la carga/borrado de documentos requieren rol `admin`.
- MySQL usa parámetros preparados, validación Zod, bcrypt y límites de subida.
- Aislamiento de inquilino en SQL y en cada repositorio de acceso a datos.
- Prompts restringidos a contexto; documentos se marcan como datos no confiables. Este control reduce, pero no elimina completamente, el riesgo de inyección de prompt.
- No se guarda el contenido del archivo original, únicamente el texto indexado y los vectores; los archivos Drive permanecen en Drive.
- Cookies HTTP-only reducen la exposición al JavaScript del navegador; se rechazan operaciones mutables con `Origin` externo.

## Para producción

Agregar HTTPS, rotación de secretos, controles de administración de cuentas, observabilidad central, cola de indexación, limpieza de tareas fallidas, protección ante subida de archivos maliciosos, tasa de solicitudes de chat, recuperación de contraseña y pruebas de seguridad con base de datos real. MySQL JSON con similitud en Node es apropiado para la práctica, no para un volumen alto sin rediseño.
