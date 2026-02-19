/**
 * utils.js - Herramientas de soporte y UI delicada
 * Versión mejorada con mejor manejo de errores
 */

export class CustomDialog {
    /**
     * Crea una promesa que despliega un diálogo elegante y espera respuesta
     */
    static async confirm(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
        return new Promise((resolve) => {
            const overlay = document.getElementById('custom-dialog');
            
            // Fallback: Si no existe el HTML del diálogo, usar el del sistema
            if (!overlay) {
                console.warn('CustomDialog: Elemento #custom-dialog no encontrado, usando confirm del navegador');
                resolve(window.confirm(message));
                return;
            }

            const titleEl = overlay.querySelector('.dialog-title');
            const msgEl = overlay.querySelector('.dialog-message');
            const confirmBtn = overlay.querySelector('.btn-confirm');
            const cancelBtn = overlay.querySelector('.btn-cancel');

            // Configurar contenido
            if (titleEl) titleEl.textContent = title;
            if (msgEl) msgEl.textContent = message;
            if (confirmBtn) confirmBtn.textContent = confirmText;
            if (cancelBtn) cancelBtn.textContent = cancelText;

            const close = (result) => {
                overlay.classList.remove('active');
                cleanup();
                // Esperar a que termine la animación de cierre
                setTimeout(() => resolve(result), 300);
            };

            const handleConfirm = () => close(true);
            const handleCancel = () => close(false);
            const handleEscape = (e) => {
                if (e.key === 'Escape') close(false);
            };
            const handleOverlayClick = (e) => {
                if (e.target === overlay) close(false);
            };

            const cleanup = () => {
                confirmBtn?.removeEventListener('click', handleConfirm);
                cancelBtn?.removeEventListener('click', handleCancel);
                overlay.removeEventListener('click', handleOverlayClick);
                document.removeEventListener('keydown', handleEscape);
            };

            // Registrar eventos
            confirmBtn?.addEventListener('click', handleConfirm);
            cancelBtn?.addEventListener('click', handleCancel);
            overlay.addEventListener('click', handleOverlayClick);
            document.addEventListener('keydown', handleEscape);

            // Mostrar diálogo
            overlay.classList.add('active');
            
            // Focus en el botón de confirmación para accesibilidad
            setTimeout(() => confirmBtn?.focus(), 100);
        });
    }

    /**
     * Diálogo de alerta simple
     */
    static async alert(title, message, buttonText = 'Aceptar') {
        return new Promise((resolve) => {
            const overlay = document.getElementById('custom-dialog');
            
            if (!overlay) {
                window.alert(message);
                resolve();
                return;
            }

            const titleEl = overlay.querySelector('.dialog-title');
            const msgEl = overlay.querySelector('.dialog-message');
            const confirmBtn = overlay.querySelector('.btn-confirm');
            const cancelBtn = overlay.querySelector('.btn-cancel');

            if (titleEl) titleEl.textContent = title;
            if (msgEl) msgEl.textContent = message;
            if (confirmBtn) confirmBtn.textContent = buttonText;
            
            // Ocultar botón cancelar en modo alert
            if (cancelBtn) cancelBtn.style.display = 'none';

            const close = () => {
                overlay.classList.remove('active');
                if (cancelBtn) cancelBtn.style.display = '';
                cleanup();
                setTimeout(() => resolve(), 300);
            };

            const handleConfirm = () => close();
            const handleEscape = (e) => {
                if (e.key === 'Escape') close();
            };

            const cleanup = () => {
                confirmBtn?.removeEventListener('click', handleConfirm);
                document.removeEventListener('keydown', handleEscape);
            };

            confirmBtn?.addEventListener('click', handleConfirm);
            document.addEventListener('keydown', handleEscape);

            overlay.classList.add('active');
            setTimeout(() => confirmBtn?.focus(), 100);
        });
    }
}

/**
 * Sistema de notificaciones efímeras y elegantes
 */
export function showNotification(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.notification-container');
    
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 30px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${type}`;
    toast.textContent = message;
    
    // Colores según tipo
    const colors = {
        info: 'rgba(20, 20, 25, 0.85)',
        success: 'rgba(34, 139, 34, 0.85)',
        error: 'rgba(220, 38, 38, 0.85)',
        warning: 'rgba(255, 165, 0, 0.85)'
    };
    
    const borderColors = {
        info: 'rgba(255, 255, 255, 0.15)',
        success: 'rgba(34, 197, 94, 0.3)',
        error: 'rgba(248, 113, 113, 0.3)',
        warning: 'rgba(251, 191, 36, 0.3)'
    };
    
    // Glassmorphism estilizado
    toast.style.cssText = `
        background: ${colors[type] || colors.info};
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        color: rgba(255, 255, 255, 0.95);
        border: 1px solid ${borderColors[type] || borderColors.info};
        padding: 14px 26px;
        border-radius: 40px;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.3px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.4);
        opacity: 0;
        transform: translateY(-25px) scale(0.9);
        transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        pointer-events: auto;
        max-width: 400px;
        text-align: center;
    `;

    container.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Salida automática
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-15px) scale(0.95)';
        toast.style.filter = 'blur(6px)';
        
        setTimeout(() => {
            toast.remove();
            
            // Limpiar contenedor si está vacío
            if (container.children.length === 0) {
                container.remove();
            }
        }, 600);
    }, duration);

    return toast;
}

/**
 * Helper para pausas asíncronas
 */
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Debounce function para optimizar eventos repetitivos
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function para limitar frecuencia de ejecución
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Convierte DataURL a File object para compartir nativamente
 */
export function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, {type:mime});
}