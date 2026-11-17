# API REST (cookies de sesión)

Para desarrollo, base `/api` (frontend mediante proxy de Vite). Todas las rutas privadas usan cookie `policybot_session` HTTP-only.

| Verbo | Ruta | Rol | Resultado |
| --- | --- | --- | --- |
| GET | `/api/health` | público | Disponibilidad de API y MySQL |
| POST | `/api/auth/register` | público | Empresa + admin + sesión |
| POST | `/api/auth/login` | público | Iniciar sesión |
| POST | `/api/auth/logout` | público | Cerrar sesión |
| GET | `/api/auth/me` | autenticado | Perfil/empresa |
| POST | `/api/auth/forgot-password` | público | `{email}`; respuesta genérica si SMTP está configurado |
| POST | `/api/auth/token-info` | público | `{token,purpose}`; datos de un enlace válido (`reset`/`invite`) |
| POST | `/api/auth/set-password` | público | `{token,purpose,password}`; consume el enlace e invalida sesiones en recuperación |
| GET | `/api/users` | admin | Lista usuarios empresa |
| POST | `/api/users` | admin | Crear colaborador/admin |
| POST | `/api/users/invite` | admin | `{name,email,role}`; invitación por correo, sin contraseña inicial |
| GET | `/api/documents` | usuario | Listar documentos empresa |
| GET | `/api/documents/:id/preview?offset=0` | usuario | Texto indexado de la empresa, 5 fragmentos por página |
| POST | `/api/documents/upload` | admin | Multipart `file`; indexar |
| POST | `/api/documents/:id/reindex` | admin | Regenerar embeddings desde texto indexado |
| DELETE | `/api/documents/:id` | admin | Borrar documento y chunks |
| GET | `/api/drive` | admin | ID carpeta y última ejecución |
| PUT | `/api/drive` | admin | `{folderId}` |
| POST | `/api/drive/sync` | admin | Sincronizar en este momento |
| GET | `/api/chat/history` | usuario | Últimos 40 pares de mensajes propios |
| GET | `/api/chat/conversations?q=texto` | usuario | Hasta 100 conversaciones propias, búsqueda literal por título/contenido |
| POST | `/api/chat/conversations` | usuario | `{title?}`; crea un tema privado |
| PATCH | `/api/chat/conversations/:id` | usuario | `{title}`; renombra un tema propio |
| GET | `/api/chat/conversations/:id/messages` | usuario | Últimas 200 respuestas propias del tema, más recientes primero |
| GET | `/api/chat/conversations/:id/export` | usuario | Conversación, mensajes en orden cronológico y Markdown, hasta 1000 respuestas |
| POST | `/api/chat/stream` | usuario | `{question,conversationId?}` → SSE; contexto solo al enviar un tema propio |
| GET | `/api/usage` | usuario | Cuotas/tokens del mes |
| GET | `/api/integrations` | admin | Estado de configuración, modelo activo y modelos indexados de la empresa, sin secretos |
| POST | `/api/integrations/check` | admin | `{service}`: `groq`, `drive`, `mail` o `embeddings`; comprobación real |

## Ejemplo SSE

```text
data: {"type":"sources","sources":[{"id":1,"name":"politica.pdf","documentId":"...","page":2,"chunkIndex":4,"excerpt":"Texto exacto del fragmento consultado"}]}

data: {"type":"delta","text":"Según la política... [1]"}

data: {"type":"done","messageId":"...","inputTokens":120,"outputTokens":40}
```

- 401 cuando no hay sesión.
- 403 si rol insuficiente.
- 409 si carpeta ya sincronizando o correo repetido (409 para duplicados).
- 413 al superar tamaño de documento.
- 429 por límite de plan.
- 503 si faltan claves necesarias (por ejemplo Groq o Drive).
- Los errores que ocurren después de abrir SSE llegan como `{type:"error",error:"...",status:...}`. Antes del stream llegan como respuesta JSON con código HTTP.

El `companyId` no se acepta en el body ni parámetros de rutas; deriva exclusivamente del usuario autenticado.

La vista previa devuelve `document`, `chunks`, `total` y `nextOffset` (null al terminar). Solo acepta offsets enteros no negativos. Otra empresa obtiene 404. El listado de documentos incluye `uploadLimitBytes` para que la interfaz use el límite real del servidor.

Los fragmentos incluyen `page_number` (null si el formato/origen anterior no tiene páginas). Las fuentes de respuestas nuevas incluyen el texto consultado, la posición base cero del fragmento y la página cuando se conoce. Las cargas aceptan también PNG/JPEG y PDF escaneado cuando OCR está disponible. Otra persona de la misma empresa también recibe 404 si intenta leer, renombrar o exportar una conversación ajena. Solo puede haber una respuesta activa por conversación; un segundo intento recibe 409.

La recuperación usa enlaces de 30 minutos; las invitaciones, 48 horas. Un enlace inválido, vencido, ya utilizado o de otro propósito devuelve 400. La confirmación no inicia sesión automáticamente. Los endpoints de acceso tienen límite de intentos y las invitaciones/comprobaciones de servicios tienen límites adicionales. Las copias completas y la restauración son comandos de servidor, sin endpoints de descarga multitenant.

Los comentarios SSE `: keep-alive` mantienen la conexión mientras se genera una respuesta. El cliente debe recibir `done` para considerarla completa; errores, desconexiones y respuestas sin contenido se registran como fallidas. El proveedor tiene un plazo máximo de dos minutos.

Solicitudes JSON inválidas y campos multipart inesperados devuelven 400. Un documento dañado o ilegible devuelve 422. Una cookie mal codificada devuelve 401. Una dependencia no disponible puede devolver 503; el plazo del generador agotado se comunica con 504.
