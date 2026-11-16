# API REST (cookies de sesión)

Para desarrollo, base `/api` (frontend mediante proxy de Vite). Todas las rutas privadas usan cookie `policybot_session` HTTP-only.

| Verbo | Ruta | Rol | Resultado |
| --- | --- | --- | --- |
| GET | `/api/health` | público | Estado API |
| POST | `/api/auth/register` | público | Empresa + admin + sesión |
| POST | `/api/auth/login` | público | Iniciar sesión |
| POST | `/api/auth/logout` | público | Cerrar sesión |
| GET | `/api/auth/me` | autenticado | Perfil/empresa |
| GET | `/api/users` | admin | Lista usuarios empresa |
| POST | `/api/users` | admin | Crear colaborador/admin |
| GET | `/api/documents` | usuario | Listar documentos empresa |
| POST | `/api/documents/upload` | admin | Multipart `file`; indexar |
| POST | `/api/documents/:id/reindex` | admin | Regenerar embeddings desde texto indexado |
| DELETE | `/api/documents/:id` | admin | Borrar documento y chunks |
| GET | `/api/drive` | admin | ID carpeta y última ejecución |
| PUT | `/api/drive` | admin | `{folderId}` |
| POST | `/api/drive/sync` | admin | Sincronizar en este momento |
| GET | `/api/chat/history` | usuario | Últimos 40 pares de mensajes propios |
| POST | `/api/chat/stream` | usuario | `{question}` → SSE |
| GET | `/api/usage` | usuario | Cuotas/tokens del mes |

## Ejemplo SSE

```text
data: {"type":"sources","sources":[{"id":1,"name":"politica.txt","documentId":"..."}]}

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
