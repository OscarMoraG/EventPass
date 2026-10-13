
/* =========================================================
   EVENTPASS — CRÓNICAS DEL REINO
   Catálogo, imágenes, filtros, modales y conexión con n8n
   ========================================================= */

/* 1. CONFIGURACIÓN DE N8N */

// IMPORTANTE:
// Esta dirección funciona únicamente desde el equipo donde
// se ejecuta n8n. Para producción necesitaremos una URL pública.
const N8N_BASE_URL = "http://localhost:5678";

// Endpoints de producción identificados en n8n.
const API_CATALOGO = `${N8N_BASE_URL}/webhook/catalogo`;
const API_USUARIOS = `${N8N_BASE_URL}/webhook/usuarios`;
const API_SESIONES = `${N8N_BASE_URL}/webhook/sesiones`;
const API_TELEGRAM = `${N8N_BASE_URL}/webhook/telegram`;
const API_INSCRIPCIONES = `${N8N_BASE_URL}/webhook/inscripciones`;
const API_CHECKIN = `${N8N_BASE_URL}/webhook/checkin`;

// No agregamos WF07, WF08, WF09 ni WF10 a esta lista de
// endpoints REST: según la información disponible, no tienen
// un webhook propio para invocarlos de esta manera.


/* 2. IMÁGENES DE LOS SEIS EVENTOS */

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
    "./assets/taller-de-innov    acion.png",

  "encuentro cultural eventpass":
    "./assets/encuentro-cultural-eventpass.png"
};


/* 3. CATÁLOGO DE DEMOSTRACIÓN */

const EVENTOS_DEMO = [
  {
    nombre: "Festival de Tecnología Bucaramanga",
    categoria: "Tecnología",
    descripcion:
      "Un encuentro dedicado a la tecnología, la creatividad y la innovación.",
    fecha: "",
    hora: "",
    lugar: "",
    cupos_disponibles: null
  },
  {
    nombre: "Feria de Emprendimiento Santander",
    categoria: "Emprendimiento",
    descripcion:
      "Una feria para descubrir ideas, proyectos y nuevas oportunidades.",
    fecha: "",
    hora: "",
    lugar: "",
    cupos_disponibles: null
  },
  {
    nombre: "Festival Cultural Bucaramanga",
    categoria: "Cultura",
    descripcion:
      "Música, arte y expresiones culturales para toda la comunidad.",
    fecha: "",
    hora: "",
    lugar: "",
    cupos_disponibles: null
  },
  {
    nombre: "Carrera Deportiva EventPass",
    categoria: "Deportes",
    descripcion:
      "Una experiencia deportiva y recreativa para compartir en comunidad.",
    fecha: "",
    hora: "",
    lugar: "",
    cupos_disponibles: null
  },
  {
    nombre: "Taller de Innovación",
    categoria: "Tecnología",
    descripcion:
      "Un taller práctico para explorar nuevas ideas y tecnologías.",
    fecha: "",
    hora: "",
    lugar: "",
    cupos_disponibles: null
  },
  {
    nombre: "Encuentro Cultural EventPass",
    categoria: "Cultura",
    descripcion:
      "Un encuentro con música, arte y actividades culturales.",
    fecha: "",
    hora: "",
    lugar: "",
    cupos_disponibles: null
  }
];


/* 4. ESTADO DE LA APLICACIÓN */

let eventosActuales = [];
let eventoSeleccionado = null;
let modoDemostracion = false;
let categoriaActual = "Todos";
let busquedaActual = "";


/* 5. FUNCIONES AUXILIARES */

function obtenerElemento(id) {
  return document.getElementById(id);
}

function normalizarTexto(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function escaparHTML(valor = "") {
  return String(valor).replace(/[&<>"']/g, caracter => {
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

function mostrarAviso(mensaje, duracion = 4000) {
  const aviso = obtenerElemento("site-toast");

  if (!aviso) {
    console.info(mensaje);
    return;
  }

  aviso.textContent = mensaje;
  aviso.classList.add("show");

  window.clearTimeout(mostrarAviso.temporizador);

  mostrarAviso.temporizador = window.setTimeout(() => {
    aviso.classList.remove("show");
  }, duracion);
}

function obtenerCategoria(evento) {
  const nombre = normalizarTexto(evento.nombre || "");
  const categoria = normalizarTexto(evento.categoria || "");

  if (
    nombre.includes("tecnologia") ||
    nombre.includes("innovacion")
  ) {
    return "Tecnología";
  }

  if (
    nombre.includes("emprendimiento") ||
    categoria.includes("emprendimiento")
  ) {
    return "Emprendimiento";
  }

  if (
    nombre.includes("deportiva") ||
    categoria.includes("deporte")
  ) {
    return "Deportes";
  }

  if (
    nombre.includes("cultural") ||
    categoria.includes("cultura")
  ) {
    return "Cultura";
  }

  if (categoria.includes("tecnologia")) {
    return "Tecnología";
  }

  return evento.categoria || "Otros";
}

function obtenerImagenEvento(evento) {
  const nombre = normalizarTexto(evento.nombre || "");
  return IMAGENES_EVENTOS[nombre] || "";
}

function obtenerDescripcion(evento) {
  return evento.descripcion || "Próximamente encontrarás más información sobre este evento.";
}

function obtenerFecha(evento) {
  if (!evento.fecha) return "Fecha por confirmar";

  return evento.hora
    ? `${evento.fecha} · ${evento.hora}`
    : evento.fecha;
}

function obtenerLugar(evento) {
  return evento.lugar || "Lugar por confirmar";
}

async function solicitarJSON(url, opciones = {}) {
  const respuesta = await fetch(url, {
    ...opciones,
    headers: {
      Accept: "application/json",
      ...(opciones.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...opciones.headers
    }
  });

  const texto = await respuesta.text();
  let datos = null;

  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = { mensaje: texto };
    }
  }

  if (!respuesta.ok) {
    const mensaje =
      datos?.mensaje ||
      datos?.message ||
      `La solicitud falló con el estado HTTP ${respuesta.status}.`;

    throw new Error(mensaje);
  }

  return datos;
}


/* 
/* 6. CARGAR EL CATÁLOGO */

async function cargarEventos() {
  const contenedor = obtenerElemento("eventos-container");

  if (contenedor) {
    contenedor.innerHTML =
      '<p class="loading-message">Consultando los registros del reino...</p>';
  }

  try {
    const datos = await solicitarJSON(API_CATALOGO, {
      method: "GET"
    });

    let lista = Array.isArray(datos)
      ? datos
      : Array.isArray(datos?.data)
        ? datos.data
        : Array.isArray(datos?.eventos)
          ? datos.eventos
          : Array.isArray(datos?.body)
            ? datos.body
            : datos && typeof datos === "object" && datos.evento_id
              ? [datos]
              : null;

    if (!lista) {
      throw new Error(
        "La respuesta del catálogo no contiene una lista reconocida de eventos."
      );
    }

    const nombresPermitidos = new Set(
      EVENTOS_DEMO.map(evento => normalizarTexto(evento.nombre))
    );

    eventosActuales = lista.filter(evento =>
      nombresPermitidos.has(normalizarTexto(evento.nombre))
    );

    modoDemostracion = false;

    if (eventosActuales.length === 0) {
      throw new Error(
        "El catálogo no devolvió ninguno de los seis eventos esperados."
      );
    }
  } catch (error) {
    console.error("Error cargando el catálogo:", error);

    eventosActuales = EVENTOS_DEMO;
    modoDemostracion = true;

    mostrarAviso(
      "No se pudo consultar el catálogo de n8n. Se muestran datos de demostración."
    );
  }

  renderizarEventos();
}


/* 7. RENDERIZAR LAS TARJETAS */


function renderizarEventos() {
  const contenedor = obtenerElemento("eventos-container");
  const contador = obtenerElemento("event-count");

  if (!contenedor) return;

  const eventosFiltrados = eventosActuales.filter(evento => {
    const categoria = obtenerCategoria(evento);
    const textoBusqueda = normalizarTexto(
      `${evento.nombre || ""} ${evento.descripcion || ""} ${categoria}`
    );

    const coincideCategoria =
      categoriaActual === "Todos" ||
      normalizarTexto(categoria) === normalizarTexto(categoriaActual);

    const coincideBusqueda =
      textoBusqueda.includes(normalizarTexto(busquedaActual));

    return coincideCategoria && coincideBusqueda;
  });

  if (contador) {
    contador.textContent = String(eventosFiltrados.length);
  }

  if (eventosFiltrados.length === 0) {
    contenedor.innerHTML =
      '<p class="empty-message">No encontramos eventos con esos criterios.</p>';
    return;
  }

  contenedor.innerHTML = eventosFiltrados.map(evento => {
    const nombre = escaparHTML(evento.nombre || "Evento EventPass");
    const categoria = escaparHTML(obtenerCategoria(evento));
    const descripcion = escaparHTML(obtenerDescripcion(evento));
    const imagen = obtenerImagenEvento(evento);
    const fecha = escaparHTML(obtenerFecha(evento));

    // Aceptamos los nombres de campos más habituales del catálogo.
    const cuposDisponibles =
      evento.cupos_disponibles ??
      evento.cuposDisponibles ??
      evento.cupos_disponibles_evento ??
      null;

    const cuposHTML = cuposDisponibles !== null &&
      cuposDisponibles !== undefined &&
      cuposDisponibles !== ""
        ? `<p class="event-spots"><strong>Cupos disponibles:</strong> ${escaparHTML(cuposDisponibles)}</p>`
        : "";

    const imagenHTML = imagen
      ? `<img class="event-thumbnail" src="${imagen}" alt="${nombre}" loading="lazy">`
      : '<div class="event-visual-placeholder" aria-hidden="true">✦</div>';

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
          ${cuposHTML}

          <button
            type="button"
            class="btn-event-details"
            data-event-name="${escaparHTML(evento.nombre || "")}"
          >
            Descubrir evento
          </button>
        </div>
      </article>
    `;
  }).join("");

  contenedor.querySelectorAll("[data-event-name]").forEach(boton => {
    boton.addEventListener("click", () => {
      const nombreBuscado = normalizarTexto(boton.dataset.eventName);
      const evento = eventosActuales.find(
        item => normalizarTexto(item.nombre || "") === nombreBuscado
      );

      abrirDetalleEvento(evento);
    });
  });
}


/* 8. FILTROS Y BÚSQUEDA */

function configurarFiltros() {
  document.querySelectorAll(".filter-chip").forEach(boton => {
    boton.addEventListener("click", () => {
      categoriaActual = boton.dataset.category || "Todos";

      document.querySelectorAll(".filter-chip").forEach(chip => {
        chip.classList.toggle("active", chip === boton);
      });

      renderizarEventos();
    });
  });

  const buscador = obtenerElemento("event-search");

  buscador?.addEventListener("input", () => {
    busquedaActual = buscador.value || "";
    renderizarEventos();
  });
}


/* 9. DETALLE DEL EVENTO */

function abrirDetalleEvento(evento) {
  if (!evento) return;

  eventoSeleccionado = evento;

  const modal = obtenerElemento("event-modal");
  const contenido = obtenerElemento("event-modal-content");

  if (!modal || !contenido) return;

  const nombre = escaparHTML(evento.nombre || "Evento EventPass");
  const categoria = escaparHTML(obtenerCategoria(evento));
  const descripcion = escaparHTML(obtenerDescripcion(evento));
  const imagen = obtenerImagenEvento(evento);

  const cupos = evento.cupos_disponibles ??
    evento.cuposDisponibles ??
    null;

  const imagenHTML = imagen
    ? `<div class="event-visual">
         <img class="event-thumbnail" src="${imagen}" alt="${nombre}">
       </div>`
    : "";

  const datosCupos = cupos !== null
    ? `<p><strong>Cupos disponibles:</strong> ${escaparHTML(cupos)}</p>`
    : "";

  contenido.innerHTML = `
    ${imagenHTML}

    <p class="event-category">${categoria}</p>
    <h2>${nombre}</h2>
    <p>${descripcion}</p>

    <p><strong>Fecha:</strong> ${escaparHTML(obtenerFecha(evento))}</p>
    <p><strong>Lugar:</strong> ${escaparHTML(obtenerLugar(evento))}</p>
    ${datosCupos}

    <button
      type="button"
      class="btn-primary"
      id="btn-inscribirse-evento"
      ${modoDemostracion ? "disabled" : ""}
    >
      ${modoDemostracion ? "Catálogo de demostración" : "Inscribirme"}
    </button>

    ${
      modoDemostracion
        ? '<p class="notice">La inscripción requiere conexión con n8n.</p>'
        : ""
    }
  `;

  contenido.querySelector("#btn-inscribirse-evento")
    ?.addEventListener("click", iniciarInscripcion);

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function cerrarModal(id) {
  const modal = obtenerElemento(id);

  if (!modal) return;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
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
    });
  });

  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", evento => {
      if (evento.target === modal) {
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


/* 10. LEER LOS CAMPOS DE UN FORMULARIO */

function obtenerValorCampo(formulario, selectores) {
  for (const selector of selectores) {
    const campo = formulario.querySelector(selector);

    if (campo) {
      return campo.value.trim();
    }
  }

  return "";
}


/* 11. FORMULARIOS: REGISTRO E INICIO DE SESIÓN */

function configurarFormularios() {
  const formularioIngreso = obtenerElemento("login-form");
  const formularioRegistro = obtenerElemento("register-form");

  formularioIngreso?.addEventListener("submit", async evento => {
    evento.preventDefault();

    // No se envían credenciales hasta confirmar el contrato
    // de entrada y salida de WF02_sesiones.
    mostrarAviso(
      "El inicio de sesión requiere conectar y validar el flujo WF02_sesiones."
    );
  });

  formularioRegistro?.addEventListener("submit", async evento => {
    evento.preventDefault();

    const nombre = obtenerValorCampo(formularioRegistro, [
      '[name="nombre"]',
      '[name="name"]',
      'input[type="text"]'
    ]);

    const correo = obtenerValorCampo(formularioRegistro, [
      '[name="correo"]',
      '[name="email"]',
      'input[type="email"]'
    ]);

    const contrasena = obtenerValorCampo(formularioRegistro, [
      '[name="contrasena"]',
      '[name="password"]',
      'input[type="password"]'
    ]);

    if (!nombre || !correo || !contrasena) {
      mostrarAviso("Completa el nombre, correo y contraseña.");
      return;
    }

    if (modoDemostracion) {
      mostrarAviso(
        "No se puede registrar desde el catálogo de demostración."
      );
      return;
    }

    const boton = formularioRegistro.querySelector(
      'button[type="submit"], input[type="submit"]'
    );

    if (boton) {
      boton.disabled = true;
    }

    try {
      /*
       * CONTRATO PENDIENTE DE CONFIRMAR:
       * Este objeto utiliza nombre, correo y contrasena.
       * Antes de considerar el registro terminado, debemos
       * verificar que WF01 espere exactamente estas claves
       * y que gestione la contraseña de forma segura.
       */
      const resultado = await solicitarJSON(API_USUARIOS, {
        method: "POST",
        body: JSON.stringify({
          nombre,
          correo,
          contrasena
        })
      });

      console.info("Respuesta de WF01:", resultado);

      mostrarAviso(
        resultado?.mensaje ||
        resultado?.message ||
        "Solicitud enviada a WF01. Verifica la respuesta del workflow."
      );

      // No afirmamos que la cuenta se creó si WF01 no lo confirma.
    } catch (error) {
      console.error("Error al registrar usuario:", error);

      mostrarAviso(
        `No fue posible completar el registro: ${error.message}`
      );
    } finally {
      if (boton) {
        boton.disabled = false;
      }
    }
  });
}


/* 12. INSCRIPCIONES */

async function iniciarInscripcion() {
  if (!eventoSeleccionado) return;

  if (modoDemostracion) {
    mostrarAviso("La inscripción no está disponible en modo demostración.");
    return;
  }

  // WF06 requiere una sesión/usuario y el identificador del evento.
  // No enviamos una inscripción incompleta ni inventamos esos datos.
  mostrarAviso(
    "Antes de inscribirte debemos conectar WF02 (sesiones) y confirmar el formato que espera WF06."
  );
}


/* 13. NAVEGACIÓN MÓVIL */

function configurarMenuMovil() {
  const botonMenu = document.querySelector(
    ".menu-toggle, #menu-toggle, [data-menu-toggle]"
  );

  const navegacion = document.querySelector(
    ".nav-links, #nav-links, [data-nav-links]"
  );

  if (!botonMenu || !navegacion) return;

  botonMenu.addEventListener("click", () => {
    const abierto = navegacion.classList.toggle("active");

    botonMenu.setAttribute("aria-expanded", String(abierto));
  });

  navegacion.querySelectorAll("a").forEach(enlace => {
    enlace.addEventListener("click", () => {
      navegacion.classList.remove("active");
      botonMenu.setAttribute("aria-expanded", "false");
    });
  });
}


/* 14. INICIALIZACIÓN */

document.addEventListener("DOMContentLoaded", () => {
  configurarFiltros();
  configurarModales();
  configurarFormularios();
  configurarMenuMovil();
  cargarEventos();
});
