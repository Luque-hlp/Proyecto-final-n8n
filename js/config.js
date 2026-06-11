/**
 * UrbanIA - Configuración Global
 * ⚠️ AL REINICIAR NGROK: cambia SOLO BASE_URL (sin barra final).
 */
const CONFIG = {
    WEBHOOKS: {
        BASE_URL: "https://coherent-matron-barrier.ngrok-free.dev",

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
        TILE_LAYER:   "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ATTRIBUTION:  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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