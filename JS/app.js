const express = require('express');
const app = express();
const path = require('path');

// Configurar EJS (para que las etiquetas <% %> funcionen después)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'HTML')); // Donde tienes tus archivos

// Servir archivos estáticos (CSS, Imágenes, JS)
app.use(express.static(path.join(__dirname)));

// Rutas de navegación
app.get('/', (req, res) => {
    res.render('menu', { successRegister: false }); 
});

app.get('/cliente-registro', (req, res) => {
    res.render('cliente-registro', { successRegister: false });
});

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});