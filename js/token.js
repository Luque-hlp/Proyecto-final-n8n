/**
 * UrbanIA - Módulo de Gestión de Identidad Operativa (Tokens)
 * @description Generación de IDs únicos, validación y persistencia en LocalStorage.
 *
 * CORRECCIONES APLICADAS:
 *  - validateToken() regex corregido para excluir I, O, 0, 1 (consistente con charset)
 *  - getTokenHistory() y saveToken() mantienen historial de los últimos 5 tokens
 *  - clearTokenHistory() para limpiar desde el panel de admin si se necesita
 */

import { setState } from './state.js';

// Charset sin caracteres ambiguos (sin I, O, 0, 1)
const TOKEN_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TOKEN_REGEX   = /^URB-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
const STORAGE_KEY   = 'urbania_last_token';
const HISTORY_KEY   = 'urbania_token_history';
const MAX_HISTORY   = 5;

// ─── Generación ───────────────────────────────────────────────────────────────

/**
 * Genera un Token ID único con alta entropía criptográfica.
 * Formato: URB-XXXXXXXX (8 caracteres del charset sin ambigüedad)
 * @returns {string}
 */
export function generateToken() {
    const randomValues = new Uint32Array(8);
    window.crypto.getRandomValues(randomValues);

    const tokenBody = Array.from(randomValues)
        .map(v => TOKEN_CHARSET[v % TOKEN_CHARSET.length])
        .join('');

    return `URB-${tokenBody}`;
}

// ─── Validación ───────────────────────────────────────────────────────────────

/**
 * Valida que el token cumpla estrictamente con el formato del sistema.
 * El regex excluye los caracteres I, O, 0, 1 tal como el charset de generación.
 * @param {string} token
 * @returns {boolean}
 */
export function validateToken(token) {
    if (!token || typeof token !== 'string') return false;
    return TOKEN_REGEX.test(token.trim().toUpperCase());
}

// ─── Persistencia ─────────────────────────────────────────────────────────────

/**
 * Almacena el token como último activo y lo añade al historial (máx. MAX_HISTORY).
 * @param {string} token
 */
export function saveToken(token) {
    if (!validateToken(token)) {
        console.error(`[Token Error]: Formato inválido para almacenamiento: ${token}`);
        return;
    }

    try {
        // Guardar como token activo actual
        localStorage.setItem(STORAGE_KEY, token);

        // Actualizar historial
        const history = getTokenHistory();
        const updated = [token, ...history.filter(t => t !== token)].slice(0, MAX_HISTORY);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

        // Sincronizar con State Manager
        setState({ currentToken: token });

    } catch (error) {
        console.error('[Token Storage Error]: No se pudo guardar en LocalStorage.', error);
    }
}

/**
 * Recupera el último token registrado.
 * @returns {string|null}
 */
export function getToken() {
    return localStorage.getItem(STORAGE_KEY);
}

/**
 * Recupera el historial de tokens registrados en esta sesión/navegador.
 * @returns {string[]} Array de tokens (más reciente primero).
 */
export function getTokenHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Limpia el historial completo de tokens del LocalStorage.
 */
export function clearTokenHistory() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    setState({ currentToken: null });
}
