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