# Operación de las nuevas funciones

## Actualizar una instalación

Usa Node 22.16 o posterior y MySQL 8.4. Desde la raíz del proyecto:

```bash
npm ci
npm run db:migrate
npm test
npm run build
```

La migración 002 conserva el historial de cada usuario en su propia conversación. Es reanudable y puede repetirse sin reasignar temas existentes. La versión manual de Workbench incluye el mismo esquema y registra las migraciones.

## Conversaciones y citas

En Asistente, «Nueva conversación» inicia un tema sin contexto previo. «Historial, búsqueda y exportación» permite buscar por título/contenido, cambiar el nombre y descargar Markdown o JSON. La lista muestra hasta 100 coincidencias; cada chat carga sus últimas 200 respuestas y exporta hasta 1000. El contexto del modelo utiliza hasta seis respuestas previas del mismo usuario, empresa y conversación. Las preguntas cortas de seguimiento recuperan también el tema anterior. Una respuesta previa sirve para aclarar la consulta, no como fuente de hechos.

Las fuentes nuevas conservan el fragmento utilizado, su posición y, para PDF/imágenes, el número de página. Al abrir una fuente se muestra ese fragmento guardado y el texto indexado actual. En DOCX/TXT/CSV/Markdown no se inventan páginas. Los PDF indexados con versiones anteriores deben volver a cargarse para incorporar páginas; regenerar únicamente sus embeddings no recupera esa información.

## Servicios externos

Configura secretos únicamente en el entorno seguro del servidor o en `backend/.env`, excluido de Git. No reutilices claves publicadas en un chat. En Integraciones, un administrador puede comprobar Groq, Drive, correo y el proveedor de búsqueda. La comprobación hace una solicitud real y puede ser facturable. Nunca se muestran las claves en la interfaz.

- **Groq:** `GROQ_API_KEY` nueva y `GROQ_MODEL`. La comprobación valida una respuesta corta y su streaming.
- **Drive:** `GOOGLE_APPLICATION_CREDENTIALS` apunta al JSON de una cuenta de servicio. Comparte la carpeta con esa cuenta y configura su ID en Documentos → Google Drive. La comprobación valida acceso a esa carpeta, no realiza una sincronización completa.
- **Correo:** configura `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM` y, si corresponde, `SMTP_USER`/`SMTP_PASSWORD`. Puerto 465 normalmente usa `SMTP_SECURE=true`; 587 usa STARTTLS. Producción exige TLS al servidor de correo.
- **Enlaces de acceso:** `APP_URL` debe ser la URL pública fija de la aplicación, con HTTPS en producción. No se construyen enlaces a partir del encabezado Host de una solicitud. En desarrollo se permite HTTP local.

La recuperación devuelve un mensaje genérico para correos registrados/no registrados cuando SMTP está configurado. Sin SMTP devuelve un error de servicio para ambos casos. Los enlaces vencen en 30 minutos (recuperación) o 48 horas (invitación). Solo se almacena su hash; son de un uso y el cambio de contraseña invalida sesiones anteriores. Una invitación no crea una cuenta hasta que su destinatario elige la contraseña. La creación manual de colaboradores sigue disponible.

## Búsqueda neuronal

Se conservan tres opciones de `EMBEDDING_PROVIDER`:

| Valor | Funcionamiento | Preparación |
| --- | --- | --- |
| `local` | Hashing y comparación léxica; sin modelo neuronal | Ninguna clave ni descarga |
| `transformers` | Modelo multilingüe MiniLM en CPU | `npm run prepare:semantic` |
| `voyage` | Embeddings neuronales de Voyage con refuerzo léxico | `VOYAGE_API_KEY` y `VOYAGE_MODEL` |

El proveedor neuronal local usa `LOCAL_EMBEDDING_MODEL=Xenova/paraphrase-multilingual-MiniLM-L12-v2`; la primera preparación descarga el modelo público desde Hugging Face. `MODEL_CACHE_DIR` permite elegir su caché; por defecto está en `backend/.cache/models`, fuera de Git. También se admite una ruta local de modelo compatible, de hasta 80 caracteres. El runtime ONNX se instala en CPU; `.npmrc` omite su descarga opcional de CUDA.

Prepara el modelo antes de activar `transformers`; después cambia la variable, reinicia la API y vuelve a indexar los documentos. El panel muestra qué modelos tienen los fragmentos existentes. Un servidor sin acceso a la descarga debe recibir el modelo mediante su proceso habitual de aprovisionamiento; no se cambia automáticamente a un proveedor distinto ni se presenta el hashing como semántica neuronal.

## OCR

El servidor necesita Tesseract y Poppler (`pdftoppm`) en PATH. En Debian/Ubuntu:

```bash
sudo apt-get install tesseract-ocr tesseract-ocr-spa poppler-utils
```

En Windows instala Tesseract y Poppler, agrégalos a PATH y comprueba `tesseract --version` y `pdftoppm -v`. El BAT no instala estos programas.

`OCR_ENABLED=true` habilita el reconocimiento. `OCR_LANG=eng` funciona con el idioma inglés habitualmente instalado; para español usa `OCR_LANG=spa+eng` después de instalar ambos idiomas. `OCR_TESSDATA_DIR` permite indicar un directorio de idiomas propio. El OCR analiza páginas con imágenes y poco texto, conserva su número y evita procesar páginas en blanco. Se admiten hasta 20 páginas escaneadas por PDF, 200 páginas totales, imágenes de hasta 20 megapíxeles y el límite general de carga. Los procesos tienen tiempo máximo y archivos temporales privados que se eliminan al terminar. Solo se procesa un documento OCR a la vez por proceso servidor; una carga simultánea recibe un error recuperable.

## Copias automáticas cifradas

Las instalaciones nuevas generan secretos independientes para JWT y copias mediante `npm run setup:env`. La programación predeterminada `BACKUP_CRON=0 8 * * *` se interpreta en UTC: 02:00 de Costa Rica. Las instalaciones existentes conservan su `.env`: deben añadir una clave aleatoria independiente de al menos 32 caracteres en `BACKUP_ENCRYPTION_KEY` y la programación elegida. Nunca reemplaces una clave de copias sin conservar la anterior para los archivos ya creados.

`BACKUP_DIR` indica el almacenamiento; por defecto es `backend/backups`. `BACKUP_RETENTION_DAYS=14` conserva las copias recientes. El servidor debe permanecer activo para ejecutar el horario; los errores se registran sin secretos. Puedes crear una copia manualmente:

```bash
npm run backup
```

Las copias usan AES-256-GCM con autenticación, clave derivada con scrypt, sal y vector aleatorios, archivo 0600 en Linux y escritura temporal seguida de renombrado. El snapshot transaccional incluye documentos indexados, cuentas y conversaciones de todas las empresas. La operación es de servidor, no una descarga accesible a administradores de una sola empresa. No incluye `.env`, claves de proveedores ni archivos originales descartados por la carga. Los tokens de recuperación/invitación se omiten.

Este formato mantiene el snapshot en memoria y limita cada archivo a 256 MB; para volúmenes mayores usa herramientas de copia de MySQL. La retención elimina únicamente archivos con el patrón de esta aplicación después de una copia correcta.

**Conserva una copia de la clave fuera del servidor y replica los archivos cifrados a un almacenamiento separado.** La programación local no protege frente a la pérdida simultánea del servidor y su disco. Las copias no se suben a Git.

## Restaurar sin sobrescribir datos

El administrador de MySQL debe crear una base vacía distinta de la activa y dar acceso al usuario usado para restaurar. Mantén la clave con la que se creó el archivo en `BACKUP_ENCRYPTION_KEY`:

```bash
npm run backup:restore -- --file /ruta/copia.pbb --database tablero_recuperado --confirm-empty
```

El comando rechaza la base activa, un destino con tablas, una clave incorrecta y una copia alterada o de otro esquema. Crea el esquema de esta versión y restaura dentro de una transacción de datos. Las sesiones anteriores se invalidan y los enlaces de acceso no se recuperan. Si falla después de crear el esquema, inspecciona/elimina únicamente esa base de recuperación antes de volver a intentarlo. Comprueba cuentas, documentos, citas y conversaciones en la base restaurada antes de cambiar la configuración de la aplicación.

La restauración real de esta entrega se comprobó en una base temporal y se eliminó después de verificar contenido, páginas, cuentas, conversaciones y mensajes.

## Comprobaciones disponibles

```bash
npm test
npm run smoke
npm run check:api
npm run check:concurrency
npm run check:features
```

Las comprobaciones HTTP requieren la API iniciada. `smoke` y `check:api` usan las cuentas demo. Las de concurrencia/funciones crean y eliminan datos temporales; rechazan producción y URLs de API externas. Sus transportes de IA/correo simulados no sustituyen pruebas reales de Groq, Drive, Voyage o entrega de correo externa.
