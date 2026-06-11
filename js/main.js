/**
 * UrbanIA - Master Orchestrator
 * @description Inicializador del sistema. Vincula eventos del DOM y arranca todos los módulos.
 *
 * CORRECCIONES / ADICIONES:
 *  - initFileInput() invocado para actualizar nombre de archivo y preview
 *  - initAdminSearch() invocado para soporte de Enter key e historial
 *  - startPolling() activa actualización automática del dashboard
 *  - initNetworkMonitor() detecta cambios de conectividad en tiempo real
 *  - Mapa inicializado con coordenadas de fallback si GPS no está disponible
 */

import { requestLocation }  from './geo.js';
import { loadDashboard, startPolling } from './dashboard.js';
import { initializeMap }    from './map.js';
import { submitReport, initFileInput } from './form.js';
import { searchToken, initAdminSearch } from './admin.js';
import { subscribe }        from './state.js';
import { initNetworkMonitor, updateServerStatus } from './ui.js';
import CONFIG from './config.js';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap() {
    console.log('[UrbanIA Core]: Inicializando subsistemas modulares...');

    // ── 1. Listeners del formulario ────────────────────────────────────────
    const incidentForm = document.getElementById('incident-form');
    if (incidentForm) {
        incidentForm.addEventListener('submit', submitReport);
    }

    // Preview e información del archivo adjunto
    initFileInput();

    // ── 2. Módulo de auditoría ─────────────────────────────────────────────
    const searchButton = document.getElementById('btn-buscar-token');
    if (searchButton) {
        searchButton.addEventListener('click', searchToken);
    }
    initAdminSearch(); // Habilita búsqueda con Enter + historial de tokens

    // ── 3. Monitor de conectividad ─────────────────────────────────────────
    initNetworkMonitor();

    // Estado inicial del servidor (asumimos online; el polling confirmará)
    updateServerStatus('checking');

    // ── 4. Suscripción reactiva al State Manager ───────────────────────────
    // Cuando las coordenadas cambien (GPS real o fallback), el mapa se inicializa.
    let mapInitialized = false;
    subscribe((newState) => {
        const { lat, lng } = newState.coordinates;
        if (lat !== null && lng !== null && !mapInitialized) {
            initializeMap(lat, lng);
            mapInitialized = true;
        }
    });

    // ── 5. Inicialización concurrente de servicios de fondo ───────────────

    // GPS + Gatekeeper (con fallback automático si se rechaza)
    requestLocation();

    // Dashboard: carga inicial + polling automático
    try {
        await loadDashboard();
        updateServerStatus('online');
    } catch {
        updateServerStatus('offline');
    }

    startPolling();

    console.log('[UrbanIA Core]: Todos los subsistemas inicializados correctamente.');
}

// Arrancar cuando el DOM esté completamente parseado
document.addEventListener('DOMContentLoaded', bootstrap);