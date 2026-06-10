/**
 * UrbanIA - Interfaz Gráfica y Feedback Visual (UI Core)
 * @description Loaders, toasts, modal de token, indicador de conexión.
 *
 * CORRECCIONES / ADICIONES:
 *  - showTokenModal(): modal persistente con Token ID copiable al portapapeles
 *  - showNotification(): los toasts se apilan verticalmente (no se superponen)
 *  - updateServerStatus(): muestra estado del servidor n8n en el header
 *  - Detección de red offline en tiempo real
 */

// Contador para apilar toasts verticalmente
let _toastCount = 0;

// ─── Loader global ────────────────────────────────────────────────────────────

/**
 * Muestra u oculta el spinner global de procesamiento.
 * @param {boolean} show
 */
export function toggleLoader(show) {
    let loader = document.getElementById('global-loader');

    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            Object.assign(loader.style, {
                position: 'fixed', top: '20px', right: '20px',
                background: '#1e293b', color: '#ffffff',
                padding: '12px 24px', borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                zIndex: '10000', fontFamily: 'system-ui, sans-serif',
                fontSize: '0.9rem', display: 'flex',
                alignItems: 'center', gap: '10px'
            });
            loader.innerHTML = `
                <span style="
                    border: 2px solid #475569;
                    border-top: 2px solid #3b82f6;
                    border-radius: 50%;
                    width: 16px; height: 16px;
                    display: inline-block;
                    animation: urb-spin 0.8s linear infinite;
                "></span>
                Procesando reporte...
            `;
            document.body.appendChild(loader);
            _injectSpinAnimation();
        }
    } else {
        loader?.remove();
    }
}

function _injectSpinAnimation() {
    if (document.getElementById('urb-spin-style')) return;
    const style = document.createElement('style');
    style.id = 'urb-spin-style';
    style.textContent = '@keyframes urb-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
}

// ─── Toasts ───────────────────────────────────────────────────────────────────

/**
 * Muestra una notificación toast flotante. Los toasts se apilan verticalmente.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
export function showNotification(message, type = 'info') {
    const colors = {
        success: '#10b981',
        error:   '#ef4444',
        info:    '#3b82f6'
    };

    const icons = {
        success: '✅',
        error:   '❌',
        info:    'ℹ️'
    };

    _toastCount++;
    const toast = document.createElement('div');
    const bottomOffset = 20 + (_toastCount - 1) * 70;

    Object.assign(toast.style, {
        position:     'fixed',
        bottom:       `${bottomOffset}px`,
        right:        '20px',
        background:   colors[type] || colors.info,
        color:        'white',
        padding:      '14px 20px',
        borderRadius: '8px',
        boxShadow:    '0 10px 25px rgba(0,0,0,0.2)',
        zIndex:       '10001',
        fontFamily:   'system-ui, sans-serif',
        fontWeight:   '500',
        fontSize:     '0.9rem',
        maxWidth:     '360px',
        opacity:      '0',
        transition:   'opacity 0.3s ease',
        display:      'flex',
        alignItems:   'center',
        gap:          '8px'
    });

    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => (toast.style.opacity = '1'), 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
            _toastCount = Math.max(0, _toastCount - 1);
        }, 300);
    }, 5000);
}

// ─── Modal de Token ───────────────────────────────────────────────────────────

/**
 * Muestra un modal persistente con el Token ID asignado al reporte.
 * El usuario puede copiarlo al portapapeles con un clic.
 * @param {string} token - Token ID generado.
 */
export function showTokenModal(token) {
    // Eliminar modal previo si existe
    document.getElementById('token-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'token-modal';
    Object.assign(modal.style, {
        position:        'fixed',
        inset:           '0',
        background:      'rgba(15, 23, 42, 0.75)',
        backdropFilter:  'blur(4px)',
        zIndex:          '20000',
        display:         'flex',
        justifyContent:  'center',
        alignItems:      'center',
        padding:         '20px'
    });

    modal.innerHTML = `
        <div style="
            background: #ffffff;
            border-radius: 16px;
            padding: 36px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px rgba(0,0,0,0.3);
        ">
            <div style="font-size: 3rem; margin-bottom: 12px;">✅</div>
            <h2 style="font-size: 1.4rem; color: #0f172a; margin-bottom: 8px; font-weight: 800;">
                ¡Reporte Registrado!
            </h2>
            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 24px;">
                Tu incidencia fue enviada correctamente. Guarda este Token ID para consultar el 
                diagnóstico de la IA una vez procesado.
            </p>

            <div style="
                background: #f1f5f9;
                border: 2px dashed #94a3b8;
                border-radius: 10px;
                padding: 18px;
                margin-bottom: 20px;
            ">
                <p style="font-size: 0.75rem; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
                    Tu Token ID de Auditoría
                </p>
                <p id="modal-token-value" style="
                    font-size: 1.6rem;
                    font-weight: 800;
                    font-family: monospace;
                    color: #1e293b;
                    letter-spacing: 0.1em;
                ">${token}</p>
            </div>

            <button id="modal-copy-btn" style="
                width: 100%;
                padding: 12px;
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 0.95rem;
                font-weight: 600;
                cursor: pointer;
                margin-bottom: 10px;
                transition: background 0.2s;
            ">📋 Copiar Token al Portapapeles</button>

            <button id="modal-close-btn" style="
                width: 100%;
                padding: 10px;
                background: transparent;
                color: #64748b;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                font-size: 0.9rem;
                cursor: pointer;
            ">Cerrar</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Copiar al portapapeles
    document.getElementById('modal-copy-btn').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(token);
            const btn = document.getElementById('modal-copy-btn');
            btn.textContent = '✅ ¡Copiado!';
            btn.style.background = '#10b981';
            setTimeout(() => {
                btn.textContent = '📋 Copiar Token al Portapapeles';
                btn.style.background = '#2563eb';
            }, 2000);
        } catch {
            showNotification(`Tu Token: ${token}`, 'info');
        }
    });

    // Cerrar modal
    document.getElementById('modal-close-btn').addEventListener('click', () => modal.remove());

    // Cerrar al hacer click fuera del card
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ─── Estado del servidor ──────────────────────────────────────────────────────

/**
 * Actualiza el indicador de estado del servidor en el header.
 * @param {'online'|'offline'|'checking'} status
 */
export function updateServerStatus(status) {
    const indicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.system-status');
    if (!indicator || !statusText) return;

    const states = {
        online:   { color: '#10b981', shadow: '#10b981', label: 'Core de Automatización Operativo (n8n)' },
        offline:  { color: '#ef4444', shadow: '#ef4444', label: 'Core Offline — Verificar ngrok/n8n' },
        checking: { color: '#f59e0b', shadow: '#f59e0b', label: 'Verificando conexión...' }
    };

    const s = states[status] || states.checking;
    indicator.style.backgroundColor = s.color;
    indicator.style.boxShadow = `0 0 8px ${s.shadow}`;

    // Actualizar solo el texto, preservando el indicador en el DOM
    const textNode = statusText.lastChild;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = ` ${s.label}`;
    }
}

// ─── Detección de red ─────────────────────────────────────────────────────────

/**
 * Inicializa listeners para detectar cambios en la conectividad de red
 * y notificar al usuario de forma proactiva.
 */
export function initNetworkMonitor() {
    window.addEventListener('offline', () => {
        showNotification('Sin conexión a Internet. Los reportes no podrán enviarse.', 'error');
        updateServerStatus('offline');
    });

    window.addEventListener('online', () => {
        showNotification('Conexión restaurada. El sistema está operativo.', 'success');
        updateServerStatus('online');
    });
}
