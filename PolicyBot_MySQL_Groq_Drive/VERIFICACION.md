# Verificación de PolicyBot

Actualización del 16 de noviembre de 2026, hora de Costa Rica (ejecuciones posteriores a medianoche UTC del 17). Entorno de desarrollo en la nube. Se distinguen las comprobaciones locales de las integraciones externas pendientes.

## Funciones implementadas

- Conversaciones privadas por usuario y empresa: nuevos temas, renombrado, búsqueda por título/contenido y exportación Markdown/JSON. El chat utiliza hasta seis respuestas previas de su propio tema y recupera contexto para preguntas de seguimiento. La pregunta actual tiene prioridad en la consulta al buscador.
- Citas nuevas con texto exacto del fragmento, posición y página cuando está disponible. El diálogo abre el fragmento correspondiente y conserva el extracto utilizado aunque el documento cambie. No se inventan páginas en formatos que no las contienen.
- Proveedores de búsqueda `local`, `transformers` y `voyage`. Los proveedores neuronales reciben un refuerzo léxico; el hashing local sigue identificado como no neuronal. Runtime local en CPU preparado, descarga del modelo pendiente por restricción de red.
- Recuperación de contraseña e invitaciones por SMTP: tokens aleatorios de un solo uso, hash en MySQL, caducidad de 30 minutos/48 horas y revocación de sesiones al recuperar el acceso. Los cambios simultáneos de una misma cuenta se serializan. Las invitaciones permiten elegir contraseña y no crean una cuenta antes de aceptarlas.
- OCR para PNG/JPEG y páginas escaneadas de PDF mediante Tesseract/Poppler. Conserva páginas, distingue páginas en blanco, valida formato real de imagen y limita píxeles, páginas, procesos y tiempos de ejecución.
- Copias transaccionales cifradas con AES-256-GCM/scrypt, claves independientes, programación UTC, retención y restauración exclusivamente en una base vacía distinta de la activa. Omite tokens de acceso e invalida sesiones al restaurar.
- Panel administrativo de integraciones, sin mostrar secretos, con comprobaciones reales y límites de frecuencia. El estado de configuración se diferencia del resultado de conexión.
- Se conservan las mejoras anteriores: inicio con datos reales, filtros/carga múltiple, cancelación y copia del chat, formato de texto seguro, navegación móvil/teclado y recuperación de errores.

## Comprobaciones ejecutadas

| Comprobación | Resultado observado |
| --- | --- |
| `npm test` | **55 pruebas aprobadas**, sin fallos ni pruebas omitidas |
| `npm run build` | React/Vite compilado correctamente |
| Arranque en producción local | Salud MySQL, CSP, cookies Secure/HttpOnly/SameSite y navegación compilada aprobados en puerto auxiliar; no acredita HTTPS público ni despliegue |
| `npm run smoke` | Salud, sesiones demo, aislamiento, permisos y consumo aprobados |
| `npm run check:api` | **24 comprobaciones HTTP** aprobadas |
| `npm run check:concurrency` | 8 cargas simultáneas respetan 2 plazas; 8 preguntas respetan una pregunta restante |
| `npm run check:features` | Chats ajenos rechazados, contexto, citas/páginas, búsqueda/exportación, tokens, caducidad y sesiones aprobados con MySQL/HTTP reales y transporte de IA/correo simulado |
| SMTP local de prueba | Nodemailer entregó el enlace a un servidor SMTP local; no acredita entrega a un buzón externo |
| OCR real | PNG y PDF mixto de dos páginas reconocidos; texto nativo/escaneado mantienen su página. Carga OCR por HTTP y consulta desde el chat aprobadas |
| Restauración real | Snapshot cifrado restaurado en una base temporal, incluidos cuentas, conversación, mensaje, documentos y páginas; contenido/conteos correctos |
| Rechazos de restauración | Base activa, destino no vacío, clave incorrecta y archivo alterado rechazados |
| Programador real | Cron acelerado en proceso de prueba creó una copia cifrada autenticable; directorio temporal eliminado |
| Retención | Solo elimina copias antiguas del patrón propio; conserva archivos ajenos y copias recientes |
| Migración real | Historial anterior separado por usuario; repetición sin duplicados ni reasignar temas existentes |
| Workbench | Esquema actual creado y repetido en base temporal; base eliminada |
| Instalación limpia | `npm ci`: 278 paquetes, runtimes de imagen y ONNX importados correctamente en Linux; instalación temporal eliminada |
| Auditoría de npm | **0 vulnerabilidades conocidas** en la consulta realizada |
| Revisión estática | Referencias/JSX y `git diff --check` aprobados |

Las pruebas unitarias cubren streaming, UTF-8, cancelación, sesiones, validación, contraseñas, búsqueda, contexto, exportación, correo, cifrado, alteración de copias, retención y configuración inicial. La auditoría depende de los avisos disponibles y no constituye una revisión de seguridad completa.

## Navegador y accesibilidad

Chromium comprobó la carga OCR por HTTP, apertura de fuente con página, historial y cambio de tema, renombrado, búsqueda sin resultados, descarga Markdown, nueva conversación con SSE real sin fuentes, panel móvil de integraciones, fallo recuperable por SMTP ausente, aceptación de invitación y recuperación con inicio posterior usando la contraseña nueva. La respuesta con cita se preparó mediante transporte de IA simulado y se guardó/leyó desde MySQL real. No se utilizó Groq externo para esa respuesta.

Se detectaron y corrigieron dos problemas en el flujo: enlaces recibidos con la aplicación ya abierta no cambiaban de pantalla; al entrar con otra cuenta quedaba seleccionada la pestaña anterior. El recorrido posterior completo pasó sin errores JavaScript. Se inspeccionaron capturas de escritorio y móvil y ausencia de desbordamiento horizontal.

Axe examinó **14 pantallas/estados**, incluidos recuperación, invitación e integraciones: **0 infracciones detectadas** con reglas WCAG 2 A/AA y 2.1 AA. Las pantallas de confirmación de enlace usaron datos de token simulados para la revisión de accesibilidad; su funcionamiento se probó también con tokens/MySQL reales en el recorrido de navegador. Esto no acredita conformidad completa de accesibilidad.

Los scripts auxiliares de navegador/lint/restauración están fuera del checkout, en `/workspace/tablero-qa`. Sus capturas/registros son auxiliares y el producto no depende de ellos.

## Configuración y datos

- MySQL 8.4: base `tablero`, usuario limitado. Migraciones 001/002 aplicadas; nueve tablas de aplicación más `schema_migrations`. Las comprobaciones temporales eliminan empresas, usuarios, documentos y bases creadas para las pruebas.
- `.env` excluido de Git y con permisos 0600. Claves locales independientes y aleatorias para sesiones/copias. No se copiaron las claves expuestas en el chat al código.
- Copia manual cifrada creada en `backend/backups`, fuera de Git. Programación local diaria preparada a las 08:00 UTC (02:00 Costa Rica), con retención de 14 días. El disparo diario aún no ocurrió durante esta ronda; la ejecución automática se comprobó con cron acelerado.
- Guarda la clave de las copias fuera del servidor y replica los archivos cifrados a almacenamiento separado. Las copias locales no sustituyen esa protección.
- Windows: documentación/BAT revisados, sin ejecución en Windows. Tesseract/Poppler deben instalarse por separado. OCR verificado aquí con el idioma `eng`; `spa+eng` requiere instalar los datos de español.

## Integraciones externas pendientes

| Servicio | Estado real |
| --- | --- |
| Groq | Sin clave nueva configurada; generación externa pendiente |
| Drive | El archivo de credenciales inyectado no contiene una cuenta de servicio válida; conexión/sincronización externa pendientes |
| SMTP | Sin proveedor configurado; protocolo verificado localmente, entrega externa pendiente |
| Transformers local | Runtime disponible; descarga desde Hugging Face bloqueada en este entorno. No se activó sin modelo preparado |
| Voyage | Compatible y con ranking híbrido; falta una clave válida para verificarlo |

La interfaz y el servidor informan estos fallos y permiten probar los servicios tras configurarlos. El proveedor activo permanece en `local` y no se presenta como búsqueda neuronal. Consulta [OPERACION.md](docs/OPERACION.md) para completar la configuración sin publicar secretos.

## Registro de observación anterior

La ronda anterior completó una hora de trabajo: 14:42:48–15:42:48 de Costa Rica (20:42:48–21:42:48 UTC), el 16 de noviembre.

- API: 65 rondas, 780 intentos; 768 aprobados y 12 fallidos en un intervalo inicial con el servidor de desarrollo detenido. Las rondas posteriores no registraron nuevos fallos.
- Navegación compilada: 43 recorridos y 301 comprobaciones sin fallos, entre las 21:03:29 y las 21:42:48 UTC, aproximadamente 39 minutos. No se presenta como una hora entera de navegación compilada.
- Las incidencias de recarga de Vite y del cierre del navegador de desarrollo se conservaron por separado. Esa ronda y la actual son comprobaciones locales con datos demo, no una prueba de capacidad ni disponibilidad de producción.
