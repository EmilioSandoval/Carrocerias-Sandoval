document.addEventListener('DOMContentLoaded', () => {
    // 1. Lógica de Validación de Formularios
    const formularios = document.querySelectorAll('.form');
    
    formularios.forEach(form => {
        form.addEventListener('submit', (evento) => {
            let esValido = true;
            const campos = form.querySelectorAll('.inputsR');
            // Regex: Al menos una mayúscula y un carácter especial
            const regexSeguridad = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).+$/;

            campos.forEach(campo => {
                campo.style.borderColor = "";
                if (campo.value.trim() === "") {
                    esValido = false;
                    campo.style.borderColor = "#ff4d4d";
                }

                if (campo.type === "password") {
                    const cumpleSeguridad = regexSeguridad.test(campo.value) && campo.value.length >= 8;
                    const adviseBox = form.querySelector('#password-advise');

                    if (!cumpleSeguridad) {
                        esValido = false;
                        campo.style.borderColor = "#ff4d4d";
                        if (adviseBox) adviseBox.style.color = "#ff4d4d";
                    } else {
                        campo.style.borderColor = "#2ecc71";
                        if (adviseBox) adviseBox.style.color = "#2ecc71";
                    }
                }   
            });

            if (!esValido) {
                evento.preventDefault(); 
                console.log("El formulario contiene errores de validación.");
            }
        });
    });

    // 2. Control del Menú Móvil
    const navMenu = document.getElementById('nav-menu'),
          navToggle = document.getElementById('nav-toggle'),
          navClose = document.getElementById('nav-close');

    if(navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.add('show-menu');
        });
    }

    if(navClose) {
        navClose.addEventListener('click', () => {
            navMenu.classList.remove('show-menu');
        });
    }
});

let carritoCotizacion = [];

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(valor);
}

function agregarServicio() {
    const marcaInput = document.getElementById('marca');
    const modeloInput = document.getElementById('modelo');
    const tipoUnidadInput = document.getElementById('tipoUnidad');
    const servicioSelect = document.getElementById('servicio');
    const cantidadInput = document.getElementById('cantidad');

    if (!marcaInput || !modeloInput || !tipoUnidadInput || !servicioSelect || !cantidadInput) return;

    const marca = marcaInput.options[marcaInput.selectedIndex]?.text || '';
    const modelo = modeloInput.value;
    const tipoUnidad = tipoUnidadInput.value;

    const option = servicioSelect.options[servicioSelect.selectedIndex];
    const precio = Number(option.value);
    const nombre = option.dataset.nombre;
    const cantidad = Number(cantidadInput.value);

    if (!marca || !modelo || !tipoUnidad) {
        alert('Selecciona la marca, el modelo y el tipo de unidad.');
        return;
    }

    if (!servicioSelect.value) {
        alert('Selecciona un servicio.');
        return;
    }

    if (cantidad < 1) {
        alert('La cantidad debe ser al menos 1.');
        return;
    }

    const existente = carritoCotizacion.find(item => item.nombre === nombre);

    if (existente) {
        existente.cantidad += cantidad;
        existente.subtotal = existente.cantidad * existente.precio;
    } else {
        carritoCotizacion.push({
            nombre,
            precio,
            cantidad,
            subtotal: precio * cantidad
        });
    }

    cantidadInput.value = 1;
    servicioSelect.selectedIndex = 0;

    renderizarCotizacion();
}

function eliminarServicio(nombre) {
    carritoCotizacion = carritoCotizacion.filter(item => item.nombre !== nombre);
    renderizarCotizacion();
}

function vaciarCotizacion() {
    carritoCotizacion = [];
    renderizarCotizacion();
}

function renderizarCotizacion() {
    const lista = document.getElementById('lista-servicios');
    const totalElemento = document.getElementById('precio-monto');
    const wsLink = document.getElementById('link-whatsapp');
    const marcaInput = document.getElementById('marca');
    const modeloInput = document.getElementById('modelo');
    const tipoUnidadInput = document.getElementById('tipoUnidad');

    if (!lista || !totalElemento || !wsLink) return;

    if (carritoCotizacion.length === 0) {
        lista.innerHTML = `<p class="sin-servicios">No has agregado servicios todavía.</p>`;
        totalElemento.textContent = '$0.00';
        wsLink.href = '#';
        return;
    }

    let total = 0;

    lista.innerHTML = carritoCotizacion.map(item => {
        total += item.subtotal;

        return `
            <div class="item-cotizacion">
                <div class="item-cotizacion-info">
                    <h4>${item.nombre}</h4>
                    <p>${formatearMoneda(item.precio)} x ${item.cantidad}</p>
                </div>
                <div class="item-cotizacion-acciones">
                    <span>${formatearMoneda(item.subtotal)}</span>
                    <button type="button" class="btn-eliminar-item" onclick="eliminarServicio('${item.nombre.replace(/'/g, "\\'")}')">
                        Quitar
                    </button>
                </div>
            </div>
        `;
    }).join('');

    totalElemento.textContent = formatearMoneda(total);

    const marca = marcaInput ? marcaInput.options[marcaInput.selectedIndex]?.text || '' : '';
    const modelo = modeloInput ? modeloInput.value : '';
    const tipoUnidad = tipoUnidadInput ? tipoUnidadInput.value : '';
    const unidad = marca && modelo && tipoUnidad
        ? `${marca} ${modelo} - ${tipoUnidad}`
        : 'sin especificar';

    const mensaje = `Hola, cotización para unidad ${unidad}:

Servicios:
${carritoCotizacion.map(item => `• ${item.nombre} x${item.cantidad} (${formatearMoneda(item.subtotal)})`).join('\n')}

Total estimado: ${formatearMoneda(total)}

Me gustaría más información.`;

    const telefono = "523329552080";
    wsLink.href = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}
document.addEventListener('DOMContentLoaded', () => {
    cargarMarcas();

    const marcaSelect = document.getElementById('marca');
    const modeloSelect = document.getElementById('modelo');
    const tipoUnidadInput = document.getElementById('tipoUnidad');

    if (marcaSelect) {
        marcaSelect.addEventListener('change', async () => {
            const marcaId = marcaSelect.value;

            modeloSelect.innerHTML = '<option value="" selected disabled>Cargando modelos...</option>';
            tipoUnidadInput.value = '';

            try {
                const response = await fetch(`/api/modelos-autobus/${marcaId}`);
                const modelos = await response.json();

                modeloSelect.innerHTML = '<option value="" selected disabled>Selecciona un modelo</option>';

                modelos.forEach(modelo => {
                    const option = document.createElement('option');
                    option.value = modelo.nombre;
                    option.textContent = modelo.nombre;
                    option.dataset.tipoUnidad = modelo.tipo_unidad;
                    modeloSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error al cargar modelos:', error);
                modeloSelect.innerHTML = '<option value="" selected disabled>Error al cargar modelos</option>';
            }
        });
    }

    if (modeloSelect) {
        modeloSelect.addEventListener('change', () => {
            const selectedOption = modeloSelect.options[modeloSelect.selectedIndex];
            tipoUnidadInput.value = selectedOption.dataset.tipoUnidad || '';
        });
    }
});

async function cargarMarcas() {
    const marcaSelect = document.getElementById('marca');
    if (!marcaSelect) return;

    try {
        const response = await fetch('/api/marca-autobus');
        const marcas = await response.json();

        marcaSelect.innerHTML = '<option value="" selected disabled>Selecciona una marca</option>';

        marcas.forEach(marca => {
            const option = document.createElement('option');
            option.value = marca.id;
            option.textContent = marca.nombre;
            marcaSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar marcas:', error);
        marcaSelect.innerHTML = '<option value="" selected disabled>Error al cargar marcas</option>';
    }
}
async function guardarCotizacion() {
    const marcaInput = document.getElementById('marca');
    const modeloInput = document.getElementById('modelo');
    const tipoUnidadInput = document.getElementById('tipoUnidad');

    const marca = marcaInput.options[marcaInput.selectedIndex]?.text || '';
    const modelo = modeloInput.value;
    const tipoUnidad = tipoUnidadInput.value;

    const unidad = `${marca} ${modelo} - ${tipoUnidad}`;
    const total = carritoCotizacion.reduce((sum, item) => sum + item.subtotal, 0);

    try {
        const response = await fetch('/api/cotizaciones', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                unidad,
                total,
                servicios: carritoCotizacion
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'No se pudo guardar la cotización');
        }

        alert(data.mensaje || 'Cotización guardada correctamente');
    } catch (error) {
        console.error('Error:', error);
        alert(`Error al guardar la cotización\n${error.message}`);
    }
}
async function editarPerfil() {
    const nombre = document.getElementById('nombre').value;
    const correo = document.getElementById('correo').value;
    const telefono = document.getElementById('telefono').value;

    try {
        const response = await fetch('/api/editar-perfil', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, correo, telefono })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        alert('Perfil actualizado correctamente');
        location.reload();

    } catch (error) {
        alert('Error al actualizar perfil');
        console.error(error);
    }
}
async function eliminarPerfil() {
    const confirmacion = confirm("¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.");

    if (!confirmacion) return;

    try {
        const response = await fetch('/api/eliminar-perfil', {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        alert('Cuenta eliminada correctamente ❌');

        window.location.href = '/';

    } catch (error) {
        console.error(error);
        alert('Error al eliminar cuenta');
    }
}
async function subirFoto() {
    const input = document.getElementById('foto');

    if (!input || !input.files || !input.files[0]) {
        alert('Selecciona una imagen primero');
        return;
    }

    const formData = new FormData();
    formData.append('foto', input.files[0]);

    try {
        const response = await fetch('/api/subir-foto', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        alert('Foto actualizada');
        location.reload();

    } catch (error) {
        console.error(error);
        alert('Error al subir foto');
    }
}
function filtrarClientes() {
    const input = document.getElementById('clientSearch');
    const filtro = input.value.toLowerCase();
    const tabla = document.getElementById('tableClientes');
    const filas = tabla.getElementsByTagName('tr');

    for (let i = 1; i < filas.length; i++) {
        const textoFila = filas[i].textContent.toLowerCase();
        filas[i].style.display = textoFila.includes(filtro) ? '' : 'none';
    }
}