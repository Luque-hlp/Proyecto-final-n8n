/**
 * UrbanIA - Proxy Local Anti-CORS
 * Corre en tu máquina en puerto 3000 y reenvía todo a ngrok.
 *
 * USO:
 *   1. node proxy.js
 *   2. En config.js cambia BASE_URL a "http://localhost:3000"
 *
 * INSTALAR (solo la primera vez):
 *   npm install express http-proxy-middleware cors
 */

const express    = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors       = require('cors');

const app = express();

// ── ACTUALIZA ESTO con tu URL de ngrok actual ──────────────────────────────
const NGROK_URL = 'https://coherent-matron-barrier.ngrok-free.app';
// ──────────────────────────────────────────────────────────────────────────

// Permitir cualquier origen (resuelve el CORS del navegador)
app.use(cors({ origin: '*', methods: ['GET','POST','OPTIONS'], allowedHeaders: '*' }));
app.options('*', cors());

// Reenviar TODO a ngrok con el header que ngrok necesita
app.use('/', createProxyMiddleware({
    target:       NGROK_URL,
    changeOrigin: true,
    on: {
        proxyReq: (proxyReq) => {
            proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
        }
    }
}));

app.listen(3000, () => {
    console.log('');
    console.log('✅ Proxy UrbanIA corriendo en http://localhost:3000');
    console.log(`   → Redirigiendo a: ${NGROK_URL}`);
    console.log('');
    console.log('   En config.js usa:  BASE_URL = "http://localhost:3000"');
    console.log('   Recuerda actualizar NGROK_URL aquí si ngrok cambia de URL.');
    console.log('');
});