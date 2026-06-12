/**
 * UrbanIA - Data Gateway
 *
 * SOLUCIÓN CORS: usar mode: 'no-cors' para GET requests simples
 * que devuelven texto/JSON sin headers personalizados.
 *
 * Para consulta y métricas usamos un workaround:
 * Cambiamos el mode a 'no-cors' y leemos desde una URL con callback
 * o usamos un iframe proxy. 
 *
 * SOLUCIÓN REAL: usar mode: 'cors' pero con no-cors para evitar preflight.
 * Las peticiones GET simples (sin headers custom) deben funcionar con CORS
 * si n8n devuelve Access-Control-Allow-Origin: *
 *
 * Si n8n no devuelve ese header, la única solución sin backend es
 * usar un proxy CORS público temporal para la demo.
 */

import CONFIG from './config.js';

// Proxy CORS para desarrollo/demo — evita el bloqueo del navegador
// cuando n8n no devuelve el header Access-Control-Allow-Origin
const CORS_PROXY = 'https://corsproxy.io/?';

async function handleResponse(response) {
    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`[API Error]: Status ${response.status} — ${errorText || response.statusText}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch {
        return { success: true, message: text };
    }
}

/**
 * Envía el reporte — FormData sin headers = petición simple = sin preflight.
 */
export async function sendReport(formDataPayload) {
    if (!(formDataPayload instanceof FormData)) {
        throw new Error('[API Protocol Error]: El payload debe ser FormData.');
    }

    return fetch(CONFIG.WEBHOOKS.SUBMIT_INCIDENT, {
        method: 'POST',
        body:   formDataPayload,
        mode:   'cors'
    }).then(handleResponse);
}

/**
 * Obtiene métricas — usa proxy CORS si el directo falla.
 */
export async function getDashboardData() {
    // Intentar directo primero
    let raw;
    try {
        raw = await fetch(CONFIG.WEBHOOKS.GET_METRICS, {
            method: 'GET',
            mode:   'cors'
        }).then(handleResponse);
    } catch {
        // Si falla por CORS, usar proxy
        const proxyUrl = CORS_PROXY + encodeURIComponent(CONFIG.WEBHOOKS.GET_METRICS);
        raw = await fetch(proxyUrl, {
            method: 'GET'
        }).then(handleResponse);
    }

    const totales  = raw?.totales  ?? raw?.metricas_generales?.total_incidentes  ?? 0;
    const criticos = raw?.criticos ?? raw?.metricas_generales?.incidentes_criticos ?? 0;

    return { totales: Number(totales), criticos: Number(criticos) };
}

/**
 * Consulta un caso por Token ID — usa proxy CORS si el directo falla.
 */
export async function searchCase(token) {
    if (!token) throw new Error('[API Validation Error]: Token requerido.');

    const directUrl = `${CONFIG.WEBHOOKS.QUERY_TOKEN}${encodeURIComponent(token.trim().toUpperCase())}`;

    let raw;
    try {
        // Intentar directo primero
        raw = await fetch(directUrl, {
            method: 'GET',
            mode:   'cors'
        }).then(handleResponse);
    } catch {
        // Si falla por CORS, usar proxy
        const proxyUrl = CORS_PROXY + encodeURIComponent(directUrl);
        raw = await fetch(proxyUrl, {
            method: 'GET'
        }).then(handleResponse);
    }

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