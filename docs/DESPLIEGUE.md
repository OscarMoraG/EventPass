# Despliegue y ejecución

EventPass tiene dos partes: el **frontend** (estático, en Vercel) y el **backend** (n8n, que corre en un computador personal con Docker y se expone con ngrok).

## 1. Ejecutar n8n con Docker

Requisitos: Docker Desktop instalado.

```bash
docker run -d --name n8n --restart unless-stopped \
  -p 5678:5678 \
  -e GENERIC_TIMEZONE=America/Bogota \
  -e TZ=America/Bogota \
  -e WEBHOOK_URL=https://hydrant-supermom-raging.ngrok-free.dev/ \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

- `WEBHOOK_URL` debe ser la URL pública (HTTPS) con la que se expone n8n. Telegram la usa para entregar los mensajes del bot al Telegram Trigger.
- El volumen `n8n_data` guarda workflows, credenciales y ejecuciones. **No lo elimines.** Para respaldarlo:
  ```bash
  docker stop n8n
  docker run --rm -v n8n_data:/data -v "$HOME/Desktop":/backup alpine tar czf /backup/n8n_data_backup.tgz -C /data .
  docker start n8n
  ```
  La copia contiene credenciales: no se sube al repositorio.

## 2. Exponer n8n con ngrok

1. Crear una cuenta gratuita en ngrok y copiar el *authtoken* (es personal, no se comparte).
2. `ngrok config add-authtoken <TU_TOKEN>`
3. Reservar el dominio estático gratuito del panel de ngrok y ejecutar:
   ```bash
   ngrok http 5678 --url https://hydrant-supermom-raging.ngrok-free.dev
   ```
4. Dejar esa terminal abierta mientras se use el proyecto.

El plan gratuito muestra una página de aviso a los navegadores; por eso el frontend envía la cabecera `ngrok-skip-browser-warning` en todas sus peticiones.

> Si el túnel se apaga o el computador se suspende, el frontend mostrará el mensaje de error con el botón de reintentar.

## 3. Importar los workflows

1. En n8n: **Workflows → Import from File** con cada archivo de `n8n/`.
2. Crear y asignar las credenciales:
   - **Google Sheets account** (OAuth2) — usada por todos los workflows.
   - **Gmail account** (OAuth2) — WF09.
   - **Telegram account** (token del bot de BotFather) — WF03 y WF09.
   - **Google Gemini (PaLM) Api account** — WF10.
3. Revisar en cada nodo "Execute Workflow" que apunte a `WF09_notificaciones`.
4. **Publicar** cada workflow.
5. Chat Trigger de WF10: *Make Chat Publicly Available* activado, modo *Embedded Chat* y *Allowed Origins* = el dominio de Vercel.
6. Los webhooks (WF01, 02, 03, 05, 06, 11) tienen en *Allowed Origins (CORS)* el dominio de Vercel.

## 4. Google Sheets

Crear un archivo por dominio (ver [GOOGLE_SHEETS.md](GOOGLE_SHEETS.md)), con la hoja y los encabezados indicados. La hoja de vinculaciones debe llamarse exactamente `Vinculaciones`.

## 5. Google Cloud (OAuth)

Mientras la pantalla de consentimiento esté en estado **Prueba**, Google vence los permisos a los 7 días y hay que reconectar las credenciales. Para evitarlo, el proyecto pasó a **En producción** (sin verificar, límite de 100 usuarios), lo que requiere una URL de página principal y una de política de privacidad (`privacidad.html`). Publicar la app no tiene costo.

## 6. Telegram

1. En Telegram, hablar con **@BotFather** → `/newbot`.
2. Guardar el token **solo** en la credencial de n8n.
3. Si el token se expone, revocarlo con `/revoke`.

## 7. Frontend en Vercel

1. En `frontend/js/app.js` y `frontend/js/chat.js`, ajustar `N8N_BASE_URL` a la URL pública del backend.
2. Vercel está conectado al repositorio de GitHub y despliega la carpeta `frontend/` al hacer *push* a `main`.
3. Si la URL del backend cambia, hay que editar esas dos constantes, hacer *commit* y *push*.
