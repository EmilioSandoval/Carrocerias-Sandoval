document.addEventListener('DOMContentLoaded', () => {
    // 1. Mantener Lógica de Navegación existente
    const botonesMenu = document.querySelectorAll('.btn-menu');
    botonesMenu.forEach(boton => {
        boton.addEventListener('click', (evento) => {
            evento.preventDefault();
            const rutaDestino = boton.getAttribute('href');
            if (rutaDestino && rutaDestino !== '#') {
                window.location.href = rutaDestino;
            }
        });
    });

    // 2. Lógica de Validación Reforzada
    const formularios = document.querySelectorAll('.form');
    
    formularios.forEach(form => {
        form.addEventListener('submit', (evento) => {
            let esValido = true;
            const campos = form.querySelectorAll('.inputsR');

            // Expresión regular: Al menos una mayúscula y un carácter especial
            const regexSeguridad = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).+$/;

            campos.forEach(campo => {
                // Reiniciar estado visual
                campo.style.borderColor = "";

                // Validación de campos vacíos
                if (campo.value.trim() === "") {
                    esValido = false;
                    campo.style.borderColor = "#ff4d4d";
                }

                // Validación avanzada de contraseña
                const adviseBox = form.querySelector('#password-advise');

                if (campo.type === "password") {
                const pass = campo.value;
                const cumpleSeguridad = regexSeguridad.test(pass) && pass.length >= 8;

                if (!cumpleSeguridad) {
                    esValido = false;
                    campo.style.borderColor = "#ff4d4d";
                    adviseBox.classList.add('advise-error'); // Cambia el cuadro a rojo
                    } else {
                    campo.style.borderColor = "#2ecc71";
                    adviseBox.classList.remove('advise-error'); // Vuelve al color original
                }
            }   
            });

            if (!esValido) {
                evento.preventDefault(); // Detiene el envío si falla la validación
            }
        });
    });
});