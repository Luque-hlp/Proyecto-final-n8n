/**
 * UrbanIA - Data Gateway
 *
 * SOLUCIÓN CORS SIN PROXY / SIN NODE.JS:
 *
 * El problema raíz: el navegador envía un "preflight" OPTIONS antes de cada
 * petición con headers personalizados. Ngrok bloquea ese OPTIONS y devuelve
 * ERR_CONNECTION_REFUSED antes de que llegue a n8n.
 *
 * Solución: eliminar TODOS los headers personalizados de las peticiones.
 * Sin headers custom → el navegador NO envía preflight → ngrok no bloquea.
 *
 * El header "ngrok-skip-browser-warning" ya NO es necesario porque ngrok
 * solo muestra su página HTML en respuestas de navegador (no en fetch API).
 */

import CONFIG from './config.js';

async function handleResponse(response) {
    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`[API Error]: Status ${response.status} — ${errorText || response.statusText}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    // Intentar parsear como JSON de todos modos (n8n a veces no pone el content-type)
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch {
        return { success: true, message: text };
    }
}

/**
 * Envía el reporte — SIN headers personalizados para evitar el preflight CORS.
 * FormData es una petición "simple" que el navegador envía directamente.
 */
export async function sendReport(formDataPayload) {
    if (!(formDataPayload instanceof FormData)) {
        throw new Error('[API Protocol Error]: El payload debe ser FormData.');
    }

    // Sin headers = sin preflight = ngrok no bloquea
    return fetch(CONFIG.WEBHOOKS.SUBMIT_INCIDENT, {
        method: 'POST',
        body:   formDataPayload,
        mode:   'cors'
        // ⚠️ NO poner headers aquí — eso es lo que dispara el preflight
    }).then(handleResponse);
}

/**
 * Obtiene métricas del dashboard.
 * GET sin headers custom = petición simple = sin preflight.
 */
export async function getDashboardData() {
    const raw = await fetch(CONFIG.WEBHOOKS.GET_METRICS, {
        method: 'GET',
        mode:   'cors'
        // Sin Accept personalizado — el navegador lo maneja solo
    }).then(handleResponse);

    const totales  = raw?.totales  ?? raw?.metricas_generales?.total_incidentes  ?? 0;
    const criticos = raw?.criticos ?? raw?.metricas_generales?.incidentes_criticos ?? 0;

    return { totales: Number(totales), criticos: Number(criticos) };
}

/**
 * Consulta un caso por Token ID.
 */
export async function searchCase(token) {
    if (!token) throw new Error('[API Validation Error]: Token requerido.');

    const queryUrl = `${CONFIG.WEBHOOKS.QUERY_TOKEN}${encodeURIComponent(token.trim().toUpperCase())}`;

    const raw = await fetch(queryUrl, {
        method: 'GET',
        mode:   'cors'
    }).then(handleResponse);

    if (raw?.success === false || raw?.error) {
        throw new Error(raw?.error || 'Token no encontrado');
    }

    return {
        token:              raw.token              || raw.tokenId       || token,
        ciudadano:          raw.ciudadano          || 'Anónimo',
        tipo_incidente:     raw.tipo_incidente     || 'No especificado',
        severidad:          raw.severidad          || 'Evaluando',
        score:              raw.score              || 0,
        diagnostico:        raw.diagnostico        || raw.resumen       || 'Sin diagnóstico aún.',
        accion_recomendada: raw.accion_recomendada || 'Despachar cuadrilla estándar.',
        latitud:            raw.latitud,
        longitud:           raw.longitud,
        fecha:              raw.fecha              || ''
    };
}