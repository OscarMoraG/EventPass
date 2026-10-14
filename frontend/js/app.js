"use strict";

/* =========================================================
   EVENTPASS
   Frontend: https://eventpass-frontend-theta.vercel.app/
   Backend: n8n + Google Sheets
   ========================================================= */

/*
 * IMPORTANTE:
 * FRONTEND_URL es la dirección pública de Vercel.
 * N8N_BASE_URL es la dirección pública (ngrok, dominio estático)
 * que apunta al puerto 5678 de n8n. Esa dirección no cambia al
 * reiniciar ngrok, pero ngrok debe estar en ejecución.
 *
 * El plan gratuito de ngrok muestra una página de aviso a los
 * navegadores. Por eso todas las peticiones envían la cabecera
 * ngrok-skip-browser-warning.
 */

const FRONTEND_URL =
  "https://eventpass-frontend-theta.vercel.app";

const N8N_BASE_URL = "https://hydrant-supermom-raging.ngrok-free.dev";

const API_CATALOGO = `${N8N_BASE_URL}/webhook/catalogo`;
const API_USUARIOS = `${N8N_BASE_URL}/webhook/usuarios`;
const API_SESIONES = `${N8N_BASE_URL}/webhook/sesiones`;
const API_INSCRIPCIONES = `${N8N_BASE_URL}/webhook/inscripciones`;
const API_CHECKIN = `${N8N_BASE_URL}/webhook/checkin`;
const API_TELEGRAM = `${N8N_BASE_URL}/webhook/telegram`;

/* ---------- IMÁGENES DE LOS EVENTOS ---------- */

const IMAGENES_EVENTOS = {
  "festival de tecnologia bucaramanga":
    "./assets/festival-tecnologia-bucaramanga.png",

  "feria de emprendimiento santander":
    "./assets/feria-emprendimiento-santander.png",

  "festival cultural bucaramanga":
    "./assets/festival-cultural-bucaramanga.png",

  "carrera deportiva eventpass":
    "./assets/carrera-deportiva-eventpass.png",

  "taller de innovacion":
    "./assets/taller-de-innovacion.png",

  "encuentro cultural eventpass":
    "./assets/encuentro-cultural-eventpass.png"
};

/* ---------- ESTADO DE LA APLICACIÓN ---------- */

let eventosActuales = [];
let eventoSeleccionado = null;
let categoriaActual = "Todos";
let busquedaActual = "";
let sesionActual = null;
let catalogoCargado = false;
let ultimaInscripcion = null;
let telegramVinculado = false;
let telegramVinculacionId = "";
let temporizadorTelegram = null;

/* ---------- UTILIDADES ---------- */

function obtenerElemento(id) {
  return document.getElementById(id);
}

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caracter => {
    const entidades = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entidades[caracter];
  });
}

function mostrarAviso(mensaje, tipo = "info") {
  let aviso = obtenerElemento("site-toast");

  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = "site-toast";
    aviso.className = "site-toast";
    aviso.setAttribute("role", "status");
    aviso.setAttribute("aria-live", "polite");
    document.body.appendChild(aviso);
  }

  aviso.textContent = mensaje;
  aviso.dataset.type = tipo;
  aviso.classList.add("visible");
}

function ocultarAviso() {
  obtenerElemento("site-toast")?.classList.remove("visible");
}

async function solicitarJSON(url, opciones = {}) {
  const respuesta = await fetch(url, {
    ...opciones,
    headers: {
      Accept: "application/json",
      "ngrok-skip-browser-warning": "1",
      ...(opciones.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...opciones.headers
    }
  });

  const texto = await respuesta.text();

  let datos = null;

  if (texto.trim()) {
    try {
      datos = JSON.parse(texto);
    } catch {
      throw new Error(
        "El servidor respondió con un formato que no es JSON."
      );
    }
  }

  if (!respuesta.ok) {
    const mensaje =
      datos?.message ||
      datos?.mensaje ||
      `El servidor respondió con el estado ${respuesta.status}.`;

    const falla = new Error(mensaje);
    falla.codigo = datos?.codigo_error || "";
    falla.estado = respuesta.status;

    throw falla;
  }

  return datos;
}

/* ---------- NORMALIZACIÓN DE RESPUESTAS ---------- */

function extraerListaEventos(datos) {
  /*
   * Contrato de WF05:
   * { "ok": true, "total": N, "eventos": [ ... ] }
   * Cualquier otro formato se trata como error.
   */
  if (datos && datos.ok === true && Array.isArray(datos.eventos)) {
    return datos.eventos;
  }

  return null;
}

/* ---------- DATOS DE CADA EVENTO ---------- */

function obtenerNombreEvento(evento) {
  return evento?.nombre || "Evento EventPass";
}

function obtenerCategoria(evento) {
  return (
    evento?.categoria ||
    evento?.["categoría"] ||
    evento?.categorias ||
    "General"
  );
}

function obtenerDescripcion(evento) {
  return (
    evento?.descripcion ||
    evento?.["descripción"] ||
    "Consulta los detalles de este evento."
  );
}

function obtenerLugar(evento) {
  return evento?.lugar || "Lugar por confirmar";
}

function obtenerFecha(evento) {
  if (!evento?.fecha) {
    return "Fecha por confirmar";
  }

  /*
   * Evita que una fecha YYYY-MM-DD cambie de día
   * por la conversión de zona horaria del navegador.
   */
  const coincidencia = String(evento.fecha).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (coincidencia) {
    const [, anio, mes, dia] = coincidencia;

    return `${dia}/${mes}/${anio}`;
  }

  const fecha = new Date(evento.fecha);

  if (Number.isNaN(fecha.getTime())) {
    return String(evento.fecha);
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(fecha);
}

function obtenerHora(evento) {
  return evento?.hora || "Hora por confirmar";
}

function obtenerCupos(evento) {
  const valor =
    evento?.cupos_disponibles ??
    evento?.cuposDisponibles ??
    null;

  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

function esEventoPasado(evento) {
  /* WF05 calcula evento_pasado a partir de la fecha del evento. */
  return evento?.evento_pasado === true;
}

function obtenerImagenEvento(evento) {
  const clave = normalizarTexto(obtenerNombreEvento(evento));

  /*
   * Se prioriza la imagen local aprobada para cada evento.
   * No se usa una URL de ejemplo como example.com.
   */
  if (IMAGENES_EVENTOS[clave]) {
    return IMAGENES_EVENTOS[clave];
  }

  const imagenRemota = String(evento?.imagen_url || "").trim();

  if (
    /^https:\/\//i.test(imagenRemota) &&
    !/example\.com/i.test(imagenRemota)
  ) {
    return imagenRemota;
  }

  return "";
}

/* ---------- CARGAR CATÁLOGO REAL ---------- */

async function cargarEventos() {
  const contenedor = obtenerElemento("eventos-container");

  if (contenedor) {
    contenedor.innerHTML =
      '<p class="loading-message">Consultando los eventos del reino...</p>';
  }

  catalogoCargado = false;

  try {
    const datos = await solicitarJSON(API_CATALOGO, {
      method: "GET",
      cache: "no-store"
    });

    const lista = extraerListaEventos(datos);

    if (!lista) {
      throw new Error(
        "WF05 no devolvió el formato esperado {ok, total, eventos}."
      );
    }

    /*
     * Solo eventos publicados.
     * No se generan datos de demostración si falla el servidor.
     */
    eventosActuales = lista.filter(evento => {
      return (
        evento &&
        evento.nombre &&
        String(evento.estado || "").toUpperCase() === "PUBLICADO"
      );
    });

    catalogoCargado = true;

    renderizarEventos();

    if (eventosActuales.length === 0) {
      if (contenedor) {
        contenedor.innerHTML =
          '<p class="empty-message">No hay eventos publicados disponibles.</p>';
      }
    }
  } catch (error) {
    console.error("Error al cargar el catálogo WF05:", error);

    eventosActuales = [];
    renderizarEventos();

    if (contenedor) {
      contenedor.innerHTML = `
        <div class="catalog-error">
          <h3>No pudimos consultar el catálogo</h3>
          <p>
            No fue posible obtener los eventos del servidor.
            Inténtalo de nuevo más tarde.
          </p>
          <button
            type="button"
            class="btn-primary"
            id="btn-reintentar-catalogo"
          >
            Reintentar
          </button>
        </div>
      `;

      obtenerElemento("btn-reintentar-catalogo")
        ?.addEventListener("click", cargarEventos);
    }
  }
}

/* ---------- FILTRAR EVENTOS ---------- */

function obtenerEventosFiltrados() {
  return eventosActuales.filter(evento => {
    const categoria = normalizarTexto(obtenerCategoria(evento));

    const texto = normalizarTexto([
      obtenerNombreEvento(evento),
      obtenerDescripcion(evento),
      obtenerCategoria(evento),
      obtenerLugar(evento)
    ].join(" "));

    const coincideCategoria =
      categoriaActual === "Todos" ||
      categoria === normalizarTexto(categoriaActual);

    const coincideBusqueda =
      texto.includes(normalizarTexto(busquedaActual));

    return coincideCategoria && coincideBusqueda;
  });
}

/* ---------- PINTAR TARJETAS ---------- */

function renderizarEventos() {
  const contenedor = obtenerElemento("eventos-container");
  const contador = obtenerElemento("event-count");

  if (!contenedor) {
    console.error(
      'No se encontró el contenedor con id="eventos-container".'
    );
    return;
  }

  const filtrados = obtenerEventosFiltrados();

  if (contador) {
    contador.textContent = String(filtrados.length);
  }

  if (filtrados.length === 0) {
    contenedor.innerHTML = `
      <p class="empty-message">
        ${
          eventosActuales.length === 0
            ? "No hay eventos disponibles para mostrar."
            : "No encontramos eventos con esos criterios."
        }
      </p>
    `;
    return;
  }

  contenedor.innerHTML = filtrados.map(evento => {
    const nombreOriginal = obtenerNombreEvento(evento);
    const nombre = escaparHTML(nombreOriginal);
    const categoria = escaparHTML(obtenerCategoria(evento));
    const descripcion = escaparHTML(obtenerDescripcion(evento));
    const fecha = escaparHTML(obtenerFecha(evento));
    const lugar = escaparHTML(obtenerLugar(evento));
    const imagen = obtenerImagenEvento(evento);
    const cupos = obtenerCupos(evento);

    const imagenHTML = imagen
      ? `
        <img
          class="event-thumbnail"
          src="${escaparHTML(imagen)}"
          alt="${nombre}"
          loading="lazy"
          data-event-image
        >
      `
      : `
        <div
          class="event-visual-placeholder"
          aria-hidden="true"
        >✦</div>
      `;

    const cuposHTML = esEventoPasado(evento)
      ? `
        <p class="event-spots">
          <strong>Evento cerrado</strong>
        </p>
      `
      : cupos !== null
        ? `
        <p class="event-spots">
          <strong>Cupos disponibles:</strong>
          <span>${escaparHTML(cupos)}</span>
        </p>
      `
        : "";

    return `
      <article class="event-card">
        <div class="event-visual">
          ${imagenHTML}
          <span class="event-category">${categoria}</span>
        </div>

        <div class="event-card-content">
          <p class="event-date">${fecha}</p>

          <h3>${nombre}</h3>

          <p class="event-description">${descripcion}</p>

          <p class="event-location">
            <span>⌖</span> ${lugar}
          </p>

          ${cuposHTML}

          <button
            type="button"
            class="btn-event-details"
            data-event-id="${escaparHTML(evento.evento_id || "")}"
            data-event-name="${nombre}"
          >
            Descubrir evento
          </button>
        </div>
      </article>
    `;
  }).join("");

  /*
   * Se asignan los eventos después de pintar las tarjetas.
   * No se utiliza onclick inline.
   */
  contenedor.querySelectorAll("[data-event-name]").forEach(boton => {
    boton.addEventListener("click", () => {
      const id = boton.dataset.eventId;
      const nombre = normalizarTexto(boton.dataset.eventName);

      const evento = eventosActuales.find(item => {
        if (id && item.evento_id) {
          return String(item.evento_id) === String(id);
        }

        return normalizarTexto(obtenerNombreEvento(item)) === nombre;
      });

      abrirDetalleEvento(evento);
    });
  });

  /*
   * Si una imagen falla, se oculta solo esa imagen.
   * La tarjeta y el botón siguen funcionando.
   */
  contenedor.querySelectorAll("[data-event-image]").forEach(imagen => {
    imagen.addEventListener("error", () => {
      imagen.style.display = "none";
    });
  });
}

/* ---------- ABRIR DETALLE DEL EVENTO ---------- */

function abrirDetalleEvento(evento) {
  if (!evento) {
    mostrarAviso("No encontramos la información de este evento.", "error");
    return;
  }

  const modal = obtenerElemento("event-modal");
  const contenido = obtenerElemento("event-modal-content");

  if (!modal || !contenido) {
    console.error(
      'Falta #event-modal o #event-modal-content en index.html.'
    );

    mostrarAviso(
      "No se pudo abrir el detalle del evento.",
      "error"
    );

    return;
  }

  eventoSeleccionado = evento;

  const nombre = escaparHTML(obtenerNombreEvento(evento));
  const categoria = escaparHTML(obtenerCategoria(evento));
  const descripcion = escaparHTML(obtenerDescripcion(evento));
  const fecha = escaparHTML(obtenerFecha(evento));
  const hora = escaparHTML(obtenerHora(evento));
  const lugar = escaparHTML(obtenerLugar(evento));
  const imagen = obtenerImagenEvento(evento);
  const cupos = obtenerCupos(evento);

  /*
   * La estructura debe coincidir con las reglas de styles.css:
   * #event-modal-content > .event-visual > .event-thumbnail
   * La imagen ocupa todo el ancho de la ventana.
   */
  const imagenHTML = imagen
    ? `
      <div class="event-visual" style="aspect-ratio: 16 / 10;">
        <img
          class="event-thumbnail"
          style="max-height: none;"
          src="${escaparHTML(imagen)}"
          alt="${nombre}"
        >
      </div>
    `
    : "";

  const eventoCerrado = esEventoPasado(evento);

  const cuposHTML = eventoCerrado
    ? `<p><strong>Estado:</strong> Evento cerrado</p>`
    : cupos !== null
      ? `<p><strong>Cupos disponibles:</strong> ${escaparHTML(cupos)}</p>`
      : "";

  contenido.innerHTML = `
    ${imagenHTML}

    <p class="event-category">${categoria}</p>

    <h2>${nombre}</h2>

    <p class="event-detail-description">${descripcion}</p>

    <p><strong>Fecha:</strong> ${fecha}</p>
    <p><strong>Hora:</strong> ${hora}</p>
    <p><strong>Lugar:</strong> ${lugar}</p>
    ${cuposHTML}

    <button
      type="button"
      class="btn-primary"
      id="btn-inscribirse-evento"
      ${eventoCerrado ? "disabled" : ""}
    >
      ${eventoCerrado ? "Evento cerrado" : "Inscribirme"}
    </button>
  `;

  /*
   * Abrimos el modal después de insertar el contenido.
   * El modal exterior es el único elemento con clase "modal".
   */
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  contenido.querySelector("#btn-inscribirse-evento")
    ?.addEventListener("click", iniciarInscripcion);

  contenido.querySelector(".event-thumbnail")
    ?.addEventListener("error", eventoImagen => {
      const contenedor = eventoImagen.currentTarget.closest(".event-visual");

      if (contenedor) contenedor.style.display = "none";
    });
}

/* ---------- CERRAR MODALES ---------- */

function cerrarModal(id) {
  const modal = obtenerElemento(id);

  if (!modal) return;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");

  if (!document.querySelector(".modal.active")) {
    document.body.classList.remove("modal-open");
  }
}

function configurarModales() {
  document.querySelectorAll("[data-close-modal]").forEach(boton => {
    boton.addEventListener("click", () => {
      const modal = boton.closest(".modal");

      if (modal?.id) {
        cerrarModal(modal.id);
      }
    });
  });

  document.querySelectorAll("[data-open-modal]").forEach(boton => {
    boton.addEventListener("click", () => {
      const id = boton.dataset.openModal;
      const modal = obtenerElemento(id);

      if (!modal) return;

      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
    });
  });

  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", evento => {
      if (
        evento.target === modal ||
        evento.target.classList.contains("modal-backdrop")
      ) {
        cerrarModal(modal.id);
      }
    });
  });

  document.addEventListener("keydown", evento => {
    if (evento.key === "Escape") {
      document.querySelectorAll(".modal.active").forEach(modal => {
        cerrarModal(modal.id);
      });
    }
  });
}

/* ---------- FILTROS Y BÚSQUEDA ---------- */

function configurarFiltros() {
  const buscador = obtenerElemento("event-search");

  buscador?.addEventListener("input", evento => {
    busquedaActual = evento.target.value || "";
    renderizarEventos();
  });

  document.querySelectorAll(".filter-chip").forEach(boton => {
    boton.addEventListener("click", () => {
      categoriaActual =
        boton.dataset.category ||
        boton.dataset.categoria ||
        boton.textContent.trim();

      document.querySelectorAll(".filter-chip").forEach(otro => {
        otro.classList.remove("active");
        otro.setAttribute("aria-pressed", "false");
      });

      boton.classList.add("active");
      boton.setAttribute("aria-pressed", "true");

      renderizarEventos();
    });
  });
}

/* ---------- MENÚ MÓVIL ---------- */

function configurarMenuMovil() {
  const boton = obtenerElemento("menu-toggle");
  const navegacion = obtenerElemento("nav-links");

  if (!boton || !navegacion) return;

  boton.addEventListener("click", () => {
    const abierto = navegacion.classList.toggle("active");

    boton.setAttribute("aria-expanded", String(abierto));
  });

  navegacion.querySelectorAll("a").forEach(enlace => {
    enlace.addEventListener("click", () => {
      navegacion.classList.remove("active");
      boton.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- REGISTRO DE USUARIO ---------- */

function configurarRegistro() {
  const formulario = obtenerElemento("register-form");

  if (!formulario) return;

  formulario.addEventListener("submit", async evento => {
    evento.preventDefault();

    const boton = formulario.querySelector('[type="submit"]');

    const nombre =
      formulario.elements.namedItem("nombre")?.value?.trim() || "";

    const correo =
      formulario.elements.namedItem("correo")?.value?.trim() || "";

    const contrasena =
      formulario.elements.namedItem("contrasena")?.value || "";

    if (!nombre || !correo || !contrasena) {
      mostrarAviso("Completa todos los campos del registro.", "error");
      return;
    }

    try {
      if (boton) boton.disabled = true;

      const respuesta = await solicitarJSON(API_USUARIOS, {
        method: "POST",
        body: JSON.stringify({
          nombre,
          email: correo,
          password: contrasena,
          accion: "crear"
        })
      });

      if (
        respuesta?.success === false ||
        respuesta?.ok === false ||
        respuesta?.error
      ) {
        throw new Error(
          respuesta.message ||
          respuesta.mensaje ||
          "No fue posible completar el registro."
        );
      }

      mostrarAviso(
        respuesta?.mensaje ||
        respuesta?.message ||
        "Solicitud de registro enviada correctamente.",
        "success"
      );

      formulario.reset();

      cerrarModal("register-modal");
    } catch (error) {
      console.error("Error de registro:", error);

      mostrarAviso(
        error.message ||
        "No fue posible conectar con el servicio de registro.",
        "error"
      );
    } finally {
      if (boton) boton.disabled = false;
    }
  });
}

/* ---------- INICIO DE SESIÓN ---------- */

function configurarInicioSesion() {
  const formulario = obtenerElemento("login-form");

  if (!formulario) return;

  formulario.addEventListener("submit", async evento => {
    evento.preventDefault();

    const boton = formulario.querySelector('[type="submit"]');

    const correo =
      formulario.elements.namedItem("email")?.value?.trim() ||
      formulario.elements.namedItem("correo")?.value?.trim() ||
      "";

    const contrasena =
      formulario.elements.namedItem("password")?.value ||
      formulario.elements.namedItem("contrasena")?.value ||
      "";

    if (!correo || !contrasena) {
      mostrarAviso(
        "Ingresa tu correo y contraseña.",
        "error"
      );
      return;
    }

    try {
      if (boton) boton.disabled = true;

      const respuesta = await solicitarJSON(API_SESIONES, {
        method: "POST",
        body: JSON.stringify({
          email: correo,
          password: contrasena,
          accion: "login"
        })
      });

      if (
        respuesta?.success === false ||
        respuesta?.ok === false ||
        respuesta?.error
      ) {
        throw new Error(
          respuesta.message ||
          respuesta.mensaje ||
          "No fue posible iniciar sesión."
        );
      }

      sesionActual = respuesta;
      actualizarEncabezadoSesion();
      consultarEstadoTelegram();

      mostrarAviso(
        respuesta?.mensaje ||
        respuesta?.message ||
        "Solicitud de inicio de sesión procesada.",
        "success"
      );

      cerrarModal("login-modal");
    } catch (error) {
      console.error("Error de inicio de sesión:", error);

      mostrarAviso(
        error.message ||
        "No fue posible conectar con el servicio de sesiones.",
        "error"
      );
    } finally {
      if (boton) boton.disabled = false;
    }
  });
}

/* ---------- INSCRIPCIÓN A EVENTOS ---------- */

async function iniciarInscripcion() {
  if (!eventoSeleccionado) {
    mostrarAviso("Primero selecciona un evento.", "error");
    return;
  }

  if (!sesionActual) {
    mostrarAviso(
      "Debes iniciar sesión antes de inscribirte.",
      "error"
    );

    cerrarModal("event-modal");

    const loginModal = obtenerElemento("login-modal");

    if (loginModal) {
      loginModal.classList.add("active");
      loginModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
    }

    return;
  }

  if (esEventoPasado(eventoSeleccionado)) {
    mostrarAviso("Este evento ya está cerrado.", "error");
    return;
  }

  if (!eventoSeleccionado.evento_id) {
    mostrarAviso(
      "El evento no tiene un identificador válido.",
      "error"
    );
    return;
  }

  const boton = obtenerElemento("btn-inscribirse-evento");

  try {
    if (boton) boton.disabled = true;

    const respuesta = await solicitarJSON(API_INSCRIPCIONES, {
      method: "POST",
      body: JSON.stringify({
        evento_id: eventoSeleccionado.evento_id,
        usuario_id:
          sesionActual.usuario_id ||
          sesionActual.usuario?.usuario_id ||
          "",
        sesion_id:
          sesionActual.sesion_id ||
          "",
        accion: "crear"
      })
    });

    if (
      respuesta?.success === false ||
        respuesta?.ok === false ||
      respuesta?.error
    ) {
      throw new Error(
        respuesta.message ||
        respuesta.mensaje ||
        "No fue posible procesar la inscripción."
      );
    }

    mostrarAviso(
      (
        respuesta?.mensaje ||
        respuesta?.message ||
        "Solicitud de inscripción procesada."
      ) +
      (
        respuesta?.inscripcion?.inscripcion_id
          ? ` Código de inscripción: ${respuesta.inscripcion.inscripcion_id}`
          : ""
      ),
      "success"
    );

    ultimaInscripcion = respuesta?.inscripcion?.inscripcion_id
      ? {
          inscripcion_id: respuesta.inscripcion.inscripcion_id,
          evento_id: respuesta.inscripcion.evento_id || ""
        }
      : null;

    cerrarModal("event-modal");

    await cargarEventos();
  } catch (error) {
    console.error("Error de inscripción:", error);

    if (error.codigo === "TELEGRAM_NO_VINCULADO") {
      cerrarModal("event-modal");
      mostrarAviso(error.message, "error");
      abrirTelegram();
      return;
    }

    mostrarAviso(
      error.message ||
      "No fue posible conectar con el servicio de inscripciones.",
      "error"
    );
  } finally {
    if (boton) boton.disabled = false;
  }
}

/* ---------- ENCABEZADO SEGÚN LA SESIÓN ---------- */

function actualizarEncabezadoSesion() {
  const entrar = document.querySelector(".btn-nav-login");
  const registro = document.querySelector(".btn-nav-register");

  if (!entrar) return;

  let salir = obtenerElemento("btn-nav-logout");

  if (sesionActual) {
    const nombre = String(sesionActual.nombre || "")
      .trim()
      .split(/\s+/)[0];

    if (!salir) {
      salir = document.createElement("button");
      salir.type = "button";
      salir.id = "btn-nav-logout";
      salir.className = "btn-nav-login";
      salir.addEventListener("click", cerrarSesion);
      entrar.after(salir);
    }

    salir.textContent = nombre ? `Salir (${nombre})` : "Salir";

    let telegram = obtenerElemento("btn-nav-telegram");

    if (!telegram) {
      telegram = document.createElement("button");
      telegram.type = "button";
      telegram.id = "btn-nav-telegram";
      telegram.className = "btn-nav-login";
      telegram.textContent = telegramVinculado ? "Telegram ✓" : "Telegram";
      telegram.addEventListener("click", abrirTelegram);
      entrar.after(telegram);
    }

    entrar.style.display = "none";

    if (registro) registro.style.display = "none";
  } else {
    salir?.remove();
    obtenerElemento("btn-nav-telegram")?.remove();
    entrar.style.display = "";

    if (registro) registro.style.display = "";
  }
}

function cerrarSesion() {
  /* Se avisa al servidor para cerrar la sesión; si falla, igual se cierra aquí. */
  if (sesionActual?.sesion_id) {
    solicitarJSON(API_SESIONES, {
      method: "POST",
      body: JSON.stringify({
        accion: "logout",
        usuario_id: sesionActual.usuario_id || "",
        sesion_id: sesionActual.sesion_id
      })
    }).catch(error => {
      console.error("No se pudo cerrar la sesión en el servidor:", error);
    });
  }

  detenerSondeoTelegram();
  telegramVinculado = false;
  telegramVinculacionId = "";
  sesionActual = null;
  actualizarEncabezadoSesion();
  mostrarAviso("Sesión cerrada.", "info");
}

/* ---------- VINCULAR TELEGRAM ---------- */

function abrirModalPorId(id) {
  const modal = obtenerElemento(id);

  if (!modal) return;

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function mostrarResultadoTelegram(tipo, mensaje) {
  const salida = obtenerElemento("telegram-result");

  if (!salida) return;

  const iconos = { success: "✔", info: "ℹ", error: "✖" };
  const colores = {
    success: "var(--gold-light)",
    info: "var(--text-soft)",
    error: "#ff9b9b"
  };

  salida.textContent = mensaje ? `${iconos[tipo] || ""} ${mensaje}`.trim() : "";
  salida.style.color = colores[tipo] || "";
}

function actualizarEtiquetaTelegram() {
  const boton = obtenerElemento("btn-nav-telegram");

  if (boton) {
    boton.textContent = telegramVinculado ? "Telegram ✓" : "Telegram";
  }
}

async function consultarEstadoTelegram() {
  if (!sesionActual) return null;

  try {
    const respuesta = await solicitarJSON(API_TELEGRAM, {
      method: "POST",
      body: JSON.stringify({
        accion: "estado",
        usuario_id: sesionActual.usuario_id || "",
        sesion_id: sesionActual.sesion_id || ""
      })
    });

    telegramVinculado = respuesta?.vinculado === true;
    telegramVinculacionId = respuesta?.vinculacion_id || "";
    actualizarEtiquetaTelegram();

    return respuesta;
  } catch (error) {
    console.error("No se pudo consultar el estado de Telegram:", error);
    return null;
  }
}

function detenerSondeoTelegram() {
  if (temporizadorTelegram) {
    clearInterval(temporizadorTelegram);
    temporizadorTelegram = null;
  }
}

function mostrarEstadoTelegramEnModal(respuesta) {
  const boton = obtenerElemento("btn-generar-codigo-telegram");

  if (respuesta?.vinculado) {
    const usuario = respuesta.telegram_username
      ? ` (${respuesta.telegram_username})`
      : "";

    mostrarResultadoTelegram(
      "success",
      `Tu Telegram ya está vinculado${usuario}. Recibirás tus avisos por ahí.`
    );

    if (boton) boton.textContent = "Vincular otra cuenta de Telegram";
  } else {
    mostrarResultadoTelegram(
      "info",
      "Todavía no tienes Telegram vinculado."
    );

    if (boton) boton.textContent = "Generar código";
  }
}

async function abrirTelegram() {
  detenerSondeoTelegram();
  mostrarResultadoTelegram("info", "Consultando tu vinculación...");
  abrirModalPorId("telegram-modal");

  const respuesta = await consultarEstadoTelegram();

  if (respuesta) {
    mostrarEstadoTelegramEnModal(respuesta);
  } else {
    mostrarResultadoTelegram(
      "error",
      "No fue posible consultar el estado de Telegram."
    );
  }
}

function iniciarSondeoTelegram(vinculacionPrevia) {
  detenerSondeoTelegram();

  let intentos = 0;

  temporizadorTelegram = setInterval(async () => {
    intentos += 1;

    const respuesta = await consultarEstadoTelegram();

    if (
      respuesta?.vinculado &&
      respuesta.vinculacion_id &&
      respuesta.vinculacion_id !== vinculacionPrevia
    ) {
      detenerSondeoTelegram();
      mostrarEstadoTelegramEnModal(respuesta);
      mostrarAviso("Telegram vinculado correctamente.", "success");
      return;
    }

    if (intentos >= 100 || !sesionActual) {
      detenerSondeoTelegram();
    }
  }, 6000);
}

function configurarTelegram() {
  const boton = obtenerElemento("btn-generar-codigo-telegram");

  if (!boton) return;

  boton.addEventListener("click", async () => {
    if (!sesionActual) {
      mostrarResultadoTelegram(
        "error",
        "Debes iniciar sesión para vincular Telegram."
      );
      return;
    }

    const vinculacionPrevia = telegramVinculacionId;

    try {
      boton.disabled = true;
      mostrarResultadoTelegram("info", "Generando código...");

      const respuesta = await solicitarJSON(API_TELEGRAM, {
        method: "POST",
        body: JSON.stringify({
          usuario_id: sesionActual.usuario_id || "",
          sesion_id: sesionActual.sesion_id || ""
        })
      });

      if (respuesta?.ok === false || !respuesta?.codigo) {
        throw new Error(
          respuesta?.mensaje || "No fue posible generar el código."
        );
      }

      mostrarResultadoTelegram(
        "success",
        `Tu código es ${respuesta.codigo}. Abre el bot en Telegram y ` +
        `escribe: /vincular ${respuesta.codigo} (vence en 10 minutos). ` +
        "Esta ventana se actualizará cuando quede vinculado."
      );

      iniciarSondeoTelegram(vinculacionPrevia);
    } catch (error) {
      console.error("Error al generar el código de Telegram:", error);

      mostrarResultadoTelegram(
        "error",
        error.message ||
        "No fue posible conectar con el servicio de Telegram."
      );
    } finally {
      boton.disabled = false;
    }
  });
}

/* ---------- CHECK-IN DIGITAL ---------- */

function interpretarRespuestaCheckin(estadoHttp, datos) {
  const resultado = String(datos?.resultado || "").toUpperCase();

  if (resultado === "EXITOSO") {
    return {
      tipo: "success",
      mensaje: datos.mensaje || "Check-in realizado correctamente."
    };
  }

  if (resultado === "DUPLICADO") {
    return {
      tipo: "info",
      mensaje: datos.mensaje || "El ingreso ya había sido registrado."
    };
  }

  if (resultado === "RECHAZADO") {
    return {
      tipo: "error",
      mensaje: datos.mensaje || "El check-in fue rechazado."
    };
  }

  return {
    tipo: "error",
    mensaje:
      datos?.mensaje ||
      datos?.message ||
      `El servidor respondió con el estado ${estadoHttp}.`
  };
}

function mostrarResultadoCheckin(tipo, mensaje) {
  const salida = obtenerElemento("checkin-result");

  if (!salida) return;

  const iconos = { success: "✔", info: "ℹ", error: "✖" };
  const colores = {
    success: "var(--gold-light)",
    info: "var(--text-soft)",
    error: "#ff9b9b"
  };

  salida.textContent = `${iconos[tipo] || ""} ${mensaje}`.trim();
  salida.style.color = colores[tipo] || "";
}

function configurarCheckin() {
  const formulario = obtenerElemento("checkin-form");

  /* Los enlaces que abren modales no deben desplazar la página. */
  document.querySelectorAll("a[data-open-modal]").forEach(enlace => {
    enlace.addEventListener("click", evento => evento.preventDefault());
  });

  /* Al abrir el check-in se rellenan los datos de la última inscripción. */
  document
    .querySelectorAll('[data-open-modal="checkin-modal"]')
    .forEach(boton => {
      boton.addEventListener("click", () => {
        const inscripcion = obtenerElemento("checkin-inscripcion");
        const evento = obtenerElemento("checkin-evento");

        if (ultimaInscripcion && inscripcion && evento) {
          if (!inscripcion.value) {
            inscripcion.value = ultimaInscripcion.inscripcion_id;
          }

          if (!evento.value) {
            evento.value = ultimaInscripcion.evento_id;
          }
        }

        mostrarResultadoCheckin("info", "");
      });
    });

  if (!formulario) return;

  formulario.addEventListener("submit", async evento => {
    evento.preventDefault();

    const boton = formulario.querySelector('[type="submit"]');

    const inscripcion_id =
      formulario.elements.namedItem("inscripcion_id")?.value?.trim() || "";

    const evento_id =
      formulario.elements.namedItem("evento_id")?.value?.trim() || "";

    if (!inscripcion_id || !evento_id) {
      mostrarResultadoCheckin(
        "error",
        "Escribe el código de inscripción y el código del evento."
      );
      return;
    }

    try {
      if (boton) boton.disabled = true;

      mostrarResultadoCheckin("info", "Registrando ingreso...");

      const respuesta = await fetch(API_CHECKIN, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "1"
        },
        body: JSON.stringify({ inscripcion_id, evento_id })
      });

      let datos = null;

      try {
        datos = JSON.parse(await respuesta.text());
      } catch {
        datos = null;
      }

      const resultado = interpretarRespuestaCheckin(respuesta.status, datos);

      mostrarResultadoCheckin(resultado.tipo, resultado.mensaje);
    } catch (error) {
      console.error("Error de check-in:", error);

      mostrarResultadoCheckin(
        "error",
        "No fue posible conectar con el servicio de check-in."
      );
    } finally {
      if (boton) boton.disabled = false;
    }
  });
}

/* ---------- NAVEGACIÓN ENTRE MODALES ---------- */

function configurarNavegacionAutenticacion() {
  document.querySelectorAll("[data-open-modal]").forEach(boton => {
    boton.addEventListener("click", () => {
      const destino = boton.dataset.openModal;

      if (
        destino === "register-modal" ||
        destino === "login-modal"
      ) {
        document.querySelectorAll(".modal.active").forEach(modal => {
          if (modal.id !== destino) {
            cerrarModal(modal.id);
          }
        });
      }
    });
  });
}

/* ---------- INICIALIZACIÓN ---------- */

function inicializarEventPass() {
  configurarModales();
  configurarFiltros();
  configurarMenuMovil();
  configurarRegistro();
  configurarInicioSesion();
  configurarNavegacionAutenticacion();
  configurarCheckin();
  configurarTelegram();

  cargarEventos();

  console.info(
    "EventPass inicializado.",
    "Frontend:",
    FRONTEND_URL,
    "Backend configurado:",
    N8N_BASE_URL
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    inicializarEventPass,
    { once: true }
  );
} else {
  inicializarEventPass();
}