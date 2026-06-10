/**
 * UrbanIA - Módulo de Auditoría e Inspección (Admin Core)
 * @description Validación, consulta y renderizado de estados de tokens.
 *
 * CORRECCIONES APLICADAS:
 *  - Eliminada la doble verificación de typo (accion_recomedada → accion_recomendada)
 *  - Búsqueda con Enter key además del botón
 *  - renderCaseStatus() muestra coordenadas con enlace a Google Maps
 *  - Historial de tokens recientes desde localStorage
 */

import { searchCase }    from './api.js';
import { validateToken, getTokenHistory } from './token.js';
import { showNotification, toggleLoader } from './ui.js';

// ─── Búsqueda ─────────────────────────────────────────────────────────────────

/**
 * Captura el token, valida su formato y ejecuta la consulta de red.
 */
export async function searchToken() {
    const inputElement    = document.getElementById('search-token');
    const resultContainer = document.getElementById('search-result');

    if (!inputElement || !resultContainer) return;

    const queryToken = inputElement.value.trim().toUpperCase();

    if (!validateToken(queryToken)) {
        showNotification('El Token no es válido. Formato esperado: URB-ABCDE234', 'error');
        resultContainer.innerHTML = `
            <span style="color:#ef4444; font-size:0.9rem;">
                ⚠️ Formato inválido. Revise la sintaxis del Token ID.
            </span>`;
        return;
    }

    toggleLoader(true);
    resultContainer.innerHTML = `<em style="color:#64748b;">Consultando base de datos analítica...</em>`;

    try {
        const caseData = await searchCase(queryToken);
        renderCaseStatus(resultContainer, caseData);
        showNotification('Expediente recuperado exitosamente.', 'success');

    } catch (error) {
        console.warn(`[Admin Search]: Consulta fallida para ${queryToken}`, error);
        resultContainer.innerHTML = `
            <div style="background:#fee2e2; color:#991b1b; padding:12px; border-radius:6px; font-size:0.9rem;">
                ⚠️ <strong>Caso No Encontrado:</strong> El Token ID no coincide con ningún reporte registrado,
                o el servicio n8n está temporalmente fuera de línea.
            </div>`;
    } finally {
        toggleLoader(false);
    }
}

/**
 * Permite buscar presionando la tecla Enter en el input del token.
 * Debe llamarse desde main.js en el bootstrap.
 */
export function initAdminSearch() {
    const input = document.getElementById('search-token');
    if (!input) return;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchToken();
    });

    // Mostrar historial de tokens recientes si existe
    renderTokenHistory();
}

// ─── Historial de tokens ──────────────────────────────────────────────────────

/**
 * Renderiza el historial de tokens guardados en localStorage debajo del buscador.
 */
export function renderTokenHistory() {
    const history = getTokenHistory();
    if (!history.length) return;

    const adminSection = document.querySelector('.admin-section');
    if (!adminSection || document.getElementById('token-history')) return;

    const historyContainer = document.createElement('div');
    historyContainer.id = 'token-history';
    Object.assign(historyContainer.style, {
        marginTop:  '12px',
        padding:    '10px 14px',
        background: '#f8fafc',
        border:     '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize:   '0.82rem'
    });

    const chips = history.map(t => `
        <button onclick="document.getElementById('search-token').value='${t}'; this.closest('#token-history').dispatchEvent(new Event('search-chip'))"
            style="
                background:#e0f2fe; color:#0369a1; border:none; padding:4px 10px;
                border-radius:20px; cursor:pointer; font-size:0.78rem; font-family:monospace;
                margin:3px; transition:background 0.2s;
            "
            title="Clic para consultar este token"
        >${t}</button>
    `).join('');

    historyContainer.innerHTML = `
        <p style="color:#64748b; margin-bottom:6px; font-weight:600;">🕒 Tokens recientes:</p>
        <div>${chips}</div>
    `;

    // Al hacer click en un chip, ejecutar la búsqueda automáticamente
    historyContainer.addEventListener('search-chip', () => {
        setTimeout(() => searchToken(), 50);
    });

    // Insertar antes del resultado
    const resultDiv = document.getElementById('search-result');
    adminSection.insertBefore(historyContainer, resultDiv);
}

// ─── Renderizado de resultados ────────────────────────────────────────────────

/**
 * Renderiza el expediente del caso en el DOM de forma estructurada.
 * @param {HTMLElement} container
 * @param {Object} data - Datos del incidente + análisis de Gemini.
 */
export function renderCaseStatus(container, data) {
    const severityConfig = {
        'Alta':  { color: '#dc2626', bg: '#fee2e2', icon: '🔴' },
        'Media': { color: '#ea580c', bg: '#ffedd5', icon: '🟠' },
        'Baja':  { color: '#16a34a', bg: '#dcfce7', icon: '🟢' }
    };

    const sev = severityConfig[data.severidad] || { color: '#64748b', bg: '#f1f5f9', icon: '⚪' };

    // Enlace a Google Maps si hay coordenadas
    const mapsLink = (data.latitud && data.longitud)
        ? `<a href="https://maps.google.com/?q=${data.latitud},${data.longitud}" target="_blank"
              style="color:#2563eb; font-size:0.8rem;">📍 Ver en Google Maps</a>`
        : '';

    // Score visual como barra de progreso
    const score = parseInt(data.score, 10) || 0;
    const scoreColor = score >= 70 ? '#dc2626' : score >= 40 ? '#ea580c' : '#16a34a';

    container.innerHTML = `
        <div style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; background:#fafafa;">

            <!-- Cabecera del caso -->
            <div style="background:${sev.bg}; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
                <span style="font-family:monospace; font-size:0.85rem; color:#475569; font-weight:700;">
                    ${sev.icon} ${data.token || 'N/A'}
                </span>
                <span style="background:${sev.color}; color:white; padding:4px 12px; font-size:0.75rem; border-radius:20px; font-weight:700;">
                    Severidad ${data.severidad || 'Evaluando'}
                </span>
            </div>

            <!-- Cuerpo del expediente -->
            <div style="padding:16px;">
                <p style="margin:6px 0; font-size:0.9rem;"><strong>Inspector / Ciudadano:</strong> ${data.ciudadano || 'Anónimo'}</p>
                <p style="margin:6px 0; font-size:0.9rem;"><strong>Tipo de Incidente:</strong> ${data.tipo_incidente || 'No especificado'}</p>

                <!-- Score de riesgo con barra -->
                <div style="margin:12px 0;">
                    <p style="font-size:0.85rem; margin-bottom:5px;">
                        <strong>Puntuación de Riesgo:</strong>
                        <span style="color:${scoreColor}; font-weight:700;">${score}/100</span>
                    </p>
                    <div style="background:#e2e8f0; border-radius:4px; height:8px; overflow:hidden;">
                        <div style="background:${scoreColor}; width:${score}%; height:100%; border-radius:4px; transition:width 0.6s ease;"></div>
                    </div>
                </div>

                <!-- Diagnóstico IA -->
                <div style="background:#f0f9ff; border-left:4px solid #0284c7; padding:10px 14px; border-radius:0 6px 6px 0; margin:10px 0;">
                    <p style="font-size:0.78rem; color:#0369a1; font-weight:700; margin-bottom:4px;">🤖 DIAGNÓSTICO IA (Gemini Vision)</p>
                    <p style="font-size:0.88rem; color:#1e293b; font-style:italic;">
                        "${data.diagnostico || data.resumen || 'Sin diagnóstico disponible aún.'}"
                    </p>
                </div>

                <!-- Acción recomendada -->
                <p style="margin:8px 0; font-size:0.9rem;">
                    <strong>Acción Recomendada:</strong>
                    <span style="color:#2563eb; font-weight:600;">${data.accion_recomendada || 'Despachar cuadrilla estándar.'}</span>
                </p>

                <!-- Footer del card -->
                <hr style="border:0; border-top:1px dashed #cbd5e1; margin:12px 0;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <small style="color:#94a3b8;">Registrado: ${data.fecha || 'Fecha desconocida'}</small>
                    ${mapsLink}
                </div>
            </div>
        </div>
    `;
}
