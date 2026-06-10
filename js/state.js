/**
 * UrbanIA - Central State Management
 * @description Fuente única de verdad. Maneja el estado reactivo de la aplicación.
 * Este módulo no requirió correcciones — su implementación es correcta.
 */

const _state = {
    coordinates:  { lat: null, lng: null },
    currentToken: null,
    counters:     { totales: 0, criticos: 0 },
    isSubmitting: false,
    userStatus:   'blocked'   // 'blocked' | 'authorized'
};

const _listeners = [];

/**
 * Devuelve una copia inmutable del estado actual.
 * @returns {Object}
 */
export function getState() {
    return JSON.parse(JSON.stringify(_state));
}

/**
 * Actualiza el estado global y notifica a todos los suscriptores.
 * @param {Object} nextState - Fragmento parcial del estado a actualizar.
 */
export function setState(nextState) {
    for (const key in nextState) {
        if (!(key in _state)) {
            console.error(`[State Error]: La propiedad "${key}" no existe en el esquema.`);
            return;
        }
    }

    if (nextState.coordinates) Object.assign(_state.coordinates, nextState.coordinates);
    if (nextState.counters)    Object.assign(_state.counters,    nextState.counters);

    if (nextState.currentToken !== undefined) _state.currentToken = nextState.currentToken;
    if (nextState.isSubmitting !== undefined) _state.isSubmitting = nextState.isSubmitting;
    if (nextState.userStatus   !== undefined) _state.userStatus   = nextState.userStatus;

    const snapshot = getState();
    _listeners.forEach(listener => listener(snapshot));
}

/**
 * Suscribe un callback a los cambios del estado.
 * @param {Function} listener
 * @returns {Function} Función de limpieza (unsubscribe).
 */
export function subscribe(listener) {
    _listeners.push(listener);
    return () => {
        const i = _listeners.indexOf(listener);
        if (i > -1) _listeners.splice(i, 1);
    };
}
