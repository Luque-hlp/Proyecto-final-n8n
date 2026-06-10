/**
 * UrbanIA - Módulo del Formulario de Incidencias
 *
 * BUG CORREGIDO:
 *  El nodo "Extraer Datos" de n8n lee: body.tokenId, body.nombre, body.email,
 *  body.telefono, body.tipoIncidente, body.descripcion, body.latitud, body.longitud
 *
 *  El buildPayload() anterior usaba nombres distintos (token, ciudadano, correo,
 *  tipo_incidente) que n8n no reconocía, dejando todos los campos vacíos en el Sheet.
 *
 *  Ahora los nombres del FormData coinciden EXACTAMENTE con lo que lee n8n.
 */

import CONFIG    from './config.js';
import { getState, setState } from './state.js';
import { generateToken, saveToken } from './token.js';
import { sendReport }   from './api.js';
import { incrementReports } from './dashboard.js';
import { showNotification, toggleLoader, showTokenModal } from './ui.js';

// ─── File input ───────────────────────────────────────────────────────────────

export function initFileInput() {
    const fileInput  = document.getElementById('evidencia');
    const fileChosen = document.getElementById('file-chosen');
    const previewImg = document.getElementById('img-preview');

    if (!fileInput) return;

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];

        if (!file) {
            if (fileChosen) fileChosen.textContent = 'Ningún archivo seleccionado';
            if (previewImg) previewImg.style.display = 'none';
            return;
        }

        if (fileChosen) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            fileChosen.textContent = `${file.name} (${sizeMB} MB)`;
        }

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

function validateEmail(correo) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(correo.trim())) {
        showNotification('El correo electrónico no tiene un formato válido.', 'error');
        return false;
    }
    return true;
}

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
 * Empaqueta los datos en FormData con los nombres de campo que n8n espera.
 *
 * El nodo "Extraer Datos" en n8n lee body.tokenId, body.nombre, body.email,
 * body.telefono, body.tipoIncidente, body.descripcion, body.latitud, body.longitud.
 * Los nombres deben coincidir exactamente.
 */
export function buildPayload(tokenId, nombre, email, telefono, tipoIncidente, descripcion, file) {
    const { lat, lng } = getState().coordinates;

    const formData = new FormData();
    formData.append('tokenId',       tokenId);
    formData.append('nombre',        nombre.trim());
    formData.append('email',         email.trim().toLowerCase());
    formData.append('telefono',      telefono.trim());
    formData.append('tipoIncidente', tipoIncidente);
    formData.append('descripcion',   descripcion.trim());
    formData.append('latitud',       lat  ?? CONFIG.MAP.DEFAULT_LAT);
    formData.append('longitud',      lng  ?? CONFIG.MAP.DEFAULT_LNG);
    formData.append('file',          file, file.name);

    return formData;
}

// ─── Submit ───────────────────────────────────────────────────────────────────

export async function submitReport(event) {
    event.preventDefault();

    const currentState = getState();
    if (currentState.isSubmitting) return;

    const formElement      = event.target;
    const ciudadanoInput   = document.getElementById('ciudadano');
    const correoInput      = document.getElementById('correo');
    const telefonoInput    = document.getElementById('telefono');
    const tipoInput        = document.getElementById('tipo-incidente');
    const descripcionInput = document.getElementById('descripcion');
    const fileInput        = document.getElementById('evidencia');
    const submitBtn        = document.getElementById('btn-submit-report');

    const file = fileInput?.files[0];

    // Validaciones
    if (!validateFile(file))                          return;
    if (!validateEmail(correoInput?.value || ''))     return;
    if (!validatePhone(telefonoInput?.value || ''))   return;
    if (!tipoInput?.value) {
        showNotification('Seleccione el tipo de afectación.', 'error');
        return;
    }

    // Bloqueo de UI
    toggleLoader(true);
    setState({ isSubmitting: true });
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.querySelector('span').textContent = 'Enviando reporte...';
    }

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

        const response = await sendReport(payload);

        // n8n devuelve { success, tokenId, message } — usar su tokenId si viene
        if (response?.tokenId && typeof response.tokenId === 'string') {
            assignedToken = response.tokenId;
        } else if (response?.token && typeof response.token === 'string') {
            assignedToken = response.token;
        }

        saveToken(assignedToken);
        incrementReports();

        // Limpiar formulario
        formElement.reset();
        const previewImg = document.getElementById('img-preview');
        if (previewImg) previewImg.style.display = 'none';
        const fileChosen = document.getElementById('file-chosen');
        if (fileChosen) fileChosen.textContent = 'Ningún archivo seleccionado';

        showTokenModal(assignedToken);

    } catch (error) {
        console.error('[Form Transaction Error]:', error);
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