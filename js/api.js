/**
 * UrbanIA - Data Gateway (API Layer)
 * @description Capa unificada de red. Único archivo con capacidad de ejecutar llamadas HTTP Fetch.
 */

import CONFIG from './config.js';

/**
 * Procesa la respuesta HTTP y valida los códigos de estado del servidor.
 * Compatible con respuestas JSON y texto plano de n8n.
 * @param {Response} response - Objeto de respuesta nativo de Fetch.
 * @returns {Promise<Object>} JSON parseado o wrapper de texto plano.
 */
async function handleResponse(response) {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[API Error]: Status ${response.status} — ${errorText || response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    // n8n puede responder con texto plano en webhooks de test
    return { success: true, message: await response.text() };
}

/**
 * Envía el reporte de incidencia urbana al Webhook de n8n.
 * Usa multipart/form-data para transportar la imagen binaria.
 * @param {FormData} formDataPayload - Datos completos del formulario.
 * @returns {Promise<Object>} Respuesta del servidor con token asignado.
 */
export async function sendReport(formDataPayload) {
    if (!(formDataPayload instanceof FormData)) {
        throw new Error('[API Protocol Error]: El payload debe ser una instancia de FormData.');
    }

    // NO definir Content-Type — el navegador inyecta el boundary correcto automáticamente
    return fetch(CONFIG.WEBHOOKS.SUBMIT_INCIDENT, {
        method: 'POST',
        body:   formDataPayload,
        mode:   'cors'
    }).then(handleResponse);
}

/**
 * Obtiene las métricas operativas globales desde el Google Sheet vía n8n.
 * @returns {Promise<{totales: number, criticos: number}>}
 */
export async function getDashboardData() {
    return fetch(CONFIG.WEBHOOKS.GET_METRICS, {
        method:  'GET',
        mode:    'cors',
        headers: { 'Accept': 'application/json' }
    }).then(handleResponse);
}

/**
 * Consulta el historial completo de un caso por Token ID.
 * @param {string} token - Token en formato URB-XXXXXXXX.
 * @returns {Promise<Object>} Datos del incidente + análisis de Gemini.
 */
export async function searchCase(token) {
    if (!token) throw new Error('[API Validation Error]: Token requerido para consulta.');

    // CONFIG.WEBHOOKS.QUERY_TOKEN ya termina en "?token="
    const queryUrl = `${CONFIG.WEBHOOKS.QUERY_TOKEN}${encodeURIComponent(token.trim().toUpperCase())}`;

    return fetch(queryUrl, {
        method:  'GET',
        mode:    'cors',
        headers: { 'Accept': 'application/json' }
    }).then(handleResponse);
}
