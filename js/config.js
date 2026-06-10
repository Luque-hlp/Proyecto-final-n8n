/**
 * UrbanIA - Configuración Global del Sistema
 * @description Variables de infraestructura y endpoints. Inmutable.
 *
 * ⚠️  INSTRUCCIÓN DE DESPLIEGUE:
 *     Al reiniciar ngrok, actualizar ÚNICAMENTE el valor de BASE_URL.
 *     El resto de rutas se construyen automáticamente.
 *     Ejemplo: "https://xxxx-xxxx.ngrok-free.app"  ← sin barra final
 */
const CONFIG = {
    WEBHOOKS: {
        // ─── ACTUALIZAR AQUÍ AL REINICIAR NGROK ───────────────────────────
        BASE_URL: "https://coherent-matron-barrier.ngrok-free.app",
        // ──────────────────────────────────────────────────────────────────

        /**
         * POST — Recibe el formulario multipart con imagen y datos del incidente.
         * n8n Webhook Path: /webhook/urbania/submit
         */
        get SUBMIT_INCIDENT() {
            return `${this.BASE_URL}https://coherent-matron-barrier.ngrok-free.dev/webhook-test/reporte-ciudadano`;
        },

        /**
         * GET — Devuelve métricas globales desde Google Sheets (totales, criticos).
         * n8n Webhook Path: /webhook/urbania/metrics
         */
        get GET_METRICS() {
            return `${this.BASE_URL}https://coherent-matron-barrier.ngrok-free.dev/webhook-test/metricas-dashboard`;
        },

        /**
         * GET — Consulta el estado completo de un caso por Token ID.
         * n8n Webhook Path: /webhook/urbania/query?token=URB-XXXXXXXX
         */
        get QUERY_TOKEN() {
            return `${this.BASE_URL}https://coherent-matron-barrier.ngrok-free.dev/webhook-test/consultar-caso`;
        }
    },

    MAP: {
        DEFAULT_ZOOM: 16,
        DEFAULT_LAT:  7.067,   // Bucaramanga — coordenada de fallback
        DEFAULT_LNG: -73.167,
        TILE_LAYER:  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },

    VALIDATIONS: {
        // Nombres alineados con los usos en form.js
        MAX_IMAGE_SIZE_BYTES:  5 * 1024 * 1024,               // 5 MB
        ALLOWED_IMAGE_TYPES:  ['image/jpeg', 'image/png', 'image/webp']
    },

    DASHBOARD: {
        // Intervalo de polling automático para actualizar estadísticas (ms)
        POLLING_INTERVAL_MS: 30_000   // 30 segundos
    }
};

export default CONFIG;
