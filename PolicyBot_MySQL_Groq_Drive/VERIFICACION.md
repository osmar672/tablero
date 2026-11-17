# Verificación de PolicyBot

Fecha: 16 de noviembre de 2026. Entorno de desarrollo en la nube. Este registro describe comprobaciones ejecutadas, no una certificación de producción.

## Funcionalidad preparada

- Inicio con documentos recientes, fuentes indexadas, consumo real, mensajes de biblioteca vacía y recuperación independiente de fallos.
- Chat con cancelación, copia al portapapeles, reintento, formato seguro de listas y negritas, conservación de respuestas parciales y desplazamiento que permite leer mensajes anteriores.
- Lectura del texto indexado desde la biblioteca y las referencias del chat. Vista previa paginada, con diálogo accesible y acceso restringido a la empresa autenticada.
- Biblioteca con búsqueda sin distinción de acentos/mayúsculas, filtros de origen y estado, progreso de carga y resultados individuales. Nombres multipart en UTF-8 conservados.
- Guía interna, recuperación de sesión y errores de conexión, y menú móvil operable con teclado, Escape y restauración del foco.
- Búsqueda local que combina palabras, títulos y vectores, descarta colisiones sin coincidencias y conserva compatibilidad con embeddings existentes. No sustituye un modelo semántico.

## Comprobaciones ejecutadas

- `npm test`: **45 pruebas aprobadas**. Cubren streaming del cliente y del proveedor, cancelación, desconexiones, errores HTTP/SSE, UTF-8, búsqueda de fuentes, filtros de documentos, validación de solicitudes/configuración/contraseñas/nombres y creación segura del `.env`.
- `npm run build`: compilación React/Vite aprobada.
- Arranque separado con `NODE_ENV=production`: salud MySQL, rutas API inexistentes en JSON, CSP, `nosniff`, cookies Secure/HttpOnly/SameSite y recorrido de navegador sobre los archivos compilados aprobados. Proceso auxiliar cerrado al terminar; no constituye un despliegue público ni prueba HTTPS de extremo a extremo.
- `npm run smoke`: salud, sesiones A/B, aislamiento documental, permisos del colaborador y consumo aprobados.
- `npm run check:api`: **24 comprobaciones HTTP** de permisos, aislamiento, cookies, JSON, multipart y parámetros aprobadas. No altera datos persistentes.
- `npm run check:concurrency`: con una empresa temporal en MySQL, 8 cargas simultáneas respetaron 2 plazas; 8 preguntas simultáneas respetaron una pregunta restante. El stream sin fuentes terminó correctamente. Datos temporales eliminados.
- Seis búsquedas con MySQL real recuperaron primero la política esperada de vacaciones, reembolsos o teletrabajo para cada empresa demo, sin fuentes ajenas.
- Vista previa real: texto correcto, 404 para otra empresa, offsets inválidos rechazados, paginación de documentos extensos y referencias del chat comprobadas.
- Sincronizaciones simultáneas: bloqueo y liberación comprobados localmente sin conectar a Google. Un documento con error de indexación se marca como error y puede recuperarse.
- SQL de Workbench comprobado en una base temporal: siete tablas correctas e idempotencia. La base temporal se eliminó.
- Generador de `.env`: JWT aleatorio, permisos 0600 en Linux y conservación íntegra de un archivo existente, comprobados en directorio temporal.
- Espera máxima del proveedor: **120.020 ms**, respuesta controlada 504. Se utilizó un transporte simulado sin red, no una llamada real a Groq.
- Revisión estática de referencias/JSX y `git diff --check`: aprobadas.
- Zod actualizado de 3.25.76 a 4.6.7 para corregir GHSA-mrhx-c7xc-m3w5. Pruebas unitarias, API y concurrencia repetidas con la nueva versión. Auditorías `npm audit` y `npm audit --omit=dev`: **0 vulnerabilidades conocidas** en la consulta realizada; este resultado depende de la base de avisos de npm y no sustituye una revisión de seguridad.
- Instalación limpia con `npm ci` en un directorio temporal: 237 paquetes instalados y Zod 4.6.7 resuelto desde el lockfile; directorio temporal eliminado después de verificarlo.

## Navegador y accesibilidad

Chromium real comprobó la página de inicio, filtros y carga parcial de documentos, vista previa desde biblioteca/chat, copia al portapapeles, cancelación, reintento, foco, menú móvil, recuperación de conexión, cierre de sesión fallido y sesión caducada.

Se inspeccionaron capturas de escritorio y móvil y se comprobó ausencia de desbordamiento horizontal en los recorridos. Las respuestas generadas y algunos errores de red se simularon para probar la interfaz; las consultas y vistas previas documentales también se comprobaron con MySQL real.

Axe examinó acceso, inicio, documentos, asistente, colaboradores, plan, ayuda, Drive y creación de colaborador con reglas WCAG 2 A/AA y 2.1 AA: **0 infracciones detectadas en esas nueve pantallas** después de corregir contraste. Esto no acredita por sí solo conformidad completa de accesibilidad.

Los scripts y dependencias auxiliares de navegador/lint están fuera del checkout, en `/workspace/tablero-qa`; el producto no los necesita para ejecutarse.

## Observación prolongada

La ronda de trabajo comenzó a las 14:42:48 de Costa Rica (20:42:48 UTC) y completó la hora solicitada a las 15:42:48 (21:42:48 UTC). Ambos monitores finalizaron normalmente al llegar a esa hora.

Se registran comprobaciones periódicas de rutas privadas y aislamiento en `/tmp/tablero-stability.jsonl`, y navegación de la versión compilada en `/tmp/tablero-browser-endurance.jsonl`. Durante la edición se registró un intervalo de API detenida y errores transitorios del navegador en modo de desarrollo; estos resultados no se ocultan ni se presentan como aprobados. La observación de la versión compilada se registra por separado de las recargas de Vite.

- API: **65 rondas, 780 intentos; 768 aprobados y 12 fallidos**. Los 12 fallos pertenecen a una sola ronda, a las 20:45:17 UTC, con la API de desarrollo detenida. No hubo nuevos fallos en las rondas siguientes. Cada ronda consulta sesión, documentos, consumo e historial de tres usuarios de dos empresas y comprueba identidad/aislamiento.
- Navegador sobre la versión compilada: **43 recorridos, 301 comprobaciones y 0 fallos detectados**, desde las 21:03:29 hasta el cierre a las 21:42:48 UTC. Alternó escritorio, móvil y tableta, recorriendo inicio, biblioteca, ayuda, plan y colaboradores, abriendo texto real y comprobando ausencia de desbordamiento horizontal. Esta fase duró aproximadamente 39 minutos; no se presenta como una hora entera de navegación compilada.
- El registro anterior de navegador de desarrollo se conserva en `/tmp/tablero-browser-development.jsonl`: contiene incidencias durante las recargas de edición y dos intentos tras cerrar ese navegador. No se contabiliza como una ejecución aprobada de la versión compilada.
- Esta observación corresponde a una instancia local con datos demo y solicitudes periódicas. No acredita capacidad de producción ni disponibilidad continua sin interrupciones durante toda la edición.

## Configuración y límites pendientes

- MySQL 8.4, base `tablero`, usuario limitado y contraseña/JWT locales aleatorios preparados. Migración y seed ejecutados y repetidos.
- `.env` excluido de Git, con permisos 0600. No se copiaron las claves compartidas en el chat al código ni al borrador de instrucciones.
- Groq: falta una clave nueva y una llamada real; las claves expuestas deben revocarse.
- Drive: falta un JSON válido de cuenta de servicio y una carpeta compartida. El archivo inyectado en esta instancia no contiene esa cuenta.
- Voyage: opcional y no verificado con credenciales reales; embeddings locales activos.
- Windows: BAT y documentación revisados, sin ejecución en Windows. Linux: comandos de instalación/migración comprobados y sintaxis del lanzador revisada; no se afirmó haber probado el BAT.
- Configuración de arranque reutilizable guardada como borrador; guardar no publica ni aplica una nueva instantánea.
