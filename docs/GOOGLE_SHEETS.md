# Estructura de Google Sheets

Un archivo independiente por workflow. Estas son las hojas y columnas **tal como las usa el proyecto**.

| Archivo | Hoja | Columnas |
|---|---|---|
| `EP01_Usuarios` | `Usuarios` | `usuario_id`, `nombre`, `email_normalizado`, `password_hash`, `password_salt`, `estado`, `fecha_registro`, `fecha_actualizacion` |
| `EP02_Sesiones` | `Sesiones` | `sesion_id ` *(con un espacio al final, como está en la hoja)*, `usuario_id`, `token`, `fecha_inicio`, `fecha_expiracion`, *(columna vacía)*, `estado` |
| `EP03_Telegram` | `Codigos_Vinculacion` | `codigo_id`, `usuario_id`, `codigo`, `creado_en`, `expira_en`, `estado`, `usado_en` |
| `EP03_Telegram` | `Vinculaciones` | `vinculacion_id`, `usuario_id`, `chat_id`, `telegram_username`, `fecha_vinculacion`, `estado` |
| `EP04_Eventos` | `Eventos` | `evento_id`, `nombre`, `categoria`, `descripcion`, `fecha` (AAAA-MM-DD), `hora`, `lugar`, `capacidad`, `imagen_url`, `organizador`, `estado`, `fecha_creacion`, `fecha_actualizacion` |
| `EP05_Catalogo_Log` | `Consultas_Catalogo` | `consulta_id`, `fecha`, `tipo`, `evento_id`, `categoria`, `resultado_count`, `visitor_id`, `status_http` |
| `EP06_Inscripciones` | `Inscripciones` | `inscripcion_id`, `usuario_id`, `evento_id`, `estado`, `fecha_inscripcion`, `fecha_actualizacion`, `nombre_acreditacion`, `observaciones`, `origen`, `orden_espera` |
| `EP07_Reasignaciones` | `Reasignaciones` | `reasignacion_id`, `evento_id`, `inscripcion_id`, `usuario_id`, `fecha`, `orden_lista`, `estado_anterior`, `estado_nuevo`, `resultado_notificacion` |
| `EP08_Recordatorios` | `Recordatorios` | `recordatorio_id`, `usuario_id`, `evento_id`, `inscripcion_id`, `tipo_recordatorio`, `fecha_programada`, `fecha_envio`, `estado`, `clave_idempotencia` |
| `EP09_Notificaciones` | `Notificaciones` | `notificacion_id`, `usuario_id`, `tipo`, `titulo`, `mensaje`, `evento_id`, `inscripcion_id`, `fecha`, `gmail_estado`, `telegram_estado`, `gmail_error`, `telegram_error`, `clave_idempotencia` |
| `EP10_soporte` | `Conversaciones` | `conversation_id`, `visitor_id`, `fecha_inicio`, `fecha_ultima_interaccion`, `estado` |
| `EP10_soporte` | `Mensajes` | `message_id`, `conversation_id`, `visitor_id`, `rol`, `mensaje`, `timestamp` |
| `EP11_Checkin` | `Checkins` | `checkin_id`, `inscripcion_id`, `evento_id`, `usuario_id`, `fecha_checkin`, `resultado`, `detalle` |

## Notas

- `resultado_notificacion` en `Reasignaciones` vale `SOLICITADA`: significa que la notificación se pidió a WF09; el resultado por canal queda en `Notificaciones`.
- Los eventos creados con el formulario de WF04 quedan en `BORRADOR`; para publicarlos se cambia `estado` a `PUBLICADO` en la hoja.
- Categorías del formulario: Tecnología, Educación, Cultura, Deportes, Entretenimiento.
- El PDF también pide `Auditoria_Usuarios`, `Auditoria_Eventos` y `Auditoria_Inscripciones` (marcadas como recomendadas); no están implementadas.
- Los registros no se eliminan: se cambian de estado (borrado lógico).
