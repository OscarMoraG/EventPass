# Pruebas realizadas

Pruebas ejecutadas el 13 de octubre de 2026 contra el n8n real (Docker + ngrok), Google Sheets, Gmail y Telegram. Los comandos usan `curl` contra la URL pública; las credenciales de prueba se omiten (`<PASSWORD_DE_PRUEBA>`).

```bash
U=https://hydrant-supermom-raging.ngrok-free.dev/webhook
N="ngrok-skip-browser-warning: 1"
O="Origin: https://eventpass-frontend-theta.vercel.app"
```

## Resumen

| Área | Prueba | Resultado |
|---|---|---|
| Catálogo | Devuelve todos los eventos publicados y excluye el cerrado | ✔ 5 eventos |
| Catálogo | Cupos = capacidad − (confirmadas + asistieron) | ✔ coincide con los datos reales |
| Catálogo | `evento_pasado` marca los eventos con fecha anterior a hoy | ✔ |
| Catálogo | Frontend en portátil, iPad y Vercel, con filtros por categoría | ✔ |
| CORS | Peticiones GET/POST con *preflight* desde el dominio de Vercel | ✔ 204 con cabeceras permitidas |
| Usuarios | Registro correcto; correo repetido → 409; datos inválidos → 400 | ✔ |
| Sesiones | Login correcto (200); contraseña errónea, correo inexistente (401); sin datos (400) | ✔ |
| Sesiones | Logout (200); usar la sesión cerrada (401); la hoja queda `CERRADA` | ✔ |
| Telegram | Código con sesión válida; sesión falsa o de otro usuario → 401 | ✔ |
| Telegram | `/vincular CODIGO` vincula y responde; el código usado se rechaza | ✔ |
| Telegram | Estado de vinculación (`vinculado: true`) | ✔ |
| Inscripciones | Inscripción confirmada; cupo descontado en la página | ✔ |
| Inscripciones | Duplicado; sesión falsa o ajena (401); evento inexistente o pasado (404) | ✔ |
| Inscripciones | Usuario sin Telegram vinculado → 403 `TELEGRAM_NO_VINCULADO` | ✔ |
| Notificaciones | Una inscripción envía mensaje de Telegram y correo | ✔ |
| Check-in | Éxito (200 `EXITOSO`), duplicado (200 `DUPLICADO`) | ✔ |
| Check-in | Evento incorrecto, inscripción inexistente, evento inexistente (400 `RECHAZADO`) | ✔ |
| Check-in | La inscripción pasa a `ASISTIO` y el cupo sigue ocupado | ✔ |
| Asistente | Responde con datos reales y reconoce que los eventos pasados finalizaron | ✔ |
| Reasignación (WF07) | Promueve en orden de llegada, respeta los cupos libres, ignora eventos pasados | Lógica con datos simulados; **no ejecutado en vivo** |
| Recordatorios (WF08) | Detecta eventos a menos de 24 h, normaliza horas de un dígito, sin duplicados | Lógica con datos simulados; **no ejecutado en vivo** |
| Usuarios (WF01) | Acciones `consultar`, `actualizar`, `desactivar` | **No probadas** |

## Ejemplos

```bash
# Catálogo
curl -s "$U/catalogo" -H "$N" -H "$O"

# Login
curl -s -X POST "$U/sesiones" -H "Content-Type: application/json" -H "$N" \
  -d '{"email":"<CORREO>","password":"<PASSWORD_DE_PRUEBA>"}'

# Check-in
curl -s -X POST "$U/checkin" -H "Content-Type: application/json" -H "$N" -H "$O" \
  -d '{"inscripcion_id":"INS-...","evento_id":"EVT-..."}'
```

## Qué no está verificado

- Que `EP09_Notificaciones` muestre `ENVIADO` por canal en todas las filas de prueba (se confirmó la llegada del correo y del mensaje de Telegram, no el contenido de cada fila).
- La pantalla de check-in de la página fue desplegada, pero el resultado visual de cada caso no se documentó con capturas.
