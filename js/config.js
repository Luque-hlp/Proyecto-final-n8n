/**
 * UrbanIA - Configuración Global del Sistema
 *
 * ⚠️  MODO PROXY ACTIVO
 *     BASE_URL apunta al proxy local (puerto 3000) que reenvía a ngrok.
 *     Esto resuelve el bloqueo CORS del navegador con localhost.
 *
 *     Si cambias la URL de ngrok, actualiza NGROK_URL en proxy.js
 *     (no necesitas tocar este archivo).
 */
const CONFIG = {
    WEBHOOKS: {
        // ── Proxy local — NO cambiar mientras el proxy esté corriendo ──────
        BASE_URL: "http://localhost:3000",
        // ────────────────────────────────────────────────────────────────────

        get SUBMIT_INCIDENT() {
            return `${this.BASE_URL}/webhook/reporte-ciudadano`;
        },
        get GET_METRICS() {
            return `${this.BASE_URL}/webhook/metricas-dashboard`;
        },
        get QUERY_TOKEN() {
            return `${this.BASE_URL}/webhook/consultar-caso?token=`;
        }
    },

    MAP: {
        DEFAULT_ZOOM: 16,
        DEFAULT_LAT:   7.067,
        DEFAULT_LNG: -73.167,
        TILE_LAYER:  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },

    VALIDATIONS: {
        MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
        ALLOWED_IMAGE_TYPES:  ['image/jpeg', 'image/png', 'image/webp']
    },

    DASHBOARD: {
        POLLING_INTERVAL_MS: 30_000
    }
};

export default CONFIG;