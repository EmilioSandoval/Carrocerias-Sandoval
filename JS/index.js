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
                if (campo.type === "password") {
                    if (campo.value.length < 8) {
                        esValido = false;
                        alert("La contraseña debe tener al menos 8 caracteres.");
                        campo.style.borderColor = "#ff4d4d";
                    } else if (!regexSeguridad.test(campo.value)) {
                        esValido = false;
                        alert("La contraseña debe incluir al menos una letra mayúscula y un carácter especial (ej: !@#$).");
                        campo.style.borderColor = "#ff4d4d";
                    } else {
                        campo.style.borderColor = "#2ecc71"; // Verde si cumple todo
                    }
                }
            });

            if (!esValido) {
                evento.preventDefault(); // Detiene el envío si falla la validación
            }
        });
    });
});