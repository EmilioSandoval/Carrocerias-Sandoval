document.addEventListener('DOMContentLoaded', () => {

    const formularios = document.querySelectorAll('.form');
    const regexSeguridad = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).+$/;

    formularios.forEach(form => {
        const adviseBox = form.querySelector('#password-advise');
        const esFormularioRegistro = !!adviseBox; 

        form.addEventListener('submit', (evento) => {
            let esValido = true;
            const campos = form.querySelectorAll('.inputsR');

            campos.forEach(campo => {
                campo.style.borderColor = '';

                if (campo.value.trim() === '') {
                    esValido = false;
                    campo.style.borderColor = '#ff4d4d';
                }

                if (campo.type === 'password' && esFormularioRegistro) {
                    const cumple = regexSeguridad.test(campo.value) && campo.value.length >= 8;
                    if (!cumple) {
                        esValido = false;
                        campo.style.borderColor = '#ff4d4d';
                        if (adviseBox) adviseBox.style.color = '#ff4d4d';
                    } else {
                        campo.style.borderColor = '#2ecc71';
                        if (adviseBox) adviseBox.style.color = '#2ecc71';
                    }
                }
            });

            if (!esValido) {
                evento.preventDefault();
            }
        });
    });

    const btnToggle     = document.getElementById('btnToggle');
    const passwordInput = document.getElementById('password');
    const eyeIcon       = document.getElementById('eyeIcon');

    if (btnToggle && passwordInput) {
        btnToggle.addEventListener('click', () => {
            const esTexto = passwordInput.getAttribute('type') === 'text';
            passwordInput.setAttribute('type', esTexto ? 'password' : 'text');
            if (eyeIcon) {
                eyeIcon.classList.toggle('ri-eye-line',     esTexto);
                eyeIcon.classList.toggle('ri-eye-off-line', !esTexto);
            }
        });
    }

    const navMenu   = document.getElementById('nav-menu');
    const navToggle = document.getElementById('nav-toggle');
    const navClose  = document.getElementById('nav-close');

    if (navToggle) navToggle.addEventListener('click', () => navMenu.classList.add('show-menu'));
    if (navClose)  navClose.addEventListener('click',  () => navMenu.classList.remove('show-menu'));

    if (document.getElementById('marca')) {
        cargarMarcas();
    }

    const marcaSelect     = document.getElementById('marca');
    const modeloSelect    = document.getElementById('modelo');
    const tipoUnidadInput = document.getElementById('tipoUnidad');

    if (marcaSelect) {
        marcaSelect.addEventListener('change', async () => {
            const marcaId = marcaSelect.value;
            modeloSelect.innerHTML = '<option value="" disabled selected>Cargando modelos...</option>';
            if (tipoUnidadInput) tipoUnidadInput.value = '';

            try {
                const res    = await fetch(`/api/modelos-autobus/${marcaId}`);
                const modelos = await res.json();

                modeloSelect.innerHTML = '<option value="" disabled selected>Selecciona un modelo</option>';
                modelos.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value              = m.nombre;
                    opt.textContent        = m.nombre;
                    opt.dataset.tipoUnidad = m.tipo_unidad;
                    modeloSelect.appendChild(opt);
                });
            } catch (err) {
                console.error('Error al cargar modelos:', err);
                modeloSelect.innerHTML = '<option value="" disabled selected>Error al cargar modelos</option>';
            }
        });
    }

    if (modeloSelect) {
        modeloSelect.addEventListener('change', () => {
            const opt = modeloSelect.options[modeloSelect.selectedIndex];
            if (tipoUnidadInput) tipoUnidadInput.value = opt.dataset.tipoUnidad || '';
        });
    }
    const inputFoto       = document.getElementById('foto');
    const nombreArchivoEl = document.getElementById('nombre-archivo');

    if (inputFoto && nombreArchivoEl) {
        inputFoto.addEventListener('change', () => {
            nombreArchivoEl.textContent = inputFoto.files[0]
                ? inputFoto.files[0].name
                : 'Ningún archivo seleccionado';
        });
    }
});

let carritoCotizacion = [];

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

function agregarServicio() {
    const marcaInput      = document.getElementById('marca');
    const modeloInput     = document.getElementById('modelo');
    const tipoUnidadInput = document.getElementById('tipoUnidad');
    const servicioSelect  = document.getElementById('servicio');
    const cantidadInput   = document.getElementById('cantidad');

    if (!marcaInput || !modeloInput || !tipoUnidadInput || !servicioSelect || !cantidadInput) return;

    const marca     = marcaInput.options[marcaInput.selectedIndex]?.text || '';
    const modelo    = modeloInput.value;
    const tipoUnidad = tipoUnidadInput.value;

    if (!marca || !modelo || !tipoUnidad) {
        alert('Selecciona la marca, el modelo y el tipo de unidad.');
        return;
    }
    if (!servicioSelect.value) {
        alert('Selecciona un servicio.');
        return;
    }

    const option   = servicioSelect.options[servicioSelect.selectedIndex];
    const precio   = Number(option.value);
    const nombre   = option.dataset.nombre;
    const cantidad = Number(cantidadInput.value);

    if (cantidad < 1) {
        alert('La cantidad debe ser al menos 1.');
        return;
    }

    const existente = carritoCotizacion.find(item => item.nombre === nombre);
    if (existente) {
        existente.cantidad += cantidad;
        existente.subtotal  = existente.cantidad * existente.precio;
    } else {
        carritoCotizacion.push({ nombre, precio, cantidad, subtotal: precio * cantidad });
    }

    cantidadInput.value         = 1;
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
    const lista        = document.getElementById('lista-servicios');
    const totalEl      = document.getElementById('precio-monto');
    const wsLink       = document.getElementById('link-whatsapp');
    const marcaInput   = document.getElementById('marca');
    const modeloInput  = document.getElementById('modelo');
    const tipoInput    = document.getElementById('tipoUnidad');

    if (!lista || !totalEl || !wsLink) return;

    if (carritoCotizacion.length === 0) {
        lista.innerHTML    = `<p class="sin-servicios">No has agregado servicios todavía.</p>`;
        totalEl.textContent = '$0.00';
        wsLink.href        = '#';
        return;
    }

    let total = 0;
    lista.innerHTML = carritoCotizacion.map(item => {
        total += item.subtotal;
        return `
            <div class="item-cotizacion">
                <div class="item-cotizacion-info">
                    <h4>${item.nombre}</h4>
                    <p>${formatearMoneda(item.precio)} × ${item.cantidad}</p>
                </div>
                <div class="item-cotizacion-acciones">
                    <span>${formatearMoneda(item.subtotal)}</span>
                    <button type="button" class="btn-eliminar-item"
                        onclick="eliminarServicio('${item.nombre.replace(/'/g, "\\'")}')">
                        Quitar
                    </button>
                </div>
            </div>`;
    }).join('');

    totalEl.textContent = formatearMoneda(total);

    const marca     = marcaInput  ? marcaInput.options[marcaInput.selectedIndex]?.text || '' : '';
    const modelo    = modeloInput ? modeloInput.value : '';
    const tipoUnidad = tipoInput  ? tipoInput.value   : '';
    const unidad    = (marca && modelo && tipoUnidad)
        ? `${marca} ${modelo} - ${tipoUnidad}`
        : 'sin especificar';

    const mensaje = `Hola, cotización para unidad ${unidad}:\n\nServicios:\n`
        + carritoCotizacion.map(i => `• ${i.nombre} x${i.cantidad} (${formatearMoneda(i.subtotal)})`).join('\n')
        + `\n\nTotal estimado: ${formatearMoneda(total)}\n\nMe gustaría más información.`;

    wsLink.href = `https://wa.me/523329552080?text=${encodeURIComponent(mensaje)}`;
}

async function cargarMarcas() {
    const marcaSelect = document.getElementById('marca');
    if (!marcaSelect) return;
    try {
        const res   = await fetch('/api/marca-autobus');
        const marcas = await res.json();
        marcaSelect.innerHTML = '<option value="" disabled selected>Selecciona una marca</option>';
        marcas.forEach(m => {
            const opt = document.createElement('option');
            opt.value       = m.id;
            opt.textContent = m.nombre;
            marcaSelect.appendChild(opt);
        });
    } catch (err) {
        console.error('Error al cargar marcas:', err);
    }
}

async function guardarCotizacion() {
    const marcaInput  = document.getElementById('marca');
    const modeloInput = document.getElementById('modelo');
    const tipoInput   = document.getElementById('tipoUnidad');

    if (!marcaInput || !modeloInput || !tipoInput) return;
    if (carritoCotizacion.length === 0) {
        alert('Agrega al menos un servicio antes de guardar.');
        return;
    }

    const marca     = marcaInput.options[marcaInput.selectedIndex]?.text || '';
    const modelo    = modeloInput.value;
    const tipoUnidad = tipoInput.value;
    const unidad    = `${marca} ${modelo} - ${tipoUnidad}`;
    const total     = carritoCotizacion.reduce((sum, i) => sum + i.subtotal, 0);

    try {
        const res  = await fetch('/api/cotizaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ unidad, total, servicios: carritoCotizacion })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
        alert(data.mensaje || 'Cotización guardada y enviada a tu correo.');
    } catch (err) {
        console.error(err);
        alert('Error al guardar la cotización: ' + err.message);
    }
}

async function editarPerfil() {
    const nombre   = document.getElementById('nombre')?.value;
    const correo   = document.getElementById('correo')?.value;
    const telefono = document.getElementById('telefono')?.value;

    if (!nombre || !correo) { alert('Nombre y correo son obligatorios.'); return; }

    try {
        const res  = await fetch('/api/editar-perfil', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, correo, telefono })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert('Perfil actualizado correctamente.');
        location.reload();
    } catch (err) {
        console.error(err);
        alert('Error al actualizar perfil: ' + err.message);
    }
}

async function eliminarPerfil() {
    if (!confirm('¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) return;
    try {
        const res  = await fetch('/api/eliminar-perfil', { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert('Cuenta eliminada correctamente.');
        window.location.href = '/';
    } catch (err) {
        console.error(err);
        alert('Error al eliminar cuenta: ' + err.message);
    }
}

async function subirFoto() {
    const input = document.getElementById('foto');
    if (!input?.files?.[0]) { alert('Selecciona una imagen primero.'); return; }

    const formData = new FormData();
    formData.append('foto', input.files[0]);

    try {
        const res  = await fetch('/api/subir-foto', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert('Foto actualizada correctamente.');
        location.reload();
    } catch (err) {
        console.error(err);
        alert('Error al subir foto: ' + err.message);
    }
}

function filtrarClientes() {
    const filtro = document.getElementById('clientSearch').value.toLowerCase();
    const filas  = document.querySelectorAll('#tableClientes tbody tr');
    filas.forEach(fila => {
        fila.style.display = fila.textContent.toLowerCase().includes(filtro) ? '' : 'none';
    });
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon  = btn.querySelector('i');
    if (!input) return;

    const esTexto = input.type === 'text';
    input.type    = esTexto ? 'password' : 'text';
    icon.className = esTexto ? 'ri-eye-line' : 'ri-eye-off-line';
}