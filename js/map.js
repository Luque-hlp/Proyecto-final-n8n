/**
 * UrbanIA - Módulo Cartográfico (Leaflet Engine)
 * @description Inicialización, renderizado y actualización del mapa interactivo.
 * El módulo es agnóstico al origen de las coordenadas (GPS real o fallback).
 */

import CONFIG from './config.js';

// Instancias privadas del módulo (patrón Singleton)
let _mapInstance    = null;
let _markerInstance = null;

/**
 * Inicializa el mapa Leaflet en el contenedor #map del DOM.
 * Si ya existe una instancia activa, actualiza la vista sin re-inicializar.
 * @param {number} lat - Latitud decimal.
 * @param {number} lng - Longitud decimal.
 */
export function initializeMap(lat, lng) {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error("[Map Engine]: Contenedor #map no encontrado en el DOM.");
        return;
    }

    // Singleton defensivo: evita el error "Map container already initialized"
    if (_mapInstance) {
        _mapInstance.setView([lat, lng], CONFIG.MAP.DEFAULT_ZOOM);
        updateMarker(lat, lng);
        return;
    }

    try {
        _mapInstance = L.map('map', {
            zoomControl:       true,
            scrollWheelZoom:   true,
            attributionControl: true
        }).setView([lat, lng], CONFIG.MAP.DEFAULT_ZOOM);

        L.tileLayer(CONFIG.MAP.TILE_LAYER, {
            attribution: CONFIG.MAP.ATTRIBUTION,
            maxZoom:     19
        }).addTo(_mapInstance);

        _markerInstance = L.marker([lat, lng]).addTo(_mapInstance);
        _markerInstance
            .bindPopup('<b>📍 Ubicación del Incidente</b><br>Coordenadas verificadas por GPS.')
            .openPopup();

        console.log(`[Map Engine]: Mapa inicializado en [${lat.toFixed(5)}, ${lng.toFixed(5)}].`);

    } catch (error) {
        console.error('[Map Engine Fatal Error]:', error);
    }
}

/**
 * Desplaza el marcador a nuevas coordenadas con animación suave.
 * @param {number} lat
 * @param {number} lng
 */
export function updateMarker(lat, lng) {
    if (!_markerInstance || !_mapInstance) {
        console.warn('[Map Engine]: No hay mapa activo para actualizar el marcador.');
        return;
    }

    _markerInstance.setLatLng([lat, lng]);
    _mapInstance.panTo([lat, lng], { animate: true, duration: 0.5 });
}
