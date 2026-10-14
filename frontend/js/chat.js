/* =========================================================
   EVENTPASS - Asistente conversacional (WF10)
   Usa el widget oficial @n8n/chat conectado al Chat Trigger.
   El asistente es solo informativo: no modifica datos.
   ========================================================= */

const N8N_BASE_URL = "https://hydrant-supermom-raging.ngrok-free.dev";

const CHAT_WEBHOOK =
  `${N8N_BASE_URL}/webhook/7f202a16-41dd-4041-b7e7-e05c0875f937/chat`;

import("https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js")
  .then(({ createChat }) => {
    createChat({
      webhookUrl: CHAT_WEBHOOK,
      webhookConfig: {
        method: "POST",
        headers: {
          "ngrok-skip-browser-warning": "1"
        }
      },
      mode: "window",
      showWelcomeScreen: false,
      loadPreviousSession: false,
      defaultLanguage: "en",
      initialMessages: [
        "¡Hola! Soy el asistente de EventPass.",
        "Puedo contarte sobre eventos, fechas, lugares, lista de espera y cómo vincular Telegram. No puedo inscribirte ni modificar datos."
      ],
      i18n: {
        en: {
          title: "Asistente EventPass",
          subtitle: "Pregúntame sobre los eventos del reino.",
          footer: "",
          getStarted: "Nueva conversación",
          inputPlaceholder: "Escribe tu pregunta...",
          closeButtonTooltip: "Cerrar"
        }
      }
    });
  })
  .catch(error => {
    console.error("No se pudo cargar el asistente:", error);
  });