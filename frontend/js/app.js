
/* ==========================================================
   EVENTPASS — CRÓNICAS DEL REINO
   Catálogo, miniaturas, filtros, modales y navegación
   ========================================================== */


/* 1. CONFIGURACIÓN DE N8N */

const N8N_BASE_URL = "http://localhost:5678";
const API_CATALOGO = `${N8N_BASE_URL}/webhook/catalogo`;


/* 2. MINIATURAS DE LOS SEIS EVENTOS
   Las imágenes están dentro de frontend/assets/.
   Los nombres deben coincidir exactamente con los archivos. */

const IMAGENES_EVENTOS = {
  "festival de tecnología bucaramanga":
    "./assets/festival-tecnologia-bucaramanga.png",

  "feria de emprendimiento santander":
    "./assets/feria-emprendimiento-santander.png",

  "festival cultural bucaramanga":
    "./assets/festival-cultural-bucaramanga.png",

  "carrera deportiva eventpass":
    "./assets/carrera-deportiva-eventpass.png",

  "taller de innovación":
    "./assets/taller-de-innovacion.png",

  "encuentro cultural eventpass":
    "./assets/encuentro-cultural-eventpass.png"
};


/* 3. EVENTOS DE DEMOSTRACIÓN
   Se utilizan solamente si n8n no responde.
   Sus fechas y cupos son ilustrativos, no datos reales. */

const EVENTOS_DEMO = [
  {
    evento_id: "demo-1",
    nombre: "Festival de Tecnología Bucaramanga",
    categoria: "Tecnología",
    descripcion: "Evento de prueba de EventPass sobre tecnología e innovación.",
    fecha: "2026-10-24",
    hora: "09:00",
    lugar: "Bucaramanga, Santander",
    cupos_disponibles: 150
  },
  {
    evento_id: "demo-2",
    nombre: "Feria de Emprendimiento Santander",
    categoria: "Entretenimiento",
    descripcion: "Feria de emprendimiento e innovación de Santander.",
    fecha: "2026-10-31",
    hora: "10:00",
    lugar: "Bucaramanga, Santander",
    cupos_disponibles: 120
  },
  {
    evento_id: "demo-3",
    nombre: "Festival Cultural Bucaramanga",
    categoria: "Cultura",
    descripcion: "Festival cultural con música, arte y expresiones culturales.",
    fecha: "2026-11-07",
    hora: "16:00",
    lugar: "Bucaramanga, Santander",
    cupos_disponibles: 200
  },
  {
    evento_id: "demo-4",
    nombre: "Carrera Deportiva EventPass",
    categoria: "Deportes",
    descripcion: "Evento deportivo y carrera recreativa para la comunidad.",
    fecha: "2026-11-15",
    hora: "07:00",
    lugar: "Bucaramanga, Santander",
    cupos_disponibles: 300
  },
  {
    evento_id: "demo-5",
    nombre: "Taller de Innovación",
    categoria: "Educación",
    descripcion: "Taller práctico sobre innovación y nuevas tecnologías.",
    fecha: "2026-11-21",
    hora: "14:00",
    lugar: "Bucaramanga, Santander",
    cupos_disponibles: 40
  },
  {
    evento_id: "demo-6",
    nombre: "Encuentro Cultural EventPass",
    categoria: "Cultura",
    descripcion: "Encuentro cultural con música, arte y actividades para la comunidad.",
    fecha: "2026-11-28",
    hora: "15:00",
    lugar: "Bucaramanga, Santander",
    cupos_disponibles: 100
  }
];


/* 4. ICONOS Y TEMAS VISUALES */

const ICONOS_CATEGORIA = {
  "Tecnología": "⌘",
  "Emprendimiento": "⚒",
  "Cultura": "♫",
  "Deportes": "⚔",
  "General": "✦"
};

const TEMAS_CATEGORIA = {
  "Tecnología": "tech",
  "Emprendimiento": "commerce",
  "Cultura": "culture",
  "Deportes": "sport",
  "General": "innovation"
};


/* 5. ESTADO DE LA APLICACIÓN */

let eventos = [];
let categoriaActiva = "Todos";
let busqueda = "";
let usandoDatosDemo = false;
let temporizadorNotificacion = null;


/* 6. FUNCIONES AUXILIARES */

function obtenerElemento(id) {
  return document.getElementById(id);
}


function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caracter]);
}


function normalizarTexto(valor) {
  return String(valor ?? "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFC");
}


function formatearFecha(valor) {
  if (!valor) return "Fecha por confirmar";

  const texto = String(valor).trim();
  const fecha = new Date(`${texto.slice(0, 10)}T12:00:00`);

  if (Number.isNaN(fecha.getTime())) {
    return texto;
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(fecha);
}


function formatearHora(valor) {
  if (!valor) return "Hora por confirmar";

  return String(valor).trim().slice(0, 5);
}


/* 7. CATEGORÍAS
   También utiliza el nombre del evento para corregir
   categorías como "Entretenimiento" o "Educación". */

function obtenerCategoria(evento) {
  const nombre = normalizarTexto(evento.nombre);
  const categoriaOriginal = String(evento.categoria || "General").trim();
  const categoria = normalizarTexto(categoriaOriginal);

  if (
    nombre.includes("festival de tecnologia") ||
    nombre.includes("taller de innovacion") ||
    categoria.includes("tecnolog") ||
    categoria.includes("innov")
  ) {
    return "Tecnología";
  }

  if (
    nombre.includes("feria de emprendimiento") ||
    categoria.includes("emprend")
  ) {
    return "Emprendimiento";
  }

  if (
    nombre.includes("carrera deportiva") ||
    categoria.includes("deport") ||
    categoria.includes("carrer")
  ) {
    return "Deportes";
  }

  if (
    nombre.includes("festival cultural") ||
    nombre.includes("encuentro cultural") ||
    categoria.includes("cultur") ||
    categoria.includes("music")
  ) {
    return "Cultura";
  }

  return categoriaOriginal || "General";
}


/* 8. OBTENER MINIATURA SEGÚN EL EVENTO */

function obtenerImagenEvento(evento) {
  const nombre = normalizarTexto(evento.nombre);

  return IMAGENES_EVENTOS[nombre] || "";
}


/* 9. NORMALIZAR RESPUESTA DEL CATÁLOGO */

function normalizarRespuesta(resultado) {
  if (Array.isArray(resultado)) {
    return resultado;
  }

  if (resultado && Array.isArray(resultado.data)) {
    return resultado.data;
  }

  if (resultado && Array.isArray(resultado.eventos)) {
    return resultado.eventos;
  }

  if (
    resultado &&
    typeof resultado === "object" &&
    (resultado.nombre || resultado.evento_id)
  ) {
    return [resultado];
  }

  return [];
}


/* 10. NOTIFICACIONES */

function mostrarAviso(mensaje) {
  const toast = obtenerElemento("site-toast");

  if (!toast) {
    console.info(mensaje);
    return;
  }

  toast.textContent = mensaje;
  toast.classList.add("show");

  clearTimeout(temporizadorNotificacion);

  temporizadorNotificacion = setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}


/* 11. CONSULTAR EVENTOS EN N8N */

async function cargarEventos() {
  const contenedor = obtenerElemento("eventos-container");

  if (contenedor) {
    contenedor.setAttribute("aria-busy", "true");
    contenedor.innerHTML = `
      <p class="loading">
        Consultando los pergaminos del reino...
      </p>
    `;
  }

  try {
    const respuesta = await fetch(API_CATALOGO, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    if (!respuesta.ok) {
      throw new Error(`Error HTTP ${respuesta.status}`);
    }

    const resultado = await respuesta.json();
    const datos = normalizarRespuesta(resultado);

    if (datos.length === 0) {
      throw new Error("El catálogo no devolvió eventos reconocibles.");
    }

    eventos = datos;
    usandoDatosDemo = false;

    renderizarEventos();

  } catch (error) {
    console.warn(
      "No fue posible consultar el catálogo de n8n:",
      error.message
    );

    eventos = EVENTOS_DEMO.map(evento => ({ ...evento }));
    usandoDatosDemo = true;

    renderizarEventos();

    mostrarAviso(
      "Vista de demostración: no se pudo conectar con el catálogo de n8n."
    );

  } finally {
    if (contenedor) {
      contenedor.setAttribute("aria-busy", "false");
    }
  }
}


/* 12. INFORMACIÓN DE CUPOS */

function obtenerTextoCupos(evento) {
  const valor = evento.cupos_disponibles;

  if (valor === undefined || valor === null || valor === "") {
    return "Disponibilidad por confirmar";
  }

  const cupos = Number(valor);

  if (!Number.isFinite(cupos)) {
    return "Disponibilidad por confirmar";
  }

  if (cupos <= 0) {
    return "Sin cupos disponibles";
  }

  return `${cupos} cupos disponibles`;
}


/* 13. DIBUJAR TARJETAS DEL CATÁLOGO */

function renderizarEventos() {
  const contenedor = obtenerElemento("eventos-container");
  const contador = obtenerElemento("event-count");

  if (!contenedor) return;

  const filtrados = eventos.filter(evento => {
    const categoria = obtenerCategoria(evento);

    const coincideCategoria =
      categoriaActiva === "Todos" ||
      categoria === categoriaActiva;

    const textoBusqueda = [
      evento.nombre,
      evento.categoria,
      evento.lugar,
      evento.descripcion
    ].join(" ");

    const coincideBusqueda = normalizarTexto(textoBusqueda)
      .includes(normalizarTexto(busqueda));

    return coincideCategoria && coincideBusqueda;
  });

  if (contador) {
    contador.textContent = String(filtrados.length).padStart(2, "0");
  }

  if (filtrados.length === 0) {
    contenedor.innerHTML = `
      <div class="empty">
        <p>No encontramos aventuras con esos criterios.</p>
        <button
          class="button outline"
          type="button"
          id="limpiar-filtros"
        >
          Ver todas las aventuras
        </button>
      </div>
    `;

    obtenerElemento("limpiar-filtros")?.addEventListener("click", () => {
      categoriaActiva = "Todos";
      busqueda = "";

      const campo = obtenerElemento("event-search");

      if (campo) {
        campo.value = "";
      }

      actualizarFiltros();
      renderizarEventos();
    });

    return;
  }

  contenedor.innerHTML = filtrados.map((evento, indice) => {
    const categoria = obtenerCategoria(evento);
    const tema = TEMAS_CATEGORIA[categoria] || "innovation";
    const icono = ICONOS_CATEGORIA[categoria] || ICONOS_CATEGORIA.General;
    const imagen = obtenerImagenEvento(evento);

    const visual = imagen
      ? `
        <div class="event-visual" data-theme="${escaparHTML(tema)}">
          <img
            class="event-thumbnail"
            src="${escaparHTML(imagen)}"
            alt="${escaparHTML(evento.nombre || "Imagen del evento")}"
            loading="lazy"
          >
        </div>
      `
      : `
        <div class="event-visual" data-theme="${escaparHTML(tema)}">
          <span class="event-symbol" aria-hidden="true">${icono}</span>
        </div>
      `;

    return `
      <article class="event-card">
        ${visual}

        <div class="event-body">

          <span class="event-category">
            ${escaparHTML(categoria)}
          </span>

          <h3>
            ${escaparHTML(evento.nombre || "Evento sin nombre")}
          </h3>

          <p class="event-description">
            ${escaparHTML(
              evento.descripcion ||
              "Los detalles de esta aventura estarán disponibles próximamente."
            )}
          </p>

          <div class="event-meta">
            <span>
              <span class="meta-icon" aria-hidden="true">✧</span>
              ${escaparHTML(formatearFecha(evento.fecha))}
            </span>

            <span>
              <span class="meta-icon" aria-hidden="true">◷</span>
              ${escaparHTML(formatearHora(evento.hora))}
            </span>

            <span>
              <span class="meta-icon" aria-hidden="true">⌖</span>
              ${escaparHTML(evento.lugar || "Lugar por confirmar")}
            </span>
          </div>

          <div class="event-card-bottom">
            <span class="seats">
              ${escaparHTML(obtenerTextoCupos(evento))}
            </span>

            <button
              class="event-open"
              type="button"
              data-event-index="${indice}"
            >
              Descubrir <span aria-hidden="true">→</span>
            </button>
          </div>

        </div>
      </article>
    `;
  }).join("");

  contenedor.querySelectorAll("[data-event-index]").forEach(boton => {
    boton.addEventListener("click", () => {
      const indice = Number(boton.dataset.eventIndex);
      const evento = filtrados[indice];

      if (evento) {
        abrirDetalleEvento(evento);
      }
    });
  });
}


/* 14. BUSCADOR Y FILTROS */

function actualizarFiltros() {
  document.querySelectorAll(".filter-chip").forEach(boton => {
    const activa = boton.dataset.category === categoriaActiva;

    boton.classList.toggle("active", activa);
    boton.setAttribute("aria-pressed", String(activa));
  });
}


function configurarFiltros() {
  document.querySelectorAll(".filter-chip").forEach(boton => {
    boton.addEventListener("click", () => {
      categoriaActiva = boton.dataset.category || "Todos";

      actualizarFiltros();
      renderizarEventos();
    });
  });

  const campo = obtenerElemento("event-search");

  campo?.addEventListener("input", evento => {
    busqueda = evento.target.value;
    renderizarEventos();
  });
}


/* 15. DETALLE DE EVENTO */

function abrirDetalleEvento(evento) {
  const contenido = obtenerElemento("event-modal-content");

  if (!contenido) return;

  const nombre = escaparHTML(evento.nombre || "Evento sin nombre");
  const categoria = escaparHTML(obtenerCategoria(evento));
  const descripcion = escaparHTML(
    evento.descripcion || "No hay descripción disponible."
  );
  const imagen = obtenerImagenEvento(evento);

  contenido.innerHTML = `
    ${
      imagen
        ? `
          <div class="event-visual" data-theme="innovation">
            <img
              class="event-thumbnail"
              src="${escaparHTML(imagen)}"
              alt="${nombre}"
            >
          </div>
        `
        : ""
    }

    <p class="modal-kicker">${categoria}</p>

    <h2 id="event-modal-title">${nombre}</h2>

    <p class="modal-description-text">${descripcion}</p>

    <div class="modal-meta">
      <span>✧ Fecha: ${escaparHTML(formatearFecha(evento.fecha))}</span>
      <span>◷ Hora: ${escaparHTML(formatearHora(evento.hora))}</span>
      <span>⌖ Lugar: ${escaparHTML(evento.lugar || "Lugar por confirmar")}</span>
      <span>⚑ ${escaparHTML(obtenerTextoCupos(evento))}</span>
    </div>

    <p class="notice">
      ${
        usandoDatosDemo
          ? "Información de demostración. No se enviará ninguna inscripción."
          : "La inscripción requiere conectar y verificar el flujo correspondiente de n8n."
      }
    </p>

    <button
      class="button gold full"
      type="button"
      id="boton-inscripcion"
      ${usandoDatosDemo ? "disabled" : ""}
    >
      Solicitar inscripción
    </button>
  `;

  abrirModal("event-modal");

  obtenerElemento("boton-inscripcion")?.addEventListener("click", () => {
    mostrarAviso(
      "La inscripción todavía requiere conectar y verificar el webhook de WF06."
    );
  });
}


/* 16. CONTROL DE MODALES */

function abrirModal(id) {
  const modal = obtenerElemento(id);

  if (!modal) {
    console.warn(`No se encontró el modal: ${id}`);
    return;
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");

  modal.querySelector("[data-close-modal]")?.focus();
}


function cerrarModal(modal) {
  if (!modal) return;

  modal.hidden = true;

  const quedaOtroAbierto = Array.from(
    document.querySelectorAll(".modal-backdrop")
  ).some(elemento => !elemento.hidden);

  document.body.classList.toggle("modal-open", quedaOtroAbierto);
}


function configurarModales() {
  document.querySelectorAll("[data-open-modal]").forEach(boton => {
    boton.addEventListener("click", () => {
      const destino = boton.dataset.openModal;

      document.querySelectorAll(".modal-backdrop").forEach(modal => {
        cerrarModal(modal);
      });

      abrirModal(destino);
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach(boton => {
    boton.addEventListener("click", () => {
      cerrarModal(boton.closest(".modal-backdrop"));
    });
  });

  document.querySelectorAll(".modal-backdrop").forEach(modal => {
    modal.addEventListener("click", evento => {
      if (evento.target === modal) {
        cerrarModal(modal);
      }
    });
  });

  document.addEventListener("keydown", evento => {
    if (evento.key === "Escape") {
      document.querySelectorAll(".modal-backdrop").forEach(modal => {
        if (!modal.hidden) {
          cerrarModal(modal);
        }
      });
    }
  });
}


/* 17. FORMULARIOS
   Los avisos no crean cuentas ni validan credenciales en n8n. */

function configurarFormularios() {
  const formularioIngreso = obtenerElemento("login-form");
  const formularioRegistro = obtenerElemento("register-form");

  formularioIngreso?.addEventListener("submit", evento => {
    evento.preventDefault();

    mostrarAviso(
      "El inicio de sesión aún no está conectado al flujo de autenticación."
    );
  });

  formularioRegistro?.addEventListener("submit", evento => {
    evento.preventDefault();

    mostrarAviso(
      "El registro aún no está conectado al webhook de usuarios WF01."
    );
  });
}


/* 18. MENÚ PARA MÓVILES */

function configurarMenuMovil() {
  const boton = obtenerElemento("menu-toggle");
  const navegacion = obtenerElemento("main-nav");

  if (!boton || !navegacion) return;

  boton.addEventListener("click", () => {
    const abierto = navegacion.classList.toggle("open");

    boton.setAttribute("aria-expanded", String(abierto));
    boton.setAttribute(
      "aria-label",
      abierto ? "Cerrar menú" : "Abrir menú"
    );
  });

  navegacion.querySelectorAll("a").forEach(enlace => {
    enlace.addEventListener("click", () => {
      navegacion.classList.remove("open");
      boton.setAttribute("aria-expanded", "false");
      boton.setAttribute("aria-label", "Abrir menú");
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      navegacion.classList.remove("open");
      boton.setAttribute("aria-expanded", "false");
      boton.setAttribute("aria-label", "Abrir menú");
    }
  });
}


/* 19. INICIAR EVENTPASS */

document.addEventListener("DOMContentLoaded", () => {
  configurarFiltros();
  configurarModales();
  configurarFormularios();
  configurarMenuMovil();

  cargarEventos();
});
