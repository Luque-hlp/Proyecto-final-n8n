/**
 * UrbanIA - Módulo del Formulario de Incidencias
 * @description Manejo transaccional del formulario, validación avanzada y empaquetamiento de payloads.
 *
 * CORRECCIONES APLICADAS:
 *  - Claves de CONFIG.VALIDATIONS alineadas (ALLOWED_IMAGE_TYPES / MAX_IMAGE_SIZE_BYTES)
 *  - buildPayload() ahora incluye: correo, telefono, tipo_incidente
 *  - Validación de formato de correo y teléfono con regex
 *  - Preview de imagen antes del envío
 *  - Modal persistente con Token ID tras envío exitoso
 *  - Listener de file input que actualiza el nombre del archivo
 *  - Botón de submit deshabilitado durante el envío (prevención de doble click)
 */

import CONFIG    from './config.js';
import { getState, setState } from './state.js';
import { generateToken, saveToken } from './token.js';
import { sendReport }   from './api.js';
import { incrementReports } from './dashboard.js';
import { showNotification, toggleLoader, showTokenModal } from './ui.js';

// ─── Listener de actualización de nombre de archivo ──────────────────────────

/**
 * Inicializa el listener del input file para mostrar el nombre del archivo
 * y una previsualización de la imagen seleccionada.
 * Debe invocarse desde main.js en el bootstrap.
 */
export function initFileInput() {
    const fileInput    = document.getElementById('evidencia');
    const fileChosen   = document.getElementById('file-chosen');
    const previewImg   = document.getElementById('img-preview');

    if (!fileInput) return;

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];

        if (!file) {
            if (fileChosen) fileChosen.textContent = 'Ningún archivo seleccionado';
            if (previewImg) previewImg.style.display = 'none';
            return;
        }

        // Actualizar texto informativo
        if (fileChosen) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            fileChosen.textContent = `${file.name} (${sizeMB} MB)`;
        }

        // Preview visual de la imagen seleccionada
        if (previewImg && CONFIG.VALIDATIONS.ALLOWED_IMAGE_TYPES.includes(file.type)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
}

// ─── Validaciones ─────────────────────────────────────────────────────────────

/**
 * Valida el archivo de imagen adjunto.
 * @param {File} file
 * @returns {boolean}
 */
export function validateFile(file) {
    if (!file) {
        showNotification('La evidencia fotográfica del daño es obligatoria.', 'error');
        return false;
    }
    if (!CONFIG.VALIDATIONS.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        showNotification('Formato no soportado. Use JPEG, PNG o WEBP.', 'error');
        return false;
    }
    if (file.size > CONFIG.VALIDATIONS.MAX_IMAGE_SIZE_BYTES) {
        showNotification('La imagen supera el límite de 5 MB permitido.', 'error');
        return false;
    }
    return true;
}

/**
 * Valida el formato del correo electrónico.
 * @param {string} correo
 * @returns {boolean}
 */
function validateEmail(correo) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(correo.trim())) {
        showNotification('El correo electrónico no tiene un formato válido.', 'error');
        return false;
    }
    return true;
}

/**
 * Valida el formato del teléfono (mínimo 7 dígitos, acepta + y espacios).
 * @param {string} telefono
 * @returns {boolean}
 */
function validatePhone(telefono) {
    const phoneRegex = /^\+?[\d\s\-()]{7,15}$/;
    if (!phoneRegex.test(telefono.trim())) {
        showNotification('El número de teléfono no es válido. Ejemplo: +573001234567', 'error');
        return false;
    }
    return true;
}

// ─── Payload ──────────────────────────────────────────────────────────────────

/**
 * Empaqueta todos los campos del formulario en un FormData multipart.
 * Incluye correo, telefono y tipo_incidente (campos que faltaban).
 *
 * @param {string} token
 * @param {string} ciudadano
 * @param {string} correo
 * @param {string} telefono
 * @param {string} tipo
 * @param {string} descripcion
 * @param {File}   file
 * @returns {FormData}
 */
export function buildPayload(token, ciudadano, correo, telefono, tipo, descripcion, file) {
    const { lat, lng } = getState().coordinates;

    const formData = new FormData();
    formData.append('token',           token);
    formData.append('ciudadano',       ciudadano.trim());
    formData.append('correo',          correo.trim().toLowerCase());
    formData.append('telefono',        telefono.trim());
    formData.append('tipo_incidente',  tipo);
    formData.append('descripcion',     descripcion.trim());
    formData.append('latitud',         lat  ?? CONFIG.MAP.DEFAULT_LAT);
    formData.append('longitud',        lng  ?? CONFIG.MAP.DEFAULT_LNG);
    formData.append('file',            file);

    return formData;
}

// ─── Submit principal ─────────────────────────────────────────────────────────

/**
 * Handler principal del formulario. Orquesta validación, envío y feedback.
 * @param {Event} event
 */
export async function submitReport(event) {
    event.preventDefault();

    // Protección contra doble envío
    const currentState = getState();
    if (currentState.isSubmitting) return;

    // Captura de campos
    const formElement      = event.target;
    const ciudadanoInput   = document.getElementById('ciudadano');
    const correoInput      = document.getElementById('correo');
    const telefonoInput    = document.getElementById('telefono');
    const tipoInput        = document.getElementById('tipo-incidente');
    const descripcionInput = document.getElementById('descripcion');
    const fileInput        = document.getElementById('evidencia');
    const submitBtn        = document.getElementById('btn-submit-report');

    const file = fileInput?.files[0];

    // ── Validaciones en cadena ─────────────────────────────────────────────
    if (!validateFile(file))                          return;
    if (!validateEmail(correoInput?.value || ''))     return;
    if (!validatePhone(telefonoInput?.value || ''))   return;

    if (!tipoInput?.value) {
        showNotification('Seleccione el tipo de afectación.', 'error');
        return;
    }

    // ── Bloqueo de UI ──────────────────────────────────────────────────────
    toggleLoader(true);
    setState({ isSubmitting: true });
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.querySelector('span').textContent = 'Enviando reporte...';
    }

    // Token generado en el cliente (se reemplaza por el del servidor si n8n lo devuelve)
    let assignedToken = generateToken();

    try {
        const payload = buildPayload(
            assignedToken,
            ciudadanoInput.value,
            correoInput.value,
            telefonoInput.value,
            tipoInput.value,
            descripcionInput.value,
            file
        );

        // Envío a n8n
        const response = await sendReport(payload);

        // Si n8n devuelve su propio token, lo usamos (mayor robustez)
        if (response?.token && typeof response.token === 'string') {
            assignedToken = response.token;
        }

        // Persistencia y feedback optimista
        saveToken(assignedToken);
        incrementReports();

        // Limpiar formulario
        formElement.reset();
        const previewImg = document.getElementById('img-preview');
        if (previewImg) previewImg.style.display = 'none';
        const fileChosen = document.getElementById('file-chosen');
        if (fileChosen) fileChosen.textContent = 'Ningún archivo seleccionado';

        // Modal persistente con Token ID (reemplaza el toast efímero)
        showTokenModal(assignedToken);

    } catch (error) {
        console.error('[Form Transaction Error]:', error);

        // Detectar si es un problema de red/offline
        if (!navigator.onLine) {
            showNotification('Sin conexión a Internet. Verifique su red e intente nuevamente.', 'error');
        } else {
            showNotification('El servidor de UrbanIA no respondió. Verifique que n8n esté activo.', 'error');
        }

    } finally {
        toggleLoader(false);
        setState({ isSubmitting: false });
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = 'Enviar Reporte y Activar IA';
        }
    }
}
