const express = require('express');
const app = express();
const path = require('path');
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());

// --- CONFIGURACIÓN CRÍTICA ---
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'HTML'));
app.use(express.static(path.join(__dirname)));

// --- RUTAS DE NAVEGACIÓN (GET) ---
app.get('/', (req, res) => res.render('inicio'));
app.get('/cliente-registro', (req, res) => res.render('cliente-registro', { successRegister: false }));
app.get('/cliente-inicio', (req, res) => res.render('cliente-inicio'));
app.get('/empleado-registro', (req, res) => res.render('empleado-registro', { successRegister: false }));
app.get('/empleado-inicio', (req, res) => res.render('empleado-inicio'));
app.get('/menu', (req, res) => res.render('menu'));
app.get('/servicios', (req, res) => res.render('servicios'));
app.get('/trabajos', (req, res) => res.render('trabajos'));
app.get('/contactos', (req, res) => res.render('contactos'));
app.get('/pagina-cliente', (req, res) => res.render('pagina-cliente', { userRole: 'cliente' }));
app.get('/pagina-empleado', (req, res) => res.render('pagina-empleado', { userRole: 'empleado' }));


app.post('/cliente-inicio', (req, res) => res.redirect('/pagina-cliente'));
app.post('/empleado-inicio', (req, res) => res.redirect('/pagina-empleado'));

app.post('/cliente-registro', (req, res) => {
    res.render('cliente-registro', { successRegister: true });
});
app.post('/empleado-registro', (req, res) => {
    res.render('empleado-registro', { successRegister: true });
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));