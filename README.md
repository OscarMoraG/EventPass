# EventPass — Crónicas del Reino

Sistema de gestión y consulta de eventos desarrollado para el proyecto de automatización con n8n de Campuslands.

**Estudiante:** Oscar Mora

## Descripción

EventPass es una aplicación web para consultar un catálogo de eventos, registrarse, iniciar y cerrar sesión, vincular Telegram, inscribirse a eventos con control de cupos y lista de espera, recibir notificaciones por Gmail y Telegram, registrar el ingreso de asistentes (check-in) y consultar a un asistente de IA.

La interfaz tiene una identidad visual medieval de fantasía oscura (tonos oscuros y detalles dorados). La aplicación web **no se conecta directamente a Google Sheets**: toda lectura o escritura pasa por workflows de n8n.

## URLs

| Recurso | URL |
|---|---|
| Frontend (Vercel) | https://eventpass-frontend-theta.vercel.app |
| Repositorio (GitHub) | https://github.com/OscarMoraG/EventPass |
| Backend público (ngrok → n8n) | https://hydrant-supermom-raging.ngrok-free.dev |
| Política de privacidad | https://eventpass-frontend-theta.vercel.app/privacidad.html |
| Bot de Telegram | https://t.me/EventPassMoraBot |

> **Importante para la evaluación:** el backend (n8n) se ejecuta en un computador personal con Docker y se expone con un túnel de ngrok (dominio estático gratuito). El frontend de Vercel solo muestra datos mientras ese computador esté encendido, con Docker y ngrok en ejecución. Ver [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

## Arquitectura general

```text
Aplicación pública (Vercel: HTML + CSS + JavaScript)
        │  HTTPS (fetch)          Chat (widget @n8n/chat)
        ▼
ngrok (dominio estático) ──► n8n (Docker, puerto 5678)
                                  │
                         Reglas del negocio
                                  │
                           Google Sheets
                                  │
                    Gmail · Telegram · Gemini (IA)
```

- El **frontend** es solo un cliente: no contiene reglas de negocio.
- **n8n** valida, decide, persiste, aplica idempotencia, maneja estados y notifica.
- **Google Sheets** funciona como persistencia académica, con un archivo independiente por workflow.

## Tecnologías

HTML5 · CSS3 · JavaScript · n8n (Docker) · Google Sheets · Gmail · Telegram Bot API · Google Gemini · ngrok · Git/GitHub · Vercel.

## Estructura del repositorio

```text
EventPass/
├── frontend/
│   ├── index.html
│   ├── privacidad.html
│   ├── css/styles.css
│   ├── js/app.js          # lógica de la página
│   ├── js/chat.js         # widget del asistente
│   └── assets/            # imágenes de eventos y fondo
├── n8n/                   # JSON de los workflows (WF01 … WF11)
├── docs/
│   ├── DESPLIEGUE.md
│   ├── GOOGLE_SHEETS.md
│   └── PRUEBAS.md
├── .env.example
├── .gitignore
└── README.md
```

## Workflows

| # | Archivo | Trigger | Google Sheets (archivo → hoja) |
|---|---|---|---|
| WF01 | `WF01_usuarios_crud.json` | Webhook `POST /webhook/usuarios` | `EP01_Usuarios` → `Usuarios` |
| WF02 | `WF02_auth_sesiones.json` | Webhook `POST /webhook/sesiones` | `EP02_Sesiones` → `Sesiones` |
| WF03 | `WF03_vinculacion_telegram.json` | Webhook `POST /webhook/telegram` + Telegram Trigger | `EP03_Telegram` → `Codigos_Vinculacion`, `Vinculaciones` |
| WF04 | `WF04_eventos_crud.json` | n8n Form Trigger | `EP04_Eventos` → `Eventos` |
| WF05 | `WF05_catalogo_publico.json` | Webhook `GET /webhook/catalogo` | `EP05_Catalogo_Log` → `Consultas_Catalogo` (lee `EP04` y `EP06`) |
| WF06 | `WF06_inscripciones_crud.json` | Webhook `POST /webhook/inscripciones` | `EP06_Inscripciones` → `Inscripciones` |
| WF07 | `WF07_reasignacion_lista_espera.json` | Schedule Trigger (diario, 8:00) | `EP07_Reasignaciones` → `Reasignaciones` |
| WF08 | `WF08_recordatorios.json` | Schedule Trigger (cada 30 min) | `EP08_Recordatorios` → `Recordatorios` |
| WF09 | `WF09_notificaciones.json` | Execute Sub-workflow Trigger | `EP09_Notificaciones` → `Notificaciones` |
| WF10 | `WF10_eventpass_assistant.json` | Chat Trigger (Embedded Chat) | `EP10_soporte` → `Conversaciones`, `Mensajes` |
| WF11 | `WF11_checkin_digital.json` | Webhook `POST /webhook/checkin` | `EP11_Checkin` → `Checkins` (lee `EP04` y `EP06`) |
| — | `WF09_prueba.json` | Manual | Workflow auxiliar para probar WF09 |

Las columnas de cada hoja están en [docs/GOOGLE_SHEETS.md](docs/GOOGLE_SHEETS.md).

### WF01 — Usuarios
Acciones `crear`, `consultar`, `actualizar`, `desactivar` (borrado lógico). Valida datos, normaliza el correo, **rechaza correos duplicados (HTTP 409)**, genera `usuario_id`, salt y hash, y responde siempre con JSON. Nunca devuelve contraseña, hash ni salt.

### WF02 — Autenticación y sesiones
Acciones `login` y `logout`. El login verifica contraseña contra hash + salt, crea una sesión de **2 horas** y devuelve `sesion_id`, `usuario_id`, `nombre` y `fecha_expiracion`. El logout marca la sesión como `CERRADA`, solo si pertenece al usuario y estaba activa. La validación de una sesión (existe, `ACTIVA`, no vencida y del mismo usuario) la hacen WF03 y WF06 antes de operar.

### WF03 — Vinculación con Telegram
- **Por webhook:** con una sesión válida genera un código de 6 caracteres, vigente 10 minutos (`PENDIENTE`). Con `accion: "estado"` informa si el usuario ya tiene Telegram vinculado.
- **Por Telegram Trigger:** el usuario escribe `/vincular CODIGO` al bot. n8n valida que el código exista, esté `PENDIENTE` y vigente; lo marca `USADO`, guarda el `chat_id` en `Vinculaciones` (`ACTIVA`) y responde por Telegram. Un código no puede usarse dos veces.

### WF04 — Eventos (formulario)
Form Trigger de n8n para el administrador. **Implementa la creación**: el evento se guarda en estado `BORRADOR` y se publica cambiando `estado` a `PUBLICADO` en la hoja. Las operaciones READ, UPDATE y CANCEL/CLOSE del PDF **no están implementadas** (ver Limitaciones).

### WF05 — Catálogo público
Devuelve `{ "ok": true, "total": N, "eventos": [ ... ] }` con los eventos `PUBLICADO`. Calcula `cupos_disponibles = capacidad − inscripciones ocupadas`, donde cuentan como ocupadas `CONFIRMADA` y `ASISTIO`. Añade `evento_pasado` (fecha anterior a hoy, hora de Colombia). Soporta los parámetros `categoria` y `evento_id`, y registra cada consulta en `Consultas_Catalogo`.

### WF06 — Inscripciones
Acción **crear**. Valida, en este orden: sesión válida y del mismo usuario, usuario `ACTIVO`, **Telegram vinculado**, evento existente, `PUBLICADO` y **no pasado**, y que no exista otra inscripción activa del mismo usuario en ese evento. Asigna `CONFIRMADA` si hay cupo o `LISTA_ESPERA` con `orden_espera` si no. Después notifica por WF09.

### WF07 — Reasignación de lista de espera
Revisa cada evento no cerrado ni pasado, calcula los cupos libres y promueve a `CONFIRMADA` a quienes esperan, ordenados por `fecha_inscripcion` ascendente. Registra cada reasignación y notifica por WF09.

### WF08 — Recordatorios
Detecta eventos que empiezan en las próximas 24 horas y crea un recordatorio por cada inscripción `CONFIRMADA`, notifica por WF09 y marca el recordatorio `ENVIADO` o `ERROR`. Normaliza horas como `9:00` a `09:00`.

### WF09 — Servicio central de notificaciones
Recibe `usuario_id`, `tipo`, `titulo`, `mensaje`, `evento_id` e `inscripcion_id`. Registra la notificación, busca el correo del usuario y su última vinculación `ACTIVA` de Telegram, y envía por **Gmail y Telegram de forma independiente**: si un canal falla, el otro se envía igual. Guarda `gmail_estado`, `telegram_estado` (`ENVIADO`, `ERROR`, `NO_APLICA`) y el texto del error de cada canal.

### WF10 — EventPass Assistant
Chat conversacional con Gemini y una herramienta de **solo lectura** sobre los eventos. Cada pregunta recibe la fecha de hoy para que no presente eventos pasados como próximos. Guarda la conversación y cada mensaje (`USER` y `ASSISTANT`) en `EP10_soporte`.

### WF11 — Check-in digital
Ver la sección [Examen — Check-in digital](#examen--check-in-digital).

## Comunicación frontend → n8n

El frontend usa `fetch()` hacia `N8N_BASE_URL` (definido al inicio de `frontend/js/app.js`). Todas las peticiones envían la cabecera `ngrok-skip-browser-warning`, porque el plan gratuito de ngrok muestra una página de aviso a los navegadores. n8n tiene configurado CORS (`Allowed Origins`) solo para el dominio de Vercel. La interfaz maneja tres estados: **carga**, **éxito** y **error**; si el servidor falla, muestra un mensaje claro y un botón para reintentar, y **no** usa datos de respaldo.

## Endpoints

Base: `https://hydrant-supermom-raging.ngrok-free.dev/webhook`

| Método | Ruta | Cuerpo / parámetros | Respuesta principal |
|---|---|---|---|
| GET | `/catalogo` | opcional `?categoria=` o `?evento_id=` | `{ ok, total, eventos[] }` |
| POST | `/usuarios` | `{ accion:"crear", nombre, email, password }` | `{ ok, mensaje, usuario_id, nombre, email }` — 409 si el correo existe |
| POST | `/sesiones` | `{ email, password }` (login) | `{ ok, sesion_id, usuario_id, nombre, fecha_expiracion }` — 401 si es incorrecto |
| POST | `/sesiones` | `{ accion:"logout", usuario_id, sesion_id }` | `{ ok, mensaje }` |
| POST | `/telegram` | `{ usuario_id, sesion_id }` | `{ ok, codigo, expira_en, bot }` |
| POST | `/telegram` | `{ accion:"estado", usuario_id, sesion_id }` | `{ ok, vinculado, telegram_username, ... }` |
| POST | `/inscripciones` | `{ evento_id, usuario_id, sesion_id }` | `{ ok, mensaje, inscripcion{...} }` — 401, 403, 404 |
| POST | `/checkin` | `{ inscripcion_id, evento_id }` | `{ ok, resultado, mensaje, ... }` |
| — | `/{id}/chat` | widget `@n8n/chat` | `{ output }` |

## Estados

| Entidad | Estados |
|---|---|
| Usuario | `ACTIVO`, `INACTIVO` |
| Sesión | `ACTIVA`, `CERRADA` (`EXPIRADA` está definido pero no se actualiza automáticamente) |
| Evento | `BORRADOR`, `PUBLICADO`, `CERRADO`, `CANCELADO` |
| Inscripción | `CONFIRMADA`, `LISTA_ESPERA`, `CANCELADA`, `ASISTIO` |
| Código de Telegram | `PENDIENTE`, `USADO` |
| Vinculación | `ACTIVA` |
| Notificación (por canal) | `PENDIENTE`, `ENVIADO`, `ERROR`, `NO_APLICA` |
| Recordatorio | `PENDIENTE`, `ENVIADO`, `ERROR` |
| Check-in | `EXITOSO`, `DUPLICADO`, `RECHAZADO` |
| Conversación / mensaje | `ABIERTA` · `USER`, `ASSISTANT` |

El estado **«Cerrado»** que se ve en las tarjetas de eventos pasados se calcula al consultar (`evento_pasado`); no modifica el campo `estado` de la hoja.

## Hashing de contraseñas

Al crear un usuario, n8n genera un **salt aleatorio** (nodo Crypto, acción *generate*) y calcula el hash de `contraseña + salt` con el nodo Crypto (algoritmo por defecto: **MD5**). En la hoja se guardan `password_hash` y `password_salt`; nunca la contraseña. En el login se recalcula el hash con el salt guardado y se compara. *Nota honesta:* MD5 con sal es suficiente para fines académicos, pero no se recomienda para producción (allí se usaría bcrypt o Argon2). El PDF sugiere un Code Node; se usó el nodo Crypto de n8n.

## Manejo de sesiones

El login crea una fila en `EP02_Sesiones` con un token aleatorio, fecha de inicio, **vencimiento a las 2 horas** y estado `ACTIVA`. El frontend guarda la sesión solo en memoria (al recargar la página hay que iniciar sesión otra vez). Los workflows que operan por un usuario validan que la sesión exista, esté `ACTIVA`, no haya vencido y **pertenezca al mismo `usuario_id`**. El logout la marca `CERRADA`.

## Idempotencia

| Proceso | Mecanismo |
|---|---|
| Inscripción | `usuario_id + evento_id` no puede tener dos inscripciones activas (`CONFIRMADA`, `LISTA_ESPERA` o `ASISTIO`). |
| Check-in | Un check-in `EXITOSO` previo para la `inscripcion_id` impide otro; responde `DUPLICADO` sin modificar el estado. |
| Recordatorios | Clave `usuario_id_evento_id_24H` en `clave_idempotencia`. |
| Notificaciones | `clave_idempotencia` en cada registro. |
| Código de Telegram | Pasa a `USADO` y no puede reutilizarse. |
| Usuarios | El correo normalizado no puede repetirse. |

## Lista de espera y reasignación

Si el evento no tiene cupo, la inscripción queda `LISTA_ESPERA` con su `orden_espera`. WF07 se ejecuta cada día a las 8:00: por cada evento calcula `cupos libres = capacidad − (CONFIRMADA + ASISTIO)`, ordena la lista de espera por `fecha_inscripcion` ascendente y promueve a los primeros. Ejemplo: con 2 cupos libres y 5 personas esperando, pasan a `CONFIRMADA` las dos más antiguas y las otras tres siguen en espera. Cada promoción se registra en `Reasignaciones` y se notifica por WF09.

## Servicio central de notificaciones

Todo aviso a un usuario pasa por WF09, que lo envía por **Gmail y Telegram** y registra el resultado de cada canal por separado. Lo invocan WF06 (inscripción confirmada o lista de espera), WF07 (reasignación), WF08 (recordatorio) y WF11 (check-in). Si el usuario no tiene correo o Telegram vinculado, el canal queda `NO_APLICA` con una explicación.

## Asistente IA y restricciones

Usa Gemini y **solo puede consultar** la información de eventos. Responde sobre eventos, categorías, fechas, lugares, lista de espera, funcionamiento de EventPass, vinculación de Telegram y estados de inscripción. **No puede** crear usuarios, iniciar sesión, crear o cancelar inscripciones, modificar eventos, cambiar cupos ni modificar estados del negocio; si se le pide, responde que solo brinda información. No lee las inscripciones, por lo que no calcula cupos exactos y remite a EventPass.

## Examen — Check-in digital

### Descripción
Permite registrar el ingreso real de una persona a un evento. Desde la página, el enlace **Check-in** (pie de página) abre una ventana con dos campos: código de inscripción y código del evento. Si la persona acaba de inscribirse, la ventana viene prellenada.

### Endpoint
`POST https://hydrant-supermom-raging.ngrok-free.dev/webhook/checkin`

### Petición
```json
{ "inscripcion_id": "INS-...", "evento_id": "EVT-..." }
```

### Respuestas
| Caso | HTTP | Cuerpo |
|---|---|---|
| Éxito | 200 | `{ "ok": true, "resultado": "EXITOSO", "mensaje": "Check-in realizado correctamente.", "checkin_id": "CHK-...", "fecha_checkin": "..." }` |
| Duplicado | 200 | `{ "ok": false, "resultado": "DUPLICADO", "mensaje": "El ingreso ya había sido registrado." }` |
| Rechazado | 400 | `{ "ok": false, "resultado": "RECHAZADO", "mensaje": "<motivo>" }` |

### Validaciones
1. Llegan `inscripcion_id` y `evento_id`.
2. La inscripción existe.
3. El evento existe.
4. La inscripción corresponde al evento enviado.
5. No existe un check-in `EXITOSO` previo (→ `DUPLICADO`).
6. La inscripción está en estado `CONFIRMADA` (`LISTA_ESPERA`, `CANCELADA` u otro estado → `RECHAZADO`).

### Google Sheets
Archivo independiente `EP11_Checkin`, hoja `Checkins`, con las columnas `checkin_id`, `inscripcion_id`, `evento_id`, `usuario_id`, `fecha_checkin`, `resultado`, `detalle`. Cada intento (exitoso, duplicado o rechazado) queda registrado.

### Cambio de estado
En un check-in exitoso la inscripción pasa de `CONFIRMADA` a `ASISTIO` (se actualiza solo esa fila, por `inscripcion_id`) y se actualiza `fecha_actualizacion`. Como `ASISTIO` sigue ocupando el cupo, WF05, WF06 y WF07 lo cuentan como cupo ocupado.

### Mecanismo contra el check-in duplicado
Antes de registrar, WF11 lee el historial de `Checkins` y busca un `EXITOSO` para esa inscripción. Si existe, registra un `DUPLICADO`, **no** crea otro check-in válido y **no** vuelve a modificar la inscripción.

### Integración con WF09
Tras un check-in exitoso, WF11 prepara el mensaje y ejecuta WF09 (Execute Sub-workflow), que lo envía por Gmail y Telegram. Si la notificación falla, el check-in ya registrado igual responde éxito.

## Variables de entorno

Ver [.env.example](.env.example). El frontend es estático y solo necesita la URL base del backend, que se define en `frontend/js/app.js` (`N8N_BASE_URL`) y `frontend/js/chat.js`. Las credenciales (Google OAuth, Gmail, Telegram y Gemini) **se configuran dentro de n8n y no se guardan en el repositorio**.

## Cómo ejecutar el proyecto

Pasos completos en [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md). Resumen:

1. Ejecutar n8n en Docker con `WEBHOOK_URL` apuntando a la URL pública.
2. Exponerlo con `ngrok http 5678 --url <dominio-estatico>`.
3. Importar los workflows de `n8n/` y asignar las credenciales (Google Sheets, Gmail, Telegram, Gemini); publicar cada workflow.
4. Crear los archivos de Google Sheets (`docs/GOOGLE_SHEETS.md`).
5. Ajustar `N8N_BASE_URL` en `frontend/js/app.js` y `frontend/js/chat.js`, y desplegar la carpeta `frontend/` en Vercel.

## Estado del proyecto

Detalle de pruebas en [docs/PRUEBAS.md](docs/PRUEBAS.md).

**Probado en vivo (n8n real, Google Sheets, Telegram y Gmail):** catálogo con cupos reales y filtros; registro, inicio y cierre de sesión; vinculación de Telegram (con código, y rechazo del código ya usado); inscripción con control de duplicados, evento pasado, sesión inválida y Telegram no vinculado; correo y mensaje de Telegram de una inscripción; check-in (éxito, duplicado y los tres rechazos); chat del asistente.

**Lógica verificada con datos simulados, sin ejecución en vivo:** WF07 (reasignación), WF08 (recordatorios) y las acciones `consultar`, `actualizar` y `desactivar` de WF01.

## Limitaciones conocidas

- **Backend dependiente de un computador personal.** La página solo funciona con Docker, n8n y ngrok encendidos.
- **WF04** solo implementa la creación de eventos (siempre en `BORRADOR`). Faltan READ, UPDATE y CANCEL/CLOSE, y la hoja `Auditoria_Eventos`.
- **WF06** solo implementa la creación. Faltan consultar las inscripciones del usuario, actualizarlas y **cancelarlas**, y la hoja `Auditoria_Inscripciones`.
- **WF01:** no existe la hoja `Auditoria_Usuarios`. La interfaz no tiene pantalla de perfil.
- **WF02:** no hay un endpoint independiente de validación de sesión (lo hacen WF03 y WF06) y las sesiones vencidas no pasan automáticamente a `EXPIRADA`. Los nombres de columna difieren de los del PDF (`sesion_id` en la hoja lleva un espacio final, `token`, `fecha_inicio`, `fecha_expiracion`).
- **Hash de contraseñas:** MD5 con sal (ver arriba).
- **WF10:** `Conversaciones` guarda una fila por mensaje (no una por conversación) y no guarda `usuario_id`. Depende de la disponibilidad de Gemini (puede responder 503; el nodo reintenta 3 veces).
- **Sesión del frontend** solo en memoria.
- **Google OAuth:** la app está en producción sin verificar (máximo 100 usuarios); si se revocan los permisos hay que reconectar las credenciales en n8n.
- El plan gratuito de ngrok permite 20.000 peticiones al mes.

## Autor

**Oscar Mora** — Proyecto académico desarrollado para Campuslands.