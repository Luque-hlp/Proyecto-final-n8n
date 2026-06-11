/**
 * UrbanIA - Módulo de Geolocalización y Seguridad Perimetral (Gatekeeper)
 */

import CONFIG from './config.js';
import { setState, getState } from './state.js';

// ─── Control de overlay ───────────────────────────────────────────────────────

export function lockApplication() {
    setState({ userStatus: 'blocked' });
    const overlay = document.getElementById('gatekeeper-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }
}

export function unlockApplication() {
    setState({ userStatus: 'authorized' });
    const overlay = document.getElementById('gatekeeper-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }
}

export function getCurrentCoordinates() {
    return getState().coordinates;
}

// ─── Modo degradado ───────────────────────────────────────────────────────────

function activateFallbackMode(reason) {
    console.warn(`[GPS Fallback]: ${reason}. Usando coordenadas de configuración.`);

    setState({
        coordinates: {
            lat: CONFIG.MAP.DEFAULT_LAT,
            lng: CONFIG.MAP.DEFAULT_LNG
        }
    });

    const overlayMsg = document.querySelector('.overlay-card p');
    if (overlayMsg) {
        overlayMsg.textContent =
            'GPS no disponible. Operando con coordenadas de referencia metropolitana.';
    }

    setTimeout(() => unlockApplication(), 1500);
}

// ─── UI de reintento ──────────────────────────────────────────────────────────

function showRetryUI(errorMsg) {
    const overlayCard = document.querySelector('.overlay-card');
    if (!overlayCard) return;

    if (document.getElementById('geo-retry-btn')) return;

    const pulseLoader = overlayCard.querySelector('.pulse-loader');
    if (pulseLoader) pulseLoader.style.display = 'none';

    const message = overlayCard.querySelector('p');
    if (message) message.textContent = errorMsg;

    // fallbackLink declarado PRIMERO
    const fallbackLink = document.createElement('button');
    fallbackLink.id          = 'geo-fallback-btn';
    fallbackLink.textContent = 'Continuar sin GPS (modo referencia)';
    Object.assign(fallbackLink.style, {
        marginTop:      '10px',
        background:     'none',
        border:         'none',
        color:          '#64748b',
        cursor:         'pointer',
        fontSize:       '0.82rem',
        textDecoration: 'underline',
        display:        'block',
        width:          '100%'
    });
    fallbackLink.addEventListener('click', () => {
        activateFallbackMode('Usuario eligió modo degradado');
    });

    // retryBtn declarado DESPUÉS
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

    overlayCard.appendChild(retryBtn);
    overlayCard.appendChild(fallbackLink);
}

// ─── Geolocalización principal ────────────────────────────────────────────────

export function requestLocation() {
    if (!navigator.geolocation) {
        showRetryUI('Tu navegador no soporta geolocalización.');
        setTimeout(() => activateFallbackMode('Navegador sin soporte GPS'), 3000);
        return;
    }

    const geoOptions = {
        enableHighAccuracy: true,
        timeout:            8000,
        maximumAge:         0
    };

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setState({ coordinates: { lat: latitude, lng: longitude } });
            unlockApplication();
        },
        (error) => {
            console.warn(`[GPS Error] Código ${error.code}: ${error.message}`);
            const errorMessages = {
                1: 'Permiso de ubicación denegado. Habilítelo en su navegador o continúe en modo referencia.',
                2: 'No se pudo determinar la posición. Verifique la señal GPS o continúe en modo referencia.',
                3: 'Tiempo de espera GPS agotado. Intente nuevamente o continúe en modo referencia.'
            };
            showRetryUI(errorMessages[error.code] || 'Error de geolocalización. Intente nuevamente.');
        },
        geoOptions
    );
}
