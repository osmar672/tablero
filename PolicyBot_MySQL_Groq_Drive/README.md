# PolicyBot | SaaS RAG con MySQL, Groq y Google Drive

Aplicación web de asistencia documental para múltiples empresas. **Es el producto PolicyBot solicitado en la práctica**, no únicamente el gestor de tareas. El gestor anterior, **PolicyBoard 4.0**, se conserva aparte en `seguimiento/PolicyBoard_4_React_Express.zip`.

## Funciones implementadas

- Alta de empresas con usuario administrador, acceso con cookie HTTP-only/JWT y contraseñas bcrypt.
- Empresas aisladas: el `company_id` se obtiene del usuario autenticado en MySQL, nunca del frontend.
- Panel React con chat, documentos, Google Drive, usuarios y límites del plan.
- Carga de PDF con texto, DOCX, TXT, Markdown y CSV; extrae texto, divide en fragmentos y guarda embeddings en MySQL.
- RAG: recuperación de fragmentos de la empresa y generación de respuesta **en streaming SSE con Groq** y fuentes.
- Integración Google Drive con cuenta de servicio: carpeta compartida, exportación de Docs/Sheets, descarga de documentos y sincronización manual y horaria.
- Historial del chat y consumo mensual (cuotas de documentos/preguntas, tokens reportados por Groq).
- Migración SQL, datos demostrativos de dos empresas y pruebas automatizadas locales.

> IMPORTANTE: Este trabajo adapta el PDF original. Allí se pedían **Claude + PostgreSQL/pgvector + Voyage**. Aquí se emplean **Groq + MySQL** como solicitaste. Los vectores se almacenan en una columna JSON y la similitud se calcula en Node.js, solución válida para el tamaño de un MVP, **no un reemplazo de pgvector a gran escala**. Si tu profesor exige la pila tecnológica literalmente, solicita autorización para el cambio.

## Requisitos

- Node.js 22.16+ y npm.
- Docker Desktop o Docker Engine con Compose, encendido.
- Clave real de [Groq Cloud](https://console.groq.com/keys) para generar respuestas.
- Para Drive: proyecto de Google Cloud, Drive API habilitada y una cuenta de servicio que tenga acceso de lectura a la carpeta.
- Opcional: clave de Voyage AI para embeddings **semánticos** en vez del hashing lexical local.

## Instalación en Windows

1. Descomprime el ZIP y abre la carpeta del proyecto.
2. Abre PowerShell o CMD en esta carpeta y ejecuta:

```powershell
npm run setup:env
```

3. El comando genera un JWT aleatorio y conserva cualquier `.env` existente. Añade una clave nueva de `GROQ_API_KEY` mediante configuración privada para generar respuestas. No compartas claves ni las guardes en Git.
4. Inicia MySQL:

```powershell
docker compose up -d db
```

5. Instala dependencias, aplica SQL y ejecuta:

```powershell
npm ci
npm run db:migrate
npm run dev
```

6. Abre **http://127.0.0.1:5173**. El backend responde en `http://127.0.0.1:4000/api/health`.

También puedes ejecutar `INICIAR_WINDOWS.bat`. El script genera la configuración local si todavía no existe. Si prefieres Linux, `./INICIAR_LINUX.sh`.

**Modo producción local:** `npm run build` y después `npm start` sirven frontend y API desde el puerto 4000. Configura `NODE_ENV=production`, HTTPS con proxy inverso y credenciales seguras antes de desplegarlo públicamente.

### Configuración de Google Drive

1. Abre [Google Cloud Console](https://console.cloud.google.com/), crea un proyecto y habilita **Google Drive API**.
2. En **Cuentas de servicio**, crea una identidad. Genera una clave JSON y guárdala como `backend/credentials/service-account.json`. **No la subas al repositorio**.
3. Abre el JSON y copia su campo `client_email`. Comparte una carpeta de Drive con ese correo asignando permiso **Lector**. Algunas políticas de Google Workspace prohíben compartir con cuentas externas; necesitarás que tu administrador lo permita.
4. En `backend/.env` conserva `GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json` o usa otra ruta. Reinicia el backend si cambias las credenciales.
5. En **Documentos → Google Drive**, pega el ID de la carpeta (el segmento final de su URL), guárdalo y pulsa **Sincronizar ahora**.
6. La sincronización automática se ejecuta una vez por hora por defecto. Elimina del índice archivos retirados de esa carpeta y vuelve a indexar los modificados.

Formatos Drive: documentos Google Docs (texto plano), Google Sheets (CSV, con limitaciones de exportación), PDF, DOCX, TXT, MD y CSV. Subcarpetas no se recorren recursivamente. No se implementó OAuth de usuario; se usa **cuenta de servicio**, igual que el ejercicio.

### Embeddings: local o Voyage

Configuración por defecto: `EMBEDDING_PROVIDER=local`. Guarda vectores de 384 dimensiones usando hashing **lexical** local. Es muy ligero y no necesita otra API, pero no comprende sinónimos igual que un modelo semántico real.

Para una búsqueda semántica de calidad superior:

```dotenv
EMBEDDING_PROVIDER=voyage
VOYAGE_API_KEY=tu_clave_real
VOYAGE_MODEL=voyage-4-lite
```

**Reindexa los documentos** con la acción circular de la biblioteca después de cambiar el proveedor o el modelo de embeddings. Los fragmentos de un proveedor no se comparan con los de otro (evitamos mezclar dimensiones). Para una instalación nueva lo más fácil es usar ese modo desde el principio.

### Modelo de Groq

`GROQ_MODEL=openai/gpt-oss-120b` es un ejemplo de modelo de producción vigente verificado el 16-11-2026. Puedes consultar los disponibles en [Groq Models](https://console.groq.com/docs/models) y modificarlo en `.env` sin tocar código. El frontend nunca recibe las API keys.

## Datos demostrativos

Para preparar 2 empresas y 3 políticas por empresa:

```bash
npm run db:seed
```

Cuentas de demostración (en **desarrollo local exclusivamente**):

| Empresa | Admin | Colaborador |
| --- | --- | --- |
| Café Montaña S.A. | `admin.cafe@demo.test` | `equipo.cafe@demo.test` |
| Logística Pacífico | `admin.logistica@demo.test` | `equipo.logistica@demo.test` |

Contraseña inicial de las cuentas demostrativas: `DemoSeguro2026!` (se puede definir con `DEMO_PASSWORD`). No utilices estas cuentas en producción.

## Estructura

```text
PolicyBot_MySQL_Groq_Drive/
├── backend/
│   ├── src/
│   │   ├── config/          # .env, configuración
│   │   ├── db/              # MySQL, migraciones y seed
│   │   ├── middlewares/     # sesión, roles y errores
│   │   ├── routes/          # auth, users, documents, drive, chat, usage
│   │   ├── services/        # Groq, embeddings, Drive, extracción e indexación
│   │   ├── rag/             # fragmentación, vector local, recuperación
│   │   ├── jobs/            # sincronización programada
│   │   ├── app.js
│   │   └── server.js
│   ├── credentials/         # clave JSON privada, ignorada por git
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── app/             # composición
│   │   ├── components/      # componentes compartidos y navegación
│   │   ├── context/         # autenticación
│   │   ├── pages/           # login, chat, documentos, usuarios, uso
│   │   ├── services/        # cliente API + SSE
│   │   └── styles/
│   └── public/
├── database/
│   ├── migrations/         # 001_init.sql
│   └── fixtures/           # 6 documentos de prueba
├── scripts/                # pruebas HTTP
├── docs/                   # diseño, API y pruebas
├── seguimiento/            # copia separada de PolicyBoard 4.0
├── docker-compose.yml
└── package.json
```

## Verificación

Pruebas unitarias de Node.js:

```bash
npm test
```

Tras arrancar la API y ejecutar `npm run db:seed`, prueba endpoints reales (sesiones, separación de empresas y 403 para colaboradores):

```bash
npm run smoke
npm run check:api
```

`check:api` comprueba 24 casos de permisos, aislamiento y validación con la API local y las cuentas demo. Para comprobar cuotas frente a solicitudes simultáneas, ejecuta `npm run check:concurrency` en desarrollo: crea una empresa temporal y elimina sus datos al terminar. Los dos comandos rechazan el modo producción.

Consulta `docs/PRUEBAS_DE_ACEPTACION.md` para las siete pruebas del PDF y `docs/INFORME_1_PAGINA_PLANTILLA.md` para el informe final. Varias requieren tus claves reales; no se pueden acreditar con mocks. El registro de estado real de esta entrega está en `VERIFICACION.md`.

## Limitaciones del MVP

- Los embeddings JSON se puntúan en el proceso Node (búsqueda exacta), no con un índice vectorial dentro de MySQL. Funciona para volúmenes reducidos; para miles de documentos requiere una implementación de búsqueda vectorial indexada.
- OCR con Tesseract y Poppler: admite PNG/JPG y hasta 20 páginas escaneadas por PDF. Requiere instalar esos programas; la calidad del reconocimiento depende del escaneo.
- Sin panel de propietario de plataforma para cobros. Planes `gratis`/`pro` y cuotas **sí** están implementados, sin integración de pagos.
- El alta admite credenciales iniciales o invitación por correo. Recuperación e invitaciones requieren un servidor SMTP configurado.
- La sincronización periódica usa un proceso cron en el servidor y no una cola distribuida.
- El modo `local` usa hashing y coincidencias léxicas. `transformers` añade un modelo neuronal multilingüe en CPU; `voyage` usa un servicio externo. Cambiar de modelo requiere reindexar. La descarga inicial del modelo local necesita acceso a Hugging Face.

## Referencias oficiales

- https://console.groq.com/docs/api-reference
- https://console.groq.com/docs/models
- https://developers.google.com/workspace/guides/create-credentials
- https://developers.google.com/workspace/drive/api/guides/manage-downloads
- https://docs.voyageai.com/docs/embeddings

## Conversaciones, acceso, OCR y copias

Consulta [OPERACION.md](docs/OPERACION.md) para configurar correo, búsqueda neuronal, OCR, comprobaciones de integración y copias cifradas/restauración. La migración `002_conversations_access_citations.sql` conserva las consultas anteriores en conversaciones privadas y añade páginas a los nuevos documentos.

```bash
npm run db:migrate
npm run check:features
```

`check:features` necesita la API local y MySQL. Crea dos empresas temporales, comprueba los nuevos flujos y elimina sus datos. Simula el transporte de IA y correo; no acredita conexiones reales con proveedores externos.
