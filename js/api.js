/**
 * UrbanIA - Data Gateway (API Layer)
 *
 * BUGS CORREGIDOS:
 *  1. Todas las llamadas fetch ahora incluyen el header "ngrok-skip-browser-warning"
 *     que ngrok exige para no devolver su página HTML de advertencia en vez del JSON.
 *  2. getDashboardData() ahora mapea correctamente la respuesta de n8n:
 *     n8n devuelve { metricas_generales: { total_incidentes, incidentes_criticos } }
 *     pero dashboard.js espera { totales, criticos }. Se normaliza aquí.
 *  3. searchCase() ahora mapea la respuesta de n8n al formato que espera renderCaseStatus().
 */

import CONFIG from './config.js';

// Headers comunes para todas las peticiones — ngrok-skip-browser-warning es OBLIGATORIO
// sin este header ngrok devuelve su propia página HTML y rompe el JSON.parse
const COMMON_HEADERS = {
    'Accept':                    'application/json',
    'ngrok-skip-browser-warning': 'true'
};

async function handleResponse(response) {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[API Error]: Status ${response.status} — ${errorText || response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    return { success: true, message: await response.text() };
}

/**
 * Envía el reporte de incidencia al webhook de n8n.
 * NO definir Content-Type — el navegador inyecta el boundary correcto para multipart.
 */
export async function sendReport(formDataPayload) {
    if (!(formDataPayload instanceof FormData)) {
        throw new Error('[API Protocol Error]: El payload debe ser una instancia de FormData.');
    }

    return fetch(CONFIG.WEBHOOKS.SUBMIT_INCIDENT, {
        method:  'POST',
        body:    formDataPayload,
        mode:    'cors',
        headers: { 'ngrok-skip-browser-warning': 'true' }
        // ⚠️ NO añadir Content-Type aquí, el navegador lo hace automáticamente con boundary
    }).then(handleResponse);
}

/**
 * Obtiene métricas del dashboard desde n8n/Google Sheets.
 *
 * n8n devuelve un objeto con estructura:
 * { metricas_generales: { total_incidentes: N, incidentes_criticos: M, ... } }
 *
 * Se normaliza a { totales: N, criticos: M } para que dashboard.js funcione sin cambios.
 */
export async function getDashboardData() {
    const raw = await fetch(CONFIG.WEBHOOKS.GET_METRICS, {
        method:  'GET',
        mode:    'cors',
        headers: COMMON_HEADERS
    }).then(handleResponse);

    // Normalizar estructura de respuesta de n8n
    const totales  = raw?.totales
        ?? raw?.metricas_generales?.total_incidentes
        ?? raw?.total_incidentes
        ?? 0;

    const criticos = raw?.criticos
        ?? raw?.metricas_generales?.incidentes_criticos
        ?? raw?.incidentes_criticos
        ?? 0;

    return { totales, criticos };
}

/**
 * Consulta el estado completo de un caso por Token ID.
 *
 * n8n devuelve:
 * { success, tokenId, ciudadano: { nombre, email, tipo, lat, lon, fecha }, ia: { severidad, score, resumen, accion } }
 *
 * Se normaliza al formato plano que espera renderCaseStatus() en admin.js:
 * { token, ciudadano, tipo_incidente, severidad, score, diagnostico, accion_recomendada, latitud, longitud, fecha }
 */
export async function searchCase(token) {
    if (!token) throw new Error('[API Validation Error]: Token requerido.');

    const queryUrl = `${CONFIG.WEBHOOKS.QUERY_TOKEN}${encodeURIComponent(token.trim().toUpperCase())}`;

    const raw = await fetch(queryUrl, {
        method:  'GET',
        mode:    'cors',
        headers: COMMON_HEADERS
    }).then(handleResponse);

    // Si n8n indica explícitamente que no encontró el token
    if (raw?.success === false || raw?.error) {
        throw new Error(raw?.error || 'Token no encontrado');
    }

    // Normalizar al formato plano que espera renderCaseStatus()
    return {
        token:              raw.tokenId    || token,
        ciudadano:          raw.ciudadano?.nombre || raw.ciudadano || 'Anónimo',
        tipo_incidente:     raw.ciudadano?.tipo   || raw.tipo_incidente || 'No especificado',
        severidad:          raw.ia?.severidad     || raw.severidad      || 'Evaluando',
        score:              raw.ia?.score         || raw.score          || 0,
        diagnostico:        raw.ia?.resumen       || raw.diagnostico    || raw.resumen || '',
        accion_recomendada: raw.ia?.accion        || raw.accion_recomendada || 'Despachar cuadrilla estándar.',
        latitud:            raw.ciudadano?.lat    || raw.latitud,
        longitud:           raw.ciudadano?.lon    || raw.longitud,
        fecha:              raw.ciudadano?.fecha  || raw.fecha || ''
    };
}