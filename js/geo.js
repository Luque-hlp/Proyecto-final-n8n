/**
 * UrbanIA - Módulo de Geolocalización y Seguridad Perimetral (Gatekeeper)
 * @description Gestión de permisos GPS con modo degradado y botón de reintento.
 *
 * CORRECCIONES APLICADAS:
 *  - Gatekeeper ya no bloquea permanentemente: ofrece botón de reintento
 *  - Modo degradado: si el usuario rechaza GPS, se usan coordenadas de fallback
 *    y la app queda operativa (ideal para demo en entornos sin GPS)
 *  - Mensajes diferenciados según el tipo de error GPS
 *  - El mapa se inicializa siempre, incluso sin GPS real
 */

import CONFIG from './config.js';
import { setState, getState } from './state.js';

// ─── Control de overlay ───────────────────────────────────────────────────────

/**
 * Bloquea la interfaz mostrando el overlay del Gatekeeper.
 */
export function lockApplication() {
    setState({ userStatus: 'blocked' });
    const overlay = document.getElementById('gatekeeper-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }
}

/**
 * Desbloquea la interfaz y oculta el overlay del Gatekeeper.
 */
export function unlockApplication() {
    setState({ userStatus: 'authorized' });
    const overlay = document.getElementById('gatekeeper-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }
}

// ─── Coordenadas ──────────────────────────────────────────────────────────────

/**
 * Devuelve las coordenadas actuales del estado global.
 * @returns {{ lat: number|null, lng: number|null }}
 */
export function getCurrentCoordinates() {
    return getState().coordinates;
}

// ─── Geolocalización ─────────────────────────────────────────────────────────

/**
 * Activa el modo degradado: carga las coordenadas de fallback desde CONFIG
 * y desbloquea la aplicación para que pueda usarse en la demo
 * aunque el GPS no esté disponible.
 * @param {string} reason - Motivo del fallback (para log).
 */
function activateFallbackMode(reason) {
    console.warn(`[GPS Fallback]: ${reason}. Usando coordenadas de configuración.`);

    setState({
        coordinates: {
            lat: CONFIG.MAP.DEFAULT_LAT,
            lng: CONFIG.MAP.DEFAULT_LNG
        }
    });

    // Actualizar mensaje del overlay antes de cerrarlo
    const overlayCard = document.querySelector('.overlay-card p');
    if (overlayCard) {
        overlayCard.textContent =
            'GPS no disponible. Operando con coordenadas de referencia metropolitana.';
    }

    // Pequeña pausa para que el usuario lea el mensaje antes de desbloquear
    setTimeout(() => unlockApplication(), 1500);
}

/**
 * Inyecta el botón de reintento y el enlace de modo degradado en el overlay,
 * evitando que el rechazo de GPS bloquee permanentemente la demo.
 * @param {string} errorMsg - Mensaje descriptivo para el usuario.
 */
function showRetryUI(errorMsg) {
    const overlayCard = document.querySelector('.overlay-card');
    if (!overlayCard) return;

    // Evitar inyectar controles duplicados
    if (document.getElementById('geo-retry-btn')) return;

    const pulseLoader = overlayCard.querySelector('.pulse-loader');
    if (pulseLoader) pulseLoader.style.display = 'none';

    const message = overlayCard.querySelector('p');
    if (message) message.textContent = errorMsg;

    // Botón de reintento GPS
    const retryBtn = document.createElement('button');
    retryBtn.id          = 'geo-retry-btn';
    retryBtn.textContent = '🔄 Reintentar acceso GPS';
    Object.assign(retryBtn.style, {
        marginTop:    '16px',
        padding:      '10px 24px',
        background:   '#2563eb',
        color:        'white',
        border:       'none',
        borderRadius: '8px',
        cursor:       'pointer',
        fontWeight:   '600',
        fontSize:     '0.9rem',
        display:      'block',
        width:        '100%'
    });
    retryBtn.addEventListener('click', () => {
        retryBtn.remove();
        fallbackLink.remove();
        if (pulseLoader) pulseLoader.style.display = 'block';
        if (message) message.textContent =
            'UrbanIA requiere telemetría GPS para validar la ubicación de los incidentes.';
        requestLocation();
    });

    // Enlace para continuar en modo degradado
    const fallbackLink = document.createElement('button');
    fallbackLink.id          = 'geo-fallback-btn';
    fallbackLink.textContent = 'Continuar sin GPS (modo referencia)';
    Object.assign(fallbackLink.style, {
        marginTop:       '10px',
        background:      'none',
        border:          'none',
        color:           '#64748b',
        cursor:          'pointer',
        fontSize:        '0.82rem',
        textDecoration:  'underline',
        display:         'block',
        width:           '100%'
    });
    fallbackLink.addEventListener('click', () => {
        activateFallbackMode('Usuario eligió modo degradado');
    });

    overlayCard.appendChild(retryBtn);
    overlayCard.appendChild(fallbackLink);
}

/**
 * Solicita la geolocalización al navegador.
 * En caso de error, muestra UI de reintento y ofrece modo degradado.
 */
export function requestLocation() {
    if (!navigator.geolocation) {
        showRetryUI('Tu navegador no soporta geolocalización.');
        // En entornos sin soporte, activar fallback directamente tras aviso
        setTimeout(() => activateFallbackMode('Navegador sin soporte GPS'), 3000);
        return;
    }

    const geoOptions = {
        enableHighAccuracy: true,
        timeout:            8000,
        maximumAge:         0
    };

    navigator.geolocation.getCurrentPosition(
        // ── ÉXITO ─────────────────────────────────────────────────────────
        (position) => {
            const { latitude, longitude } = position.coords;

            setState({
                coordinates: { lat: latitude, lng: longitude }
            });

            unlockApplication();
        },

        // ── ERROR ──────────────────────────────────────────────────────────
        (error) => {
            console.warn(`[GPS Error] Código ${error.code}: ${error.message}`);

            // Mensajes diferenciados por tipo de error
            const errorMessages = {
                1: 'Permiso de ubicación denegado. Habilítelo en la configuración del navegador o continúe en modo referencia.',
                2: 'No se pudo determinar la posición. Verifique la señal GPS o continúe en modo referencia.',
                3: 'Tiempo de espera GPS agotado. Intente nuevamente o continúe en modo referencia.'
            };

            const msg = errorMessages[error.code] ||
                        'Error de geolocalización desconocido. Intente nuevamente.';

            showRetryUI(msg);
        },

        geoOptions
    );
}
