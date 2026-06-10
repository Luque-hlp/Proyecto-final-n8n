/**
 * UrbanIA - Módulo del Dashboard Estadístico
 * @description Contadores dinámicos, animaciones y polling automático de métricas.
 *
 * CORRECCIONES APLICADAS:
 *  - Polling automático cada 30 segundos (DASHBOARD.POLLING_INTERVAL_MS)
 *  - incrementReports() sincroniza tanto 'totales' como mantiene 'criticos' intacto
 *  - animateCounter() no entra en bucle infinito si targetValue es 0
 *  - stopPolling() exportada para limpiar el intervalo si se necesita
 */

import CONFIG from './config.js';
import { getDashboardData } from './api.js';
import { setState, getState } from './state.js';

// Referencia interna al intervalo de polling (permite cancelarlo)
let _pollingTimer = null;

// ─── Carga inicial ────────────────────────────────────────────────────────────

/**
 * Carga las métricas desde n8n y actualiza el dashboard.
 * Si la API falla, conserva los valores actuales sin romper la UI.
 */
export async function loadDashboard() {
    try {
        const data = await getDashboardData();

        const totales = parseInt(data.totales, 10) || 0;
        const criticos = parseInt(data.criticos, 10) || 0;

        setState({ counters: { totales, criticos } });

        animateCounter('stat-totales', totales);
        animateCounter('stat-criticos', criticos);

    } catch (error) {
        console.warn('[Dashboard Warning]: Fallo al cargar métricas. Manteniendo valores actuales.', error);
        // No animamos a 0 para no pisar valores ya mostrados
    }
}

// ─── Polling automático ───────────────────────────────────────────────────────

/**
 * Inicia el ciclo de actualización periódica del dashboard.
 * Llama a loadDashboard() cada POLLING_INTERVAL_MS milisegundos.
 */
export function startPolling() {
    if (_pollingTimer !== null) return; // Evitar múltiples intervalos

    _pollingTimer = setInterval(async () => {
        try {
            const data = await getDashboardData();
            const totales  = parseInt(data.totales,  10) || 0;
            const criticos = parseInt(data.criticos, 10) || 0;

            const current = getState().counters;

            // Solo animar si los valores cambiaron (evitar parpadeo innecesario)
            if (totales !== current.totales) {
                animateCounter('stat-totales', totales);
                setState({ counters: { totales } });
            }
            if (criticos !== current.criticos) {
                animateCounter('stat-criticos', criticos);
                setState({ counters: { criticos } });
            }
        } catch {
            // Fallo silencioso — no interrumpir el polling por errores transitorios
        }
    }, CONFIG.DASHBOARD.POLLING_INTERVAL_MS);

    console.log(`[Dashboard]: Polling activo cada ${CONFIG.DASHBOARD.POLLING_INTERVAL_MS / 1000}s.`);
}

/**
 * Detiene el polling automático del dashboard.
 */
export function stopPolling() {
    if (_pollingTimer !== null) {
        clearInterval(_pollingTimer);
        _pollingTimer = null;
    }
}

// ─── Actualización optimista ──────────────────────────────────────────────────

/**
 * Incrementa el contador de reportes totales de forma inmediata tras un submit exitoso.
 * No toca el contador de críticos (se actualiza desde el servidor vía polling).
 */
export function incrementReports() {
    const el = document.getElementById('stat-totales');
    if (!el) return;

    const currentTotales  = getState().counters.totales;
    const newTotales = currentTotales + 1;

    el.innerText = newTotales;
    setState({ counters: { totales: newTotales } });
}

// ─── Animación de contadores ──────────────────────────────────────────────────

/**
 * Anima un contador numérico desde su valor actual hasta targetValue.
 * @param {string} elementId  - ID del elemento HTML.
 * @param {number} targetValue - Valor final de la animación.
 */
export function animateCounter(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;

    // Si el target es 0, simplemente mostrar 0 sin animar
    if (targetValue === 0) {
        el.innerText = 0;
        return;
    }

    const startValue    = parseInt(el.innerText, 10) || 0;
    const durationMs    = 1200;
    const frameDurationMs = 16; // ~60 FPS
    const totalFrames   = Math.max(1, durationMs / frameDurationMs);
    const delta         = targetValue - startValue;
    const step          = delta / totalFrames;

    let currentValue = startValue;

    const timer = setInterval(() => {
        currentValue += step;

        const rounded = Math.round(currentValue);

        if ((step > 0 && rounded >= targetValue) || (step < 0 && rounded <= targetValue)) {
            el.innerText = targetValue;
            clearInterval(timer);
        } else {
            el.innerText = rounded;
        }
    }, frameDurationMs);
}
