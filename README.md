# EventPass

## 1. Nombre del proyecto

EventPass

## 2. Estudiante

Oscar Mora

## 3. Descripción

EventPass es una aplicación web para la gestión de eventos, desarrollada como proyecto integrador utilizando frontend, n8n, Google Sheets, Gmail e inteligencia artificial.

La aplicación permite consultar públicamente eventos, consultar disponibilidad, gestionar usuarios, autenticación, inscripciones, cupos, lista de espera, reasignaciones, recordatorios, notificaciones y soporte conversacional.

La lógica principal del negocio se ejecuta mediante workflows de n8n y la persistencia académica se realiza mediante archivos independientes de Google Sheets.

## 4. Arquitectura general

La arquitectura del proyecto sigue el siguiente esquema:

```text
Frontend
   ↓
HTTP / Chat
   ↓
n8n
   ↓
Reglas de negocio
   ↓
Google Sheets
   ↓
Gmail / Telegram / IA

El frontend funciona como cliente y n8n concentra las validaciones, reglas de negocio, persistencia, estados, idempotencia e integraciones.
5. Tecnologías utilizadas
- HTML5
- CSS3
- JavaScript
- n8n
- Google Sheets
- Gmail
- Google Gemini
- GitHub
- Vercel
6. Estructura del proyecto
EventPass/
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   └── assets/
├── n8n/
├── docs/
├── .env.example
└── README.md

7. Workflows
WF01 - Usuarios CRUD
Archivo:
WF01_usuarios_crud.json
Trigger:
Webhook
Responsabilidad:
- Crear usuario.
- Consultar perfil.
- Actualizar perfil.
- Desactivar cuenta.
- Manejar eliminación lógica.
- Generar usuario_id.
- Generar hash y salt de contraseña.
- Persistir información en Google Sheets.
- Registrar auditoría de las operaciones.
Google Sheet:
EP01_Usuarios
Hojas:
- Usuarios
- Auditoria_Usuarios
WF02 - Autenticación y sesiones
Archivo:
WF02_auth_sesiones.json
Trigger:
Webhook
Responsabilidad:
- Login.
- Logout.
- Validación de sesión.
- Verificación de contraseña mediante hash + salt.
- Generación de token de sesión.
- Registro de sesión.
- Validación de expiración.
- Actualización del estado de sesión.
- Respuesta HTTP en JSON.
Google Sheet:
EP02_Sesiones
Hoja:
Sesiones
Estados:
- ACTIVA
- CERRADA
- EXPIRADA
WF03 - Vinculación con Telegram
Archivo:
WF03_vinculacion_telegram.json
Triggers requeridos por la especificación:
- Webhook
- Telegram Trigger
Responsabilidad:
- Generar código temporal de vinculación.
- Asociar código al usuario.
- Validar vigencia.
- Procesar el código recibido desde Telegram.
- Registrar chat_id.
- Controlar reutilización del código.
Google Sheet:
EP03_Telegram
Hojas:
- Codigos_Vinculacion
- Vinculaciones
Estado de implementación:
La estructura y persistencia fueron preparadas. La integración completa con Telegram queda pendiente de finalizar.
WF04 - Eventos CRUD
Archivo:
WF04_eventos_crud.json
Trigger:
Form Trigger
Responsabilidad:
- Crear eventos.
- Consultar eventos.
- Actualizar eventos.
- Cerrar eventos.
- Cancelar eventos.
- Manejar estados de los eventos.
Estados:
- BORRADOR
- PUBLICADO
- CERRADO
- CANCELADO
Google Sheet:
EP04_Eventos
Hoja:
Eventos
WF05 - Catálogo público
Archivo:
WF05_catalogo_publico.json
Trigger:
Webhook
Endpoint:
/webhook/catalogo
Responsabilidad:
- Consultar eventos publicados.
- Filtrar por evento.
- Filtrar por categoría.
- Consultar inscripciones.
- Calcular cupos confirmados.
- Calcular cupos disponibles.
- Registrar consultas del catálogo.
Google Sheet:
EP05_Catalogo_Log
Hoja:
Consultas_Catalogo
Este workflow se encuentra integrado con el frontend mediante HTTP.
La integración fue probada utilizando el endpoint:
http://localhost:5678/webhook/catalogo

WF06 - Inscripciones CRUD
Archivo:
WF06_inscripciones_crud.json
Trigger:
Webhook
Responsabilidad:
- Crear inscripciones.
- Validar sesión.
- Validar evento.
- Validar capacidad.
- Controlar inscripciones duplicadas.
- Confirmar inscripción cuando existe cupo.
- Enviar usuario a lista de espera cuando el evento está lleno.
- Generar orden de espera.
- Registrar la inscripción.
- Generar notificación.
Estados utilizados:
- CONFIRMADA
- LISTA_ESPERA
- CANCELADA
Google Sheet:
EP06_Inscripciones
Hojas:
- Inscripciones
- Auditoria_Inscripciones
WF07 - Reasignación automática de lista de espera
Archivo:
WF07_reasignacion_lista_espera.json
Trigger:
Schedule Trigger
Responsabilidad:
- Revisar periódicamente eventos.
- Detectar cupos liberados.
- Consultar usuarios en lista de espera.
- Ordenar usuarios según antigüedad de inscripción.
- Promover usuarios respetando el orden de espera.
- Actualizar la inscripción.
- Registrar la reasignación.
- Generar notificación.
Google Sheet:
EP07_Reasignaciones
Hoja:
Reasignaciones
WF08 - Recordatorios automáticos
Archivo:
WF08_recordatorios.json
Trigger:
Schedule Trigger
Responsabilidad:
- Detectar eventos próximos.
- Consultar inscripciones confirmadas.
- Calcular fechas de recordatorio.
- Evitar recordatorios duplicados.
- Registrar recordatorios.
- Utilizar una clave de idempotencia.
Google Sheet:
EP08_Recordatorios
Hoja:
Recordatorios
Estados:
- PENDIENTE
- ENVIADO
- ERROR
- OMITIDO
WF09 - Servicio central de notificaciones
Archivo:
WF09_notificaciones.json
Trigger:
Execute Sub-workflow Trigger
Responsabilidad:
- Centralizar las notificaciones.
- Registrar la notificación.
- Consultar información del usuario.
- Enviar notificaciones mediante Gmail.
- Preparar integración de Telegram.
- Registrar el resultado de cada canal.
- Manejar errores por canal.
- Utilizar claves de idempotencia.
Google Sheet:
EP09_Notificaciones
Hoja:
Notificaciones
Estados de canal:
- PENDIENTE
- ENVIADO
- ERROR
- NO_APLICA
La integración Gmail fue configurada y probada correctamente.
La integración Telegram queda pendiente de finalizar.
WF10 - EventPass Assistant
Archivo:
WF10_eventpass_assistant.json
Trigger:
Chat Trigger
Responsabilidad:
Ofrecer soporte conversacional sobre:
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
Restricciones:
El asistente es únicamente informativo.
No puede:
- Crear usuarios.
- Iniciar sesión.
- Cerrar sesión.
- Crear inscripciones.
- Cancelar inscripciones.
- Modificar eventos.
- Cambiar capacidades o cupos.
- Modificar estados del negocio.
- Modificar información de Google Sheets.
Google Sheets:
EP10_Soporte
Hojas:
- Conversaciones
- Mensajes
8. Persistencia
Cada dominio principal utiliza un archivo independiente de Google Sheets:
- EP01_Usuarios
- EP02_Sesiones
- EP03_Telegram
- EP04_Eventos
- EP05_Catalogo_Log
- EP06_Inscripciones
- EP07_Reasignaciones
- EP08_Recordatorios
- EP09_Notificaciones
- EP10_Soporte
El frontend no se conecta directamente a Google Sheets.
Toda lectura o escritura de información se realiza mediante n8n.
9. Comunicación Frontend → n8n
El frontend utiliza JavaScript para realizar solicitudes HTTP hacia los Webhooks de n8n.
Catálogo público
Endpoint:
/webhook/catalogo

En desarrollo local:
http://localhost:5678/webhook/catalogo

El frontend recibe la información procesada por n8n y muestra:
- Nombre del evento.
- Categoría.
- Lugar.
- Fecha.
- Hora.
- Cupos disponibles.
10. Estados principales
Usuarios
ACTIVO
INACTIVO

Eventos
BORRADOR
PUBLICADO
CERRADO
CANCELADO

Inscripciones
CONFIRMADA
LISTA_ESPERA
CANCELADA

Sesiones
ACTIVA
CERRADA
EXPIRADA

Recordatorios
PENDIENTE
ENVIADO
ERROR
OMITIDO

Notificaciones
PENDIENTE
ENVIADO
ERROR
NO_APLICA

11. Hashing de contraseñas
Las contraseñas no se almacenan directamente.
El proceso utiliza un salt y un mecanismo de hashing antes de almacenar la información en Google Sheets.
Durante la autenticación se utiliza el hash almacenado junto con el salt para verificar la contraseña.
12. Manejo de sesiones
Las sesiones utilizan un identificador de sesión y un token.
La sesión contiene información como:
- Identificador de sesión.
- Usuario asociado.
- Token.
- Fecha de inicio.
- Fecha de expiración.
- Estado.
Una sesión no debe considerarse válida si:
- No existe.
- Está cerrada.
- Está expirada.
- Pertenece a un usuario inactivo.
13. Idempotencia
EventPass utiliza controles de idempotencia para evitar operaciones duplicadas.
En las inscripciones se verifica si el usuario ya posee una inscripción activa para el mismo evento.
Los recordatorios utilizan una clave de idempotencia para evitar enviar repetidamente el mismo recordatorio.
14. Lista de espera
Cuando un evento alcanza su capacidad máxima, las nuevas inscripciones pasan a:
LISTA_ESPERA

Cada usuario recibe un orden de espera.
Cuando se libera un cupo, WF07 revisa la lista y promueve al usuario que lleva más tiempo esperando.
El orden de promoción respeta la fecha de inscripción.
15. Servicio central de notificaciones
WF09 centraliza las notificaciones generadas por otros workflows.
El servicio registra:
- Usuario.
- Tipo.
- Título.
- Mensaje.
- Evento.
- Inscripción.
- Fecha.
- Estado de Gmail.
- Estado de Telegram.
- Errores por canal.
- Clave de idempotencia.
El resultado de cada canal debe poder registrarse independientemente.
16. Asistente IA
El asistente de EventPass utiliza un modelo de IA para responder consultas informativas.
Puede responder preguntas relacionadas con eventos y el funcionamiento de la plataforma.
El asistente no puede realizar operaciones que modifiquen datos o estados del negocio.
17. Publicación
URL pública de Vercel
PENDIENTE DE PUBLICACIÓN

URL del repositorio GitHub
PENDIENTE

18. Ejecución local
El frontend puede ejecutarse utilizando Visual Studio Code con Live Server.
El frontend se encuentra dentro de:
frontend/

La automatización y lógica de negocio se ejecutan mediante n8n.
19. Seguridad y configuración
No se deben almacenar en el repositorio:
- API Keys.
- Tokens de Telegram.
- Credenciales OAuth.
- Secretos.
- Contraseñas reales.
- Archivos .env con información privada.
Debe existir un archivo:
.env.example

para documentar las variables de entorno requeridas cuando sean necesarias.
20. Estados de interfaz
La aplicación debe contemplar como mínimo los siguientes estados:
- Loading.
- Éxito.
- Error.
21. Datos de prueba
La especificación del proyecto requiere como mínimo:
- 6 eventos de prueba.
- Al menos 3 categorías.
- Un evento con cupos disponibles.
- Un evento lleno.
- Un evento próximo a realizarse.
- Un evento cancelado o cerrado.
22. Entregables
El repositorio debe contener como mínimo:
/
├── frontend/
├── n8n/
├── docs/
├── .env.example
└── README.md

Los workflows se entregan en formato JSON con los siguientes nombres:
WF01_usuarios_crud.json
WF02_auth_sesiones.json
WF03_vinculacion_telegram.json
WF04_eventos_crud.json
WF05_catalogo_publico.json
WF06_inscripciones_crud.json
WF07_reasignacion_lista_espera.json
WF08_recordatorios.json
WF09_notificaciones.json
WF10_eventpass_assistant.json

23. Autor
Oscar Mora
Proyecto académico EventPass.

### 🟦 Ahora mismo

Copia **todo el bloque anterior** y pégalo en:

```text
EventPass/README.md

Luego:
Ctrl + S
Y seguimos inmediatamente con .env.example y después GitHub → Vercel → entrega.