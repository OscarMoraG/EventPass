const API_CATALOGO = "http://localhost:5678/webhook/catalogo";

async function cargarEventos() {
    const contenedor = document.getElementById("eventos-container");

    if (!contenedor) {
        console.error("No se encontró el contenedor de eventos.");
        return;
    }

    try {
        const respuesta = await fetch(API_CATALOGO);

        if (!respuesta.ok) {
            throw new Error("Error al consultar el catálogo");
        }

        const resultado = await respuesta.json();

        const eventos = Array.isArray(resultado)
            ? resultado
            : [resultado];

        contenedor.innerHTML = "";

        if (eventos.length === 0) {
            contenedor.innerHTML = "<p>No hay eventos disponibles.</p>";
            return;
        }

        eventos.forEach(evento => {
            const tarjeta = document.createElement("div");

            tarjeta.innerHTML = `
                <h3>${evento.nombre}</h3>
                <p>${evento.categoria}</p>
                <p>📍 ${evento.lugar}</p>
                <p>📅 ${evento.fecha}</p>
                <p>🕐 ${evento.hora}</p>
                <p>Cupos disponibles: ${evento.cupos_disponibles}</p>
                <button>Ver evento</button>
            `;

            contenedor.appendChild(tarjeta);
        });

    } catch (error) {
        console.error("Error cargando eventos:", error);
        contenedor.innerHTML =
            "<p>No fue posible cargar los eventos.</p>";
    }
}

document.addEventListener("DOMContentLoaded", cargarEventos);