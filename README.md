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

> ⚠️ Actualmente el frontend utiliza el endpoint local de n8n para consultar el catálogo. Por esta razón, la integración frontend → n8n está validada en el entorno local de desarrollo, pero el frontend publicado en Vercel todavía requiere una URL pública de n8n para funcionar desde computadores externos.

---

# 🏗️ Arquitectura general

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
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
       Google Sheets             Gmail              Gemini AI
       Persistencia            Notificaciones        Asistente

📁 Estructura del proyecto
EventPass/
│
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   └── assets/
│
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
│   └── WF10_eventpass_assistant.json
│
├── docs/
├── .env.example
└── README.md

🛠️ Tecnologías utilizadas
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
🔄 Workflows
WF01 — Usuarios CRUD
Archivo: WF01_usuarios_crud.json
Trigger: Webhook
Persistencia: EP01_Usuarios
Responsabilidad:
- Crear usuarios.
- Consultar usuarios.
- Actualizar información.
- Desactivar usuarios mediante eliminación lógica.
- Registrar auditoría.
Datos principales
Hoja Usuarios:
- usuario_id
- nombre
- email_normalizado
- password_hash
- password_salt
- estado
- fecha_registro
- fecha_actualizacion
Hoja Auditoria_Usuarios:
- auditoria_id
- usuario_id
- accion
- fecha
- resultado
- detalle
WF02 — Autenticación y sesiones
Archivo: WF02_auth_sesiones.json
Trigger: Webhook
Persistencia: EP02_Sesiones
Responsabilidad:
- Login.
- Validación de credenciales.
- Creación de sesión.
- Validación de sesión.
- Cierre de sesión.
- Control de expiración.
El sistema utiliza password_hash y password_salt para la validación de contraseñas.
Las sesiones contienen:
- sesion_id
- usuario_id
- token
- fecha_inicio
- fecha_expiracion
- estado
WF03 — Vinculación con Telegram
Archivo: WF03_vinculacion_telegram.json
Persistencia: EP03_Telegram
Hojas:
- Codigos_Vinculacion
- Vinculaciones
El diseño contempla códigos temporales de vinculación y almacenamiento de la relación entre usuario y Telegram.
⚠️ La integración completa con Telegram no quedó finalizada durante el desarrollo. Por esta razón, este README no presenta la vinculación Telegram como una funcionalidad completamente operativa.

WF04 — Administración de eventos
Archivo: WF04_eventos_crud.json
Trigger: n8n Form Trigger
Persistencia: EP04_Eventos
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
Hoja Eventos:
- evento_id
- nombre
- categoria
- descripcion
- fecha
- hora
- lugar
- capacidad
- imagen_url
- organizador
- estado
- fecha_creacion
- fecha_actualizacion
Estados utilizados:
- BORRADOR
- PUBLICADO
- CERRADO
- CANCELADO
WF05 — Catálogo público
Archivo: WF05_catalogo_publico.json
Trigger: Webhook
Persistencia: EP05_Catalogo_Log
Endpoint local:
http://localhost:5678/webhook/catalogo
Responsabilidad:
- Consultar eventos.
- Filtrar por categoría.
- Consultar disponibilidad.
- Mostrar únicamente eventos publicados.
- Calcular cupos disponibles.
- Registrar consultas.
La disponibilidad se calcula mediante:
cupos disponibles =
capacidad del evento - inscripciones CONFIRMADAS

Prueba realizada
La llamada local al endpoint respondió correctamente y calculó:
{
  "cupos_confirmados": 1,
  "cupos_disponibles": 0
}

para el evento de prueba con capacidad 1.
⚠️ Durante la última validación se detectó que el endpoint estaba devolviendo solamente el primer evento publicado. El workflow requiere una revisión adicional para que el catálogo devuelva correctamente todos los eventos publicados.

WF06 — Inscripciones
Archivo: WF06_inscripciones_crud.json
Trigger: Webhook
Persistencia: EP06_Inscripciones
Responsabilidad:
- Crear inscripción.
- Validar sesión.
- Validar evento.
- Verificar cupos.
- Evitar inscripciones activas duplicadas.
- Asignar confirmación o lista de espera.
- Preparar notificaciones.
- Responder mediante HTTP.
Estados de inscripción
- CONFIRMADA
- LISTA_ESPERA
- CANCELADA
Idempotencia
Se controla la combinación:
usuario_id + evento_id

para evitar que un usuario tenga dos inscripciones activas al mismo evento.
Prueba realizada
Se comprobó:
- Creación de inscripción.
- Detección de inscripción duplicada.
- Asignación a lista de espera cuando el evento está lleno.
WF07 — Reasignación automática de lista de espera
Archivo: WF07_reasignacion_lista_espera.json
Trigger: Schedule Trigger
Persistencia: EP07_Reasignaciones
Responsabilidad:
- Revisar periódicamente eventos.
- Detectar cupos disponibles.
- Promover usuarios de la lista de espera.
- Mantener el orden de llegada.
La prioridad se basa en la fecha de inscripción.
Se realizó una prueba de reasignación correctamente.
WF08 — Recordatorios
Archivo: WF08_recordatorios.json
Trigger: Schedule Trigger
Persistencia: EP08_Recordatorios
Responsabilidad:
- Identificar eventos próximos.
- Generar recordatorios.
- Evitar duplicación mediante clave de idempotencia.
- Preparar el envío de notificaciones.
El workflow fue configurado para ejecutarse periódicamente y se realizó una prueba de recordatorio de 24 horas.
WF09 — Servicio central de notificaciones
Archivo: WF09_notificaciones.json
Trigger: Execute Workflow
Persistencia: EP09_Notificaciones
Responsabilidad:
- Centralizar notificaciones.
- Consultar información del usuario.
- Enviar correo electrónico.
- Registrar resultado del canal.
- Actualizar el estado del envío.
Gmail
La integración con Gmail fue configurada y probada correctamente.
Estados utilizados:
- PENDIENTE
- ENVIADO
- ERROR
- NO_APLICA
Telegram
La estructura contempla el estado independiente del canal Telegram, pero la integración completa con Telegram no fue finalizada.
WF09 — Workflow adicional de prueba
Archivo: WF09_prueba.json
Workflow adicional utilizado durante las pruebas del proyecto.
WF10 — EventPass Assistant
Archivo: WF10_eventpass_assistant.json
Trigger: Chat Trigger
IA: Gemini
Persistencia: EP10_Soporte
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
Restricciones
El asistente NO puede:
- Crear usuarios.
- Iniciar sesión.
- Cerrar sesión.
- Crear inscripciones.
- Cancelar inscripciones.
- Modificar eventos.
- Cambiar capacidades.
- Modificar estados del negocio.
- Ejecutar operaciones administrativas.
- Modificar información en Google Sheets.
Su función es exclusivamente informativa.
📊 Datos de prueba
Actualmente existen 6 eventos en EP04_Eventos → Eventos.
Evento	Categoría	Estado
Festival de Tecnología Bucaramanga	Tecnología	PUBLICADO
Feria de Emprendimiento Santander	Entretenimiento	PUBLICADO
Festival Cultural Bucaramanga	Cultura	PUBLICADO
Carrera Deportiva EventPass	Deportes	PUBLICADO
Taller de Innovación	Educación	PUBLICADO
Encuentro Cultural EventPass	Cultura	CERRADO


El primer evento tiene:
- Capacidad: 1
- Inscripciones confirmadas: 1
- Cupos disponibles: 0
Por lo tanto, permite comprobar el escenario de evento lleno.
Los demás eventos publicados permiten utilizar escenarios de disponibilidad.
🗃️ Persistencia en Google Sheets
El proyecto utiliza archivos independientes de Google Sheets por dominio:
Dominio	Archivo
Usuarios	EP01_Usuarios
Sesiones	EP02_Sesiones
Telegram	EP03_Telegram
Eventos	EP04_Eventos
Catálogo	EP05_Catalogo_Log
Inscripciones	EP06_Inscripciones
Reasignaciones	EP07_Reasignaciones
Recordatorios	EP08_Recordatorios
Notificaciones	EP09_Notificaciones
Soporte	EP10_Soporte


🔐 Variables de entorno
Archivo:
.env.example
# ==========================================
# EventPass - Variables de entorno
# ==========================================

# n8n
N8N_BASE_URL=http://localhost:5678

# Webhooks
N8N_CATALOGO_WEBHOOK=/webhook/catalogo
N8N_INSCRIPCIONES_WEBHOOK=/webhook/inscripciones

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

Las credenciales reales no se almacenan en el repositorio.
🔗 Comunicación Frontend → n8n
El frontend utiliza JavaScript para consultar el catálogo:
const API_CATALOGO = "http://localhost:5678/webhook/catalogo";

La aplicación realiza una petición HTTP mediante fetch() y procesa la respuesta JSON.
El frontend contempla:
- Carga de eventos.
- Manejo de respuesta.
- Manejo de errores.
- Renderizado de tarjetas de eventos.
Estado actual
La comunicación está validada en desarrollo local:
Frontend local
      ↓
localhost:5678
      ↓
n8n
      ↓
Google Sheets

Sin embargo, el frontend publicado en Vercel todavía utiliza localhost:5678.
Por esta razón, para que un usuario externo pueda utilizar el sistema desde Vercel, es necesario exponer n8n mediante una URL pública y actualizar la variable API_CATALOGO.
🤖 Idempotencia
La idempotencia se aplica principalmente en las inscripciones.
La combinación:
usuario_id + evento_id

permite detectar si ya existe una inscripción activa para el mismo usuario y evento.
También se utilizan claves de idempotencia en el sistema de recordatorios y notificaciones.
🎫 Lista de espera
Cuando un evento no tiene cupos disponibles, la inscripción puede quedar en:
LISTA_ESPERA

La reasignación se realiza mediante WF07 respetando el orden de inscripción.
Cuando se libera un cupo, el usuario con mayor prioridad puede pasar a:
CONFIRMADA

📧 Servicio de notificaciones
WF09 funciona como servicio central de notificaciones.
Los workflows que necesitan notificar pueden enviar la información al servicio central.
Gmail fue configurado y probado.
El resultado de los canales se registra de manera independiente para permitir manejar errores.
🧠 Asistente IA
EventPass Assistant utiliza Gemini para responder consultas informativas.
El asistente tiene una política explícita para evitar modificaciones de datos.
Si el usuario solicita realizar una operación de negocio, el asistente debe indicar que solamente puede brindar información y que la operación debe realizarse mediante las funciones correspondientes de EventPass.
🚀 Ejecución local
1. Ejecutar n8n
La instancia utilizada durante el desarrollo está disponible en:
http://localhost:5678

2. Importar workflows
Los archivos JSON ubicados en:
n8n/

pueden ser importados en la instancia de n8n.
3. Ejecutar frontend
Desde la carpeta frontend/ se puede utilizar un servidor local:
python3 -m http.server 5500

Luego abrir:
http://127.0.0.1:5500

☁️ Despliegue
GitHub
Repositorio:
https://github.com/OscarMoraG/EventPass
Vercel
Frontend:
https://eventpass-frontend-theta.vercel.app
El proyecto de Vercel está conectado al repositorio de GitHub y utiliza la rama principal.
⚠️ Estado actual del proyecto
Implementado y probado
- Estructura del frontend.
- Publicación del frontend en Vercel.
- Persistencia en Google Sheets.
- WF01 Usuarios.
- WF02 Sesiones.
- WF04 creación de eventos.
- WF05 consulta de catálogo local.
- Cálculo de cupos.
- WF06 inscripción.
- Idempotencia de inscripción.
- Lista de espera.
- WF07 reasignación.
- WF08 recordatorios.
- WF09 Gmail.
- WF10 asistente IA.
- Seis eventos de prueba.
- Múltiples categorías.
- Evento lleno.
- Evento cerrado.
Pendiente o con limitación
- Exponer n8n mediante una URL pública para que el frontend de Vercel pueda consumirlo desde computadores externos.
- Revisar WF05 para que el catálogo público devuelva correctamente todos los eventos publicados.
- Completar la integración real con Telegram.
- Completar y validar todas las operaciones CRUD de WF04/WF06 según el alcance completo del documento académico.
Estas limitaciones se documentan de forma explícita para evitar presentar como terminadas funcionalidades que todavía requieren validación.
📚 Archivos de workflows entregados
WF01_usuarios_crud.json
WF02_auth_sesiones.json
WF03_vinculacion_telegram.json
WF04_eventos_crud.json
WF05_catalogo_publico.json
WF06_inscripciones_crud.json
WF07_reasignacion_lista_espera.json
WF08_recordatorios.json
WF09_notificaciones.json
WF09_prueba.json
WF10_eventpass_assistant.json

👨‍💻 Autor
Oscar Mora
Proyecto académico desarrollado para Campuslands.
📄 Licencia
Proyecto desarrollado con fines académicos.

**Importante:** esta versión es deliberadamente honesta con el estado actual. No dice que Telegram, el CRUD completo ni la conexión Vercel→n8n estén terminados cuando no lo están. Eso es mucho mejor que entregar un README que contradiga lo que el profesor pueda probar.