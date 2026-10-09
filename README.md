# EventPass

Sistema de gestión y consulta de eventos desarrollado para el proyecto de automatización con n8n de Campuslands.

## 👤 Estudiante

**Oscar Mora**

## 📌 Descripción

EventPass es una aplicación para la gestión de eventos, inscripción de usuarios, control de cupos, lista de espera, recordatorios, notificaciones y soporte conversacional mediante inteligencia artificial.

La solución utiliza **n8n** como motor principal de automatización y **Google Sheets** como capa de persistencia de datos. El frontend está desarrollado con HTML, CSS y JavaScript y se encuentra publicado en Vercel.

---

## 🌐 URLs

### Frontend

**Vercel:**  
https://eventpass-frontend-theta.vercel.app

### Repositorio

**GitHub:**  
https://github.com/OscarMoraG/EventPass

### n8n local

La instancia utilizada durante el desarrollo se ejecuta localmente:

`http://localhost:5678`

> ⚠️ Actualmente, el frontend utiliza el endpoint local de n8n para consultar el catálogo. Por esta razón, la integración frontend → n8n está validada en el entorno local de desarrollo, pero el frontend publicado en Vercel todavía requiere una URL pública de n8n para funcionar desde computadores externos.

---

## 🏗️ Arquitectura general

```text
                        ┌─────────────────────┐
                        │      Frontend       │
                        │ HTML / CSS / JS     │
                        │      Vercel         │
                        └──────────┬──────────┘
                                   │
                                   │ HTTP
                                   ▼
                        ┌─────────────────────┐
                        │        n8n          │
                        │ Automatizaciones    │
                        └──────────┬──────────┘
                                   │
                 ┌─────────────────┼──────────────────┐
                 │                 │                  │
                 ▼                 ▼                  ▼
           Google Sheets         Gmail             Gemini AI
            Persistencia      Notificaciones       Asistente
```

La aplicación web no se conecta directamente a Google Sheets. Las lecturas y escrituras de información se realizan a través de workflows de n8n.

## 📁 Estructura del proyecto

```text
EventPass/
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   └── assets/
├── n8n/
│   ├── WF01_usuarios_crud.json
│   ├── WF02_auth_sesiones.json
│   ├── WF03_vinculacion_telegram.json
│   ├── WF04_eventos_crud.json
│   ├── WF05_catalogo_publico.json
│   ├── WF06_inscripciones_crud.json
│   ├── WF07_reasignacion_lista_espera.json
│   ├── WF08_recordatorios.json
│   ├── WF09_notificaciones.json
│   ├── WF09_prueba.json
│   ├── WF10_eventpass_assistant.json
│   └── WF11_checkin_digital.json
├── docs/
├── .env.example
└── README.md
```

> El archivo del workflow de check-in debe exportarse y guardarse con el nombre `WF11_checkin_digital.json` dentro de `n8n/`. Verifica que el nombre final del archivo en el repositorio coincida exactamente.

## 🛠️ Tecnologías utilizadas

- HTML5
- CSS3
- JavaScript
- n8n
- Google Sheets
- Gmail
- Gemini AI
- Git
- GitHub
- Vercel

---

## 🔄 Workflows

### WF01 — Usuarios CRUD

- **Archivo:** `WF01_usuarios_crud.json`
- **Trigger:** Webhook
- **Persistencia:** `EP01_Usuarios`

Responsabilidades:
- Crear usuarios.
- Consultar usuarios.
- Actualizar información.
- Desactivar usuarios mediante eliminación lógica.
- Registrar auditoría.

Hoja `Usuarios`:
- `usuario_id`
- `nombre`
- `email_normalizado`
- `password_hash`
- `password_salt`
- `estado`
- `fecha_registro`
- `fecha_actualizacion`

Hoja `Auditoria_Usuarios`:
- `auditoria_id`
- `usuario_id`
- `accion`
- `fecha`
- `resultado`
- `detalle`

### WF02 — Autenticación y sesiones

- **Archivo:** `WF02_auth_sesiones.json`
- **Trigger:** Webhook
- **Persistencia:** `EP02_Sesiones`

Responsabilidades:
- Login.
- Validación de credenciales.
- Creación de sesión.
- Validación de sesión.
- Cierre de sesión.
- Control de expiración.

El sistema utiliza `password_hash` y `password_salt` para la validación de contraseñas.

Las sesiones contienen:
- `sesion_id`
- `usuario_id`
- `token`
- `fecha_inicio`
- `fecha_expiracion`
- `estado`

### WF03 — Vinculación con Telegram

- **Archivo:** `WF03_vinculacion_telegram.json`
- **Persistencia:** `EP03_Telegram`

Hojas:
- `Codigos_Vinculacion`
- `Vinculaciones`

El diseño contempla códigos temporales de vinculación y almacenamiento de la relación entre usuario y Telegram.

> ⚠️ La integración completa con Telegram no quedó finalizada durante el desarrollo. Por esta razón, este README no presenta la vinculación Telegram como una funcionalidad completamente operativa.

### WF04 — Administración de eventos

- **Archivo:** `WF04_eventos_crud.json`
- **Trigger:** n8n Form Trigger
- **Persistencia:** `EP04_Eventos`

El workflow permite administrar información de eventos mediante formulario.

Campos:
- Acción
- Nombre del evento
- Categoría
- Descripción
- Fecha
- Hora
- Lugar
- Capacidad
- URL de imagen
- Organizador

Hoja `Eventos`:
- `evento_id`
- `nombre`
- `categoria`
- `descripcion`
- `fecha`
- `hora`
- `lugar`
- `capacidad`
- `imagen_url`
- `organizador`
- `estado`
- `fecha_creacion`
- `fecha_actualizacion`

Estados utilizados:
- `BORRADOR`
- `PUBLICADO`
- `CERRADO`
- `CANCELADO`

### WF05 — Catálogo público

- **Archivo:** `WF05_catalogo_publico.json`
- **Trigger:** Webhook
- **Persistencia/log:** `EP05_Catalogo_Log`
- **Endpoint local:** `http://localhost:5678/webhook/catalogo`

Responsabilidades:
- Consultar eventos.
- Filtrar por categoría.
- Consultar disponibilidad.
- Mostrar únicamente eventos publicados.
- Calcular cupos disponibles.
- Registrar consultas.

La disponibilidad se calcula mediante:

```text
cupos disponibles = capacidad del evento - inscripciones CONFIRMADAS
```

Prueba realizada: la llamada local al endpoint respondió correctamente y calculó `cupos_confirmados: 1` y `cupos_disponibles: 0` para el evento de prueba con capacidad 1.

> ⚠️ Durante la última validación se detectó que el endpoint estaba devolviendo solamente el primer evento publicado. El workflow requiere una revisión adicional para que el catálogo devuelva correctamente todos los eventos publicados.

### WF06 — Inscripciones

- **Archivo:** `WF06_inscripciones_crud.json`
- **Trigger:** Webhook
- **Persistencia:** `EP06_Inscripciones`

Responsabilidades:
- Crear inscripción.
- Validar sesión.
- Validar evento.
- Verificar cupos.
- Evitar inscripciones activas duplicadas.
- Asignar confirmación o lista de espera.
- Preparar notificaciones.
- Responder mediante HTTP.

Estados de inscripción:
- `CONFIRMADA`
- `LISTA_ESPERA`
- `CANCELADA`

La idempotencia se controla mediante la combinación `usuario_id + evento_id` para evitar que un usuario tenga dos inscripciones activas al mismo evento.

Pruebas realizadas:
- Creación de inscripción.
- Detección de inscripción duplicada.
- Asignación a lista de espera cuando el evento está lleno.

### WF07 — Reasignación automática de lista de espera

- **Archivo:** `WF07_reasignacion_lista_espera.json`
- **Trigger:** Schedule Trigger
- **Persistencia:** `EP07_Reasignaciones`

Responsabilidades:
- Revisar periódicamente eventos.
- Detectar cupos disponibles.
- Promover usuarios de la lista de espera.
- Mantener el orden de llegada.

La prioridad se basa en la fecha de inscripción. Se realizó una prueba de reasignación correctamente.

### WF08 — Recordatorios

- **Archivo:** `WF08_recordatorios.json`
- **Trigger:** Schedule Trigger
- **Persistencia:** `EP08_Recordatorios`

Responsabilidades:
- Identificar eventos próximos.
- Generar recordatorios.
- Evitar duplicación mediante clave de idempotencia.
- Preparar el envío de notificaciones.

El workflow fue configurado para ejecutarse periódicamente y se realizó una prueba de recordatorio de 24 horas.

### WF09 — Servicio central de notificaciones

- **Archivo:** `WF09_notificaciones.json`
- **Trigger:** When Executed by Another Workflow (Execute Sub-workflow Trigger)
- **Persistencia:** `EP09_Notificaciones`, hoja `Notificaciones`

Responsabilidades:
- Centralizar notificaciones.
- Consultar información del usuario.
- Enviar correo electrónico.
- Registrar resultado del canal.
- Actualizar el estado del envío.

La integración con Gmail fue configurada y probada correctamente.

Estados utilizados:
- `PENDIENTE`
- `ENVIADO`
- `ERROR`
- `NO_APLICA`

La estructura contempla el estado independiente del canal Telegram, pero la integración completa con Telegram no fue finalizada. Por lo tanto, no se afirma que el envío por Telegram esté operativo.

### WF09 — Workflow adicional de prueba

- **Archivo:** `WF09_prueba.json`

Workflow adicional utilizado durante las pruebas del proyecto.

### WF10 — EventPass Assistant

- **Archivo:** `WF10_eventpass_assistant.json`
- **Trigger:** Chat Trigger
- **IA:** Gemini
- **Persistencia:** `EP10_Soporte`

El asistente funciona como soporte informativo.

Puede responder sobre:
- Eventos.
- Categorías.
- Fechas.
- Horarios.
- Lugares.
- Disponibilidad.
- Lista de espera.
- Funcionamiento de EventPass.
- Vinculación de Telegram.
- Estados de inscripción.

Restricciones: el asistente no puede crear usuarios, iniciar o cerrar sesión, crear o cancelar inscripciones, modificar eventos, cambiar capacidades, modificar estados del negocio, ejecutar operaciones administrativas ni modificar información en Google Sheets. Su función es exclusivamente informativa.

### WF11 — Check-in digital (examen)

- **Archivo esperado:** `n8n/WF11_checkin_digital.json`
- **Trigger:** Webhook
- **Método HTTP:** `POST`
- **Ruta local de prueba:** `http://localhost:5678/webhook-test/checkin`
- **Ruta local de producción:** `http://localhost:5678/webhook/checkin`
- **Persistencia de inscripciones:** `EP06_Inscripciones`, hoja `Inscripciones`
- **Persistencia de eventos:** `EP04_Eventos`, hoja `Eventos`
- **Registro de check-ins:** `EP11_Checkin`, hoja `Checkins`
- **Notificaciones:** invoca el workflow `WF09_notificaciones`

El workflow amplía EventPass con un flujo para registrar el ingreso de una persona a un evento.

#### Entrada

La solicitud HTTP `POST` recibe un JSON con los identificadores de la inscripción y el evento:

```json
{
  "inscripcion_id": "INS-IDENTIFICADOR",
  "evento_id": "EVT-IDENTIFICADOR"
}
```

Los identificadores del ejemplo son ilustrativos. Para una prueba real se deben usar valores existentes en Google Sheets.

#### Validaciones previstas

1. Comprobar que se reciban `inscripcion_id` y `evento_id`.
2. Comprobar que la inscripción exista.
3. Comprobar que el evento exista.
4. Verificar que la inscripción corresponda al evento enviado.
5. Verificar que el estado de la inscripción sea `CONFIRMADA`.
6. Consultar el historial para detectar un check-in exitoso anterior.
7. Si las validaciones se cumplen, registrar el check-in y cambiar el estado de la inscripción a `ASISTIO`.

#### Estados de resultado

El registro de check-in contempla los siguientes resultados:

- `EXITOSO`: validaciones correctas y check-in autorizado.
- `DUPLICADO`: ya existe un check-in exitoso para la inscripción.
- `RECHAZADO`: la solicitud no supera las validaciones.

#### Hoja `EP11_Checkin` → `Checkins`

Columnas:
- `checkin_id`
- `inscripcion_id`
- `evento_id`
- `usuario_id`
- `fecha_checkin`
- `resultado`
- `detalle`

#### Respuestas HTTP

El workflow dispone de ramas para responder según el resultado: exitoso, duplicado o rechazado. La respuesta debe incluir el resultado y un mensaje entendible para el consumidor del endpoint.

#### Estado de validación

Durante el desarrollo se verificó que:
- El webhook recibió una solicitud de prueba.
- Los nodos de consulta encontraron la inscripción y el evento de prueba.
- El nodo de validación produjo el resultado `EXITOSO`.
- El nodo de actualización devolvió el estado `ASISTIO`.

La integración completa del registro en `EP11_Checkin`, la respuesta HTTP de cada rama, la idempotencia ante una segunda solicitud y el resultado final de la invocación de WF09 deben considerarse pendientes de una prueba integral de extremo a extremo hasta comprobarlos en la ejecución completa.

> ⚠️ Para considerar el check-in finalizado, ejecutar una prueba integral, confirmar que los datos de `EP11_Checkin` no se guarden como fórmulas, comprobar la respuesta HTTP y probar una segunda solicitud con la misma inscripción para verificar que no se genere un segundo check-in exitoso.

---

## 📊 Datos de prueba

Actualmente existen seis eventos en `EP04_Eventos` → `Eventos`.

| Evento | Categoría | Estado |
|---|---|---|
| Festival de Tecnología Bucaramanga | Tecnología | `PUBLICADO` |
| Feria de Emprendimiento Santander | Entretenimiento | `PUBLICADO` |
| Festival Cultural Bucaramanga | Cultura | `PUBLICADO` |
| Carrera Deportiva EventPass | Deportes | `PUBLICADO` |
| Taller de Innovación | Educación | `PUBLICADO` |
| Encuentro Cultural EventPass | Cultura | `CERRADO` |

El primer evento tiene capacidad 1, una inscripción confirmada y cero cupos disponibles. Esto permite comprobar el escenario de evento lleno. Los demás eventos publicados permiten utilizar escenarios de disponibilidad.

## 🗃️ Persistencia en Google Sheets

El proyecto utiliza archivos independientes de Google Sheets por dominio:

| Dominio | Archivo | Hoja(s) principal(es) |
|---|---|---|
| Usuarios | `EP01_Usuarios` | `Usuarios`, `Auditoria_Usuarios` |
| Sesiones | `EP02_Sesiones` | Sesiones |
| Telegram | `EP03_Telegram` | `Codigos_Vinculacion`, `Vinculaciones` |
| Eventos | `EP04_Eventos` | `Eventos` |
| Catálogo | `EP05_Catalogo_Log` | Registro de consultas |
| Inscripciones | `EP06_Inscripciones` | `Inscripciones` |
| Reasignaciones | `EP07_Reasignaciones` | Reasignaciones |
| Recordatorios | `EP08_Recordatorios` | Recordatorios |
| Notificaciones | `EP09_Notificaciones` | `Notificaciones` |
| Soporte | `EP10_Soporte` | Soporte |
| Check-in digital | `EP11_Checkin` | `Checkins` |

---

## 🔐 Variables de entorno

Archivo: `.env.example`

```dotenv
# ==========================================
# EventPass - Variables de entorno
# ==========================================

# n8n
N8N_BASE_URL=http://localhost:5678

# Webhooks
N8N_CATALOGO_WEBHOOK=/webhook/catalogo
N8N_INSCRIPCIONES_WEBHOOK=/webhook/inscripciones
N8N_CHECKIN_WEBHOOK=/webhook/checkin

# Google Sheets
GOOGLE_SHEETS_ID=

# Gmail
GMAIL_FROM=

# Telegram
TELEGRAM_BOT_TOKEN=

# IA
GEMINI_API_KEY=

# Frontend
FRONTEND_URL=http://127.0.0.1:5500
```

Las credenciales reales no se almacenan en el repositorio. Las variables anteriores documentan nombres y valores de ejemplo; su presencia en `.env.example` no significa que todas estén conectadas automáticamente al frontend o a n8n.

## 🔗 Comunicación Frontend → n8n

El frontend utiliza JavaScript para consultar el catálogo mediante una petición HTTP con `fetch()` y procesa la respuesta JSON. La interfaz contempla carga de eventos, manejo de respuestas, manejo de errores y renderizado de tarjetas de eventos.

Endpoint local del catálogo:

```javascript
const API_CATALOGO = "http://localhost:5678/webhook/catalogo";
```

Estado actual de la comunicación en desarrollo:

```text
Frontend local
      ↓ HTTP
localhost:5678
      ↓
n8n
      ↓
Google Sheets
```

El frontend publicado en Vercel todavía utiliza `localhost:5678`. Para que los usuarios externos puedan consumir los workflows desde Vercel, se requiere exponer n8n mediante una URL pública y actualizar la configuración del frontend. El endpoint de check-in documentado en WF11 también es local mientras n8n se ejecute en el equipo de desarrollo.

## 🤖 Idempotencia

La idempotencia se aplica principalmente en las inscripciones. La combinación `usuario_id + evento_id` permite detectar si ya existe una inscripción activa para el mismo usuario y evento.

También se utilizan claves de idempotencia en el sistema de recordatorios y notificaciones.

En WF11, la regla prevista es que una inscripción con un check-in exitoso previo no pueda generar otro check-in exitoso. Esta condición debe verificarse con una segunda solicitud real al endpoint.

## 🎫 Lista de espera

Cuando un evento no tiene cupos disponibles, la inscripción puede quedar en `LISTA_ESPERA`.

La reasignación se realiza mediante WF07 respetando el orden de inscripción. Cuando se libera un cupo, el usuario con mayor prioridad puede pasar a `CONFIRMADA`.

## 📧 Servicio de notificaciones

WF09 funciona como servicio central de notificaciones. Los workflows que necesitan notificar envían la información al servicio central.

Gmail fue configurado y probado. El resultado de los canales se registra de manera independiente para permitir manejar errores. La integración real con Telegram continúa pendiente y no se presenta como finalizada.

## 🧠 Asistente IA

EventPass Assistant utiliza Gemini para responder consultas informativas. El asistente tiene una política explícita para evitar modificaciones de datos.

Si el usuario solicita realizar una operación de negocio, el asistente debe indicar que solamente puede brindar información y que la operación debe realizarse mediante las funciones correspondientes de EventPass.

---

## 🚀 Ejecución local

### 1. Ejecutar n8n

La instancia utilizada durante el desarrollo está disponible en:

`http://localhost:5678`

### 2. Importar workflows

Los archivos JSON ubicados en `n8n/` pueden importarse en la instancia de n8n.

### 3. Ejecutar frontend

Desde la carpeta `frontend/`, se puede iniciar un servidor local:

```bash
python3 -m http.server 5500
```

Luego abrir:

`http://127.0.0.1:5500`

### 4. Probar el webhook de check-in

En n8n, abrir el workflow WF11 y seleccionar **Listen for test event**. Luego, desde una terminal, enviar una solicitud de prueba con identificadores existentes:

```bash
curl -X POST "http://localhost:5678/webhook-test/checkin" \
  -H "Content-Type: application/json" \
  -d '{
    "inscripcion_id": "INS-IDENTIFICADOR",
    "evento_id": "EVT-IDENTIFICADOR"
  }'
```

Reemplazar los valores de ejemplo por identificadores reales. La URL `webhook-test` solo funciona mientras el webhook está escuchando una solicitud de prueba. Para producción se requiere activar/publicar el workflow y utilizar `/webhook/checkin`.

---

## ☁️ Despliegue

### GitHub

Repositorio:  
https://github.com/OscarMoraG/EventPass

### Vercel

Frontend:  
https://eventpass-frontend-theta.vercel.app

El proyecto de Vercel está conectado al repositorio de GitHub y utiliza la rama principal. Después de subir nuevos cambios a la rama conectada, revisar el resultado del despliegue en Vercel.

---

## ⚠️ Estado actual del proyecto

### Implementado o probado durante el desarrollo

- Estructura del frontend.
- Publicación del frontend en Vercel.
- Persistencia en Google Sheets.
- WF01 Usuarios.
- WF02 Sesiones.
- WF04 creación de eventos mediante formulario.
- WF05 consulta local de catálogo y cálculo de cupos.
- WF06 inscripción.
- Idempotencia de inscripción.
- Lista de espera.
- WF07 reasignación.
- WF08 recordatorios.
- WF09 envío por Gmail.
- WF10 asistente IA.
- Seis eventos de prueba.
- Múltiples categorías.
- Escenarios de evento lleno y evento cerrado.
- WF11: recepción de solicitud de prueba, validación de una inscripción y un evento existentes, y actualización del estado a `ASISTIO`.

### Pendiente o con limitación

- Exponer n8n mediante una URL pública para que el frontend de Vercel pueda consumirlo desde computadores externos.
- Revisar WF05 para que el catálogo público devuelva correctamente todos los eventos publicados.
- Completar la integración real con Telegram.
- Completar y validar todas las operaciones CRUD de WF04/WF06 según el alcance completo del documento académico.
- Terminar la prueba integral de WF11: verificar el registro correcto en `EP11_Checkin`, respuestas HTTP de las tres ramas, caso duplicado, caso rechazado y resultado de la invocación de WF09.
- Confirmar que el archivo exportado de WF11 tenga el nombre exacto requerido en el repositorio.

Estas limitaciones se documentan de forma explícita para evitar presentar como terminadas funcionalidades que todavía requieren validación.

## 📚 Archivos de workflows

- `WF01_usuarios_crud.json`
- `WF02_auth_sesiones.json`
- `WF03_vinculacion_telegram.json`
- `WF04_eventos_crud.json`
- `WF05_catalogo_publico.json`
- `WF06_inscripciones_crud.json`
- `WF07_reasignacion_lista_espera.json`
- `WF08_recordatorios.json`
- `WF09_notificaciones.json`
- `WF09_prueba.json`
- `WF10_eventpass_assistant.json`
- `WF11_checkin_digital.json`

## 👨‍💻 Autor

**Oscar Mora**

Proyecto académico desarrollado para Campuslands.

## 📄 Licencia

Proyecto desarrollado con fines académicos.