const express = require('express');
const app = express();
const path = require('path');
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());

// --- CONFIGURACIÓN CRÍTICA ---
app.use(express.urlencoded({ extended: true })); // Permite leer datos de formularios
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'HTML'));
app.use(express.static(path.join(__dirname)));

// --- RUTAS DE NAVEGACIÓN (GET) ---
app.get('/', (req, res) => res.render('menu'));
app.get('/cliente-registro', (req, res) => res.render('cliente-registro', { successRegister: false }));
app.get('/cliente-inicio', (req, res) => res.render('cliente-inicio'));
app.get('/empleado-registro', (req, res) => res.render('empleado-registro', { successRegister: false }));
app.get('/empleado-inicio', (req, res) => res.render('empleado-inicio'));

// Páginas de destino final
app.get('/pagina-cliente', (req, res) => res.render('pagina-cliente'));
app.get('/pagina-empleado', (req, res) => res.render('pagina-empleado'));

// --- RUTAS DE PROCESAMIENTO (POST) ---
app.post('/cliente-inicio', (req, res) => {
    // Aquí iría la validación de BD. Por ahora, redirigimos directo:
    res.redirect('/pagina-cliente');
});

app.post('/empleado-inicio', (req, res) => {
    res.redirect('/pagina-empleado');
});

app.post('/cliente-registro', (req, res) => {
    // Simulamos registro exitoso y recargamos la página con el mensaje
    res.render('cliente-registro', { successRegister: true });
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));