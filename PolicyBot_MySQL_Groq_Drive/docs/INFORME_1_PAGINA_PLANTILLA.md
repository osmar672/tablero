# Informe técnico de PolicyBot (completar después de las pruebas reales)

**Equipo:** __________________ | **Fecha:** ______________

## 1. Decisiones de diseño

Se implementó un SaaS multiempresa con React + Vite, Node.js + Express y MySQL 8.4. Cada usuario pertenece a una empresa y los filtros `company_id` se aplican en documentos, fragmentos y conversaciones. La integración con Google Drive es de solo lectura mediante cuenta de servicio. Las respuestas se generan por Groq mediante SSE con recuperación RAG y fuentes. **Diferencias respecto al PDF:** se sustituyó Claude por Groq y PostgreSQL/pgvector por MySQL (vectores JSON comparados en Node.js). El proveedor de embeddings usado en la prueba fue: ______________ (local hashing o Voyage).

## 2. Resultados obtenidos

| Prueba | Resultado real | Evidencia |
| --- | --- | --- |
| Consulta con cita | Pendiente | ___ |
| Aislamiento entre empresas | Pendiente | ___ |
| Sincronización de Drive | Pendiente | ___ |
| Resistencia a prompt injection | Pendiente | ___ |
| Colaborador recibe 403 | Pendiente | ___ |
| Cuota devuelve 429 | Pendiente | ___ |
| Streaming abortado al cerrar | Pendiente | ___ |

## 3. Consumo y costos observados

Mediante el panel `Plan y consumo`, y los campos `messages.input_tokens`, `messages.output_tokens`, se registraron para una pregunta real: ____ tokens de entrada y ____ de salida. Modelo utilizado: __________________. Precio por millón de tokens de entrada: $____, salida: $____ (verificar tarifa vigente en Groq). **Costo estimado**: `(entrada / 1_000_000 × tarifa_entrada) + (salida / 1_000_000 × tarifa_salida) = $____`. Añadir costo de embeddings si se usa Voyage: $____. Estos importes **no están medidos todavía** y deben completarse tras consultar las APIs reales.

## 4. Mejoras propuestas

Búsqueda vectorial indexada para grandes volúmenes, OAuth por empresa para Drive, cola de trabajos de indexación, OCR de PDF escaneado, observabilidad, recuperación de contraseñas y pruebas automáticas de seguridad.
