/**
 * dedicatory.js - Sistema completo de dedicatorias
 * 
 * FUNCIONALIDADES:
 * 1. Guardar dedicatorias con storage
 * 2. Ver lista de dedicatorias guardadas
 * 3. Compartir dedicatoria (generar imagen)
 * 4. Eliminar dedicatorias
 */

import { storage } from './storage.js';
import { dataURLtoFile, CustomDialog } from './utils.js';


export class DedicatoryManager {
    constructor(flowerCanvas, rainManager, critterManager) {
        this.flowers = flowerCanvas;
        this.rain = rainManager;
        this.critters = critterManager;
        this.modal = document.querySelector('.dedicatory-modal');
        this.dedicatories = [];
        
        this.init();
    }

    init() {
        if (!this.modal) {
            console.warn('Modal de dedicatoria no encontrado');
            return;
        }
        
        // Cargar dedicatorias guardadas
        this.loadDedicatories();
        
        // Configurar modal
        this.setupModal();
        
        
        // Crear vista de dedicatorias guardadas
        this.createDedicatoriesView();
        
        console.log('✅ DedicatoryManager inicializado');
    }

    setupModal() {
        const form = this.modal.querySelector('.dedicatory-form');
        const closeBtn = this.modal.querySelector('.btn-secondary');
        const saveBtn = this.modal.querySelector('.btn-primary');
        
        // Botón guardar
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveDedicatory());
        }
        
        // Botón cancelar
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }

    open() {
        if (!this.modal) {
            console.error('❌ Modal de dedicatoria no encontrado');
            return;
        }

        this.modal.classList.add('active');
        document.querySelector('.panel-overlay')?.classList.add('active');
        
        // Focus en nombre
        setTimeout(() => {
            this.modal.querySelector('input[name="dedicatory-name"]')?.focus();
        }, 300);
    }

    close() {
        this.modal.classList.remove('active');
        
        const menuOpen = document.querySelector('.unified-menu.open');
        const inboxOpen = document.querySelector('.inbox-container.open');
        
        if (!menuOpen && !inboxOpen) {
            document.querySelector('.panel-overlay')?.classList.remove('active');
        }
        
        // Limpiar formulario
        const nameInput = this.modal.querySelector('input[name="dedicatory-name"]');
        const messageInput = this.modal.querySelector('textarea[name="dedicatory-message"]');
        
        if (nameInput) nameInput.value = '';
        if (messageInput) messageInput.value = '';
    }

    async saveDedicatory() {
        const nameInput = this.modal.querySelector('input[name="dedicatory-name"]');
        const messageInput = this.modal.querySelector('textarea[name="dedicatory-message"]');
        
        const name = nameInput?.value.trim();
        const message = messageInput?.value.trim();
        
        if (!name && !message) {
            this.showNotification('Por favor escribe un nombre o mensaje', 'error');
            return;
        }
        
        // Capturar imagen actual del canvas
        const snapshot = this.getSnapshot();
        
        // Crear dedicatoria
        const dedicatory = {
            id: `ded_${Date.now()}`,
            name: name || 'Anónimo',
            message: message || '',
            snapshot: snapshot,
            date: new Date().toISOString(),
            dateFormatted: new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };
        
        // Guardar
        this.dedicatories.unshift(dedicatory);
        this.saveDedicatories();
        
        // Limpiar formulario
        if (nameInput) nameInput.value = '';
        if (messageInput) messageInput.value = '';
        
        // Cerrar y notificar
        this.close();
        this.showNotification('✨ Dedicatoria guardada con éxito', 'success');
        
        // Actualizar vista
        this.updateDedicatoriesView();
        
        console.log('✅ Dedicatoria guardada:', dedicatory);
    }

    getSnapshot() {
        const sourceCanvas = this.flowers.canvas;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceCanvas.width;
        tempCanvas.height = sourceCanvas.height;
        const ctx = tempCanvas.getContext('2d');
        
        // 1. Flores (Fondo WebGL)
        ctx.drawImage(sourceCanvas, 0, 0);
        
        // 2. Suelo/Nieve (Canvas 2D)
        if (this.rain && this.rain.floorCanvas) {
            ctx.drawImage(this.rain.floorCanvas, 0, 0);
        }
        
        // 3. Lluvia (Partículas DOM -> Canvas)
        if (this.rain && this.rain.isActive) {
            this.rain.particles.forEach(p => {
                const img = p.element.querySelector('img');
                if (img) {
                    const size = parseFloat(p.element.style.width);
                    const swayOffset = Math.sin(p.swayPhase) * p.sway;
                    
                    ctx.save();
                    ctx.translate(p.x + swayOffset + size/2, p.y + size/2);
                    ctx.rotate(p.rotation * Math.PI / 180);
                    ctx.drawImage(img, -size/2, -size/2, size, size);
                    ctx.restore();
                }
            });
        }

        // 4. Critters (Abejas/Luciérnagas)
        if (this.critters) {
            this.critters.drawToCanvas(ctx);
        }
        
        return tempCanvas.toDataURL('image/png');
    }

    loadDedicatories() {
        const saved = storage.load('dedicatories', []);
        this.dedicatories = Array.isArray(saved) ? saved : [];
        console.log(`📖 ${this.dedicatories.length} dedicatorias cargadas`);
    }

    saveDedicatories() {
        storage.save('dedicatories', this.dedicatories);
    }

    /**
     * Crear vista para ver dedicatorias guardadas
     */
    createDedicatoriesView() {
        // Crear modal para ver dedicatorias
        const viewModal = document.createElement('div');
        viewModal.className = 'dedicatories-view-modal';
        viewModal.innerHTML = `
            <div class="dedicatories-view-content">
                <div class="dedicatories-header">
                    <h2>Dedicatorias Guardadas</h2>
                    <button class="dedicatories-close" aria-label="Cerrar">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6L18 18"/>
                        </svg>
                    </button>
                </div>
                <div class="dedicatories-body">
                    <div class="dedicatories-empty" style="display: none;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <p>No hay dedicatorias guardadas</p>
                    </div>
                    <div class="dedicatories-grid"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(viewModal);
        
        // Event listeners
        const closeBtn = viewModal.querySelector('.dedicatories-close');
        closeBtn.addEventListener('click', () => this.closeDedicatoriesView());
        
        // Guardar referencia
        this.viewModal = viewModal;
        
        // Actualizar contenido
        this.updateDedicatoriesView();
    }

    openDedicatoriesView() {
        this.viewModal.classList.add('active');
        document.querySelector('.panel-overlay')?.classList.add('active');
        this.updateDedicatoriesView();
    }

    closeDedicatoriesView() {
        this.viewModal.classList.remove('active');
        
        const menuOpen = document.querySelector('.unified-menu.open');
        const inboxOpen = document.querySelector('.inbox-container.open');
        
        if (!menuOpen && !inboxOpen) {
            document.querySelector('.panel-overlay')?.classList.remove('active');
        }
    }

    updateDedicatoriesView() {
        const grid = this.viewModal.querySelector('.dedicatories-grid');
        const emptyState = this.viewModal.querySelector('.dedicatories-empty');
        
        if (this.dedicatories.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }
        
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        grid.innerHTML = '';
        
        this.dedicatories.forEach(ded => {
            const card = document.createElement('div');
            card.className = 'dedicatory-card';
            card.innerHTML = `
                <div class="dedicatory-snapshot">
                    <img src="${ded.snapshot}" alt="Captura">
                </div>
                <div class="dedicatory-info">
                    <h3 class="dedicatory-name">${this.escapeHtml(ded.name)}</h3>
                    <p class="dedicatory-message">${this.escapeHtml(ded.message || 'Sin mensaje')}</p>
                    <span class="dedicatory-date">${ded.dateFormatted}</span>
                </div>
                <div class="dedicatory-actions">
                    <button class="dedicatory-action-btn" data-action="share" title="Compartir">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                            <polyline points="16 6 12 2 8 6"/>
                            <line x1="12" y1="2" x2="12" y2="15"/>
                        </svg>
                    </button>
                    <button class="dedicatory-action-btn" data-action="download" title="Descargar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </button>
                    <button class="dedicatory-action-btn" data-action="delete" title="Eliminar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            `;
            
            // Event listeners
            const shareBtn = card.querySelector('[data-action="share"]');
            const deleteBtn = card.querySelector('[data-action="delete"]');
            const downloadBtn = card.querySelector('[data-action="download"]');
            const snapshot = card.querySelector('.dedicatory-snapshot');
            
            snapshot.addEventListener('click', () => {
                this.openPreview(ded);
            });
            
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.shareDedicatory(ded);
            });

            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadDedicatory(ded);
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteDedicatory(ded.id);
            });
            
            grid.appendChild(card);
        });
    }

    /**
     * Genera la imagen de la dedicatoria
     */
    async generateDedicatoryImage(dedicatory) {
        // Crear canvas para composición
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1350;
        const ctx = canvas.getContext('2d');
        
        // Configuración estilo "Marca de Agua" (Leica/Xiaomi style)
        const footerHeight = 320;
        const imageHeight = canvas.height - footerHeight;
        
        // 1. DIBUJAR IMAGEN (Snapshot)
        // Fondo negro
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, canvas.width, imageHeight);
        
        // Cargar snapshot
        const img = new Image();
        img.src = dedicatory.snapshot;
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
        
        // Ajustar imagen (Object-fit: Cover)
        const aspectRatio = img.width / img.height;
        const targetRatio = canvas.width / imageHeight;
        
        let drawW, drawH, drawX, drawY;
        
        if (aspectRatio > targetRatio) {
            drawH = imageHeight;
            drawW = drawH * aspectRatio;
            drawX = (canvas.width - drawW) / 2;
            drawY = 0;
        } else {
            drawW = canvas.width;
            drawH = drawW / aspectRatio;
            drawX = 0;
            drawY = (imageHeight - drawH) / 2;
        }
        
        // Dibujar imagen con recorte
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, imageHeight);
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
        
        // 2. DIBUJAR FOOTER (Barra blanca estilo Leica)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, imageHeight, canvas.width, footerHeight);
        
        // Configuración de estilo
        const padding = 70;
        const footerY = imageHeight + padding;
        const separatorX = canvas.width * 0.4; // Línea divisoria al 40%
        
        // --- COLUMNA IZQUIERDA (Info Principal) ---
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // "PARA" (Label)
        ctx.font = '600 20px "Inter", sans-serif';
        ctx.fillStyle = '#e91e63'; // Acento rosa
        ctx.fillText('PARA', padding, footerY);
        
        // NOMBRE
        ctx.font = 'bold 64px "Crimson Pro", serif';
        ctx.fillStyle = '#111111';
        // Ajustar tamaño si el nombre es muy largo
        if (dedicatory.name.length > 12) ctx.font = 'bold 48px "Crimson Pro", serif';
        ctx.fillText(dedicatory.name, padding, footerY + 35);
        
        // FECHA
        ctx.font = '500 24px "Inter", sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText(dedicatory.dateFormatted, padding, footerY + 110);
        
        // --- SEPARADOR VERTICAL ---
        ctx.beginPath();
        ctx.moveTo(separatorX, imageHeight + 50);
        ctx.lineTo(separatorX, canvas.height - 50);
        ctx.strokeStyle = '#eeeeee';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // --- COLUMNA DERECHA (Mensaje) ---
        if (dedicatory.message) {
            const msgX = separatorX + 50;
            const msgWidth = canvas.width - msgX - padding;
            
            ctx.fillStyle = '#444444';
            ctx.font = 'italic 32px "Crimson Pro", serif';
            
            let currentY = footerY;
            const lineHeight = 44;

            // Dividir por párrafos para respetar los saltos de línea del usuario
            const paragraphs = dedicatory.message.split('\n');
            paragraphs.forEach(paragraph => {
                currentY = this.wrapText(ctx, paragraph, msgX, currentY, msgWidth, lineHeight);
            });
        }
        
        // Preparar datos
        const dataURL = canvas.toDataURL('image/png');
        // Nombre limpio permitiendo caracteres latinos
        const cleanName = dedicatory.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ ]/g, '').trim().replace(/\s+/g, '_');
        const filename = `Dedicatoria_para_${cleanName || 'Ti'}.png`;

        return { dataURL, filename };
    }

    /**
     * Compartir dedicatoria
     */
    async shareDedicatory(dedicatory) {
        try {
            const { dataURL, filename } = await this.generateDedicatoryImage(dedicatory);

            // INTENTO DE COMPARTIR NATIVO (Móvil)
            if (navigator.canShare && navigator.share) {
                try {
                    const file = dataURLtoFile(dataURL, filename);
                    const shareData = {
                        files: [file],
                        title: 'Dedicatoria Floral',
                        text: `Para: ${dedicatory.name}\n\n${dedicatory.message || 'Un detalle especial.'}\n\n📅 ${dedicatory.dateFormatted}`
                    };

                    if (navigator.canShare(shareData)) {
                        await navigator.share(shareData);
                        this.showNotification('✨ Compartido con éxito', 'success');
                        this.triggerConfetti();
                        return; // Salir si se compartió exitosamente
                    }
                } catch (err) {
                    console.warn('Share API cancelado o falló, usando descarga normal:', err);
                }
            }

            // Si falla compartir, intentar descargar
            this.downloadDedicatory(dedicatory);
            
        } catch (error) {
            console.error('Error compartiendo dedicatoria:', error);
            this.showNotification('Error al generar imagen', 'error');
        }
    }

    /**
     * Descargar dedicatoria
     */
    async downloadDedicatory(dedicatory) {
        try {
            const { dataURL, filename } = await this.generateDedicatoryImage(dedicatory);

            const link = document.createElement('a');
            link.download = filename;
            link.href = dataURL;
            link.click();
            
            this.triggerConfetti();
            
            // Copiar texto al portapapeles para tenerlo separado
            try {
                const textBody = `Para: ${dedicatory.name}\n\n${dedicatory.message || ''}\n\n📅 ${dedicatory.dateFormatted}`;
                await navigator.clipboard.writeText(textBody);
                this.showNotification('Imagen descargada y texto copiado', 'success');
            } catch (e) {
                this.showNotification('✨ Imagen descargada', 'success');
            }
        } catch (error) {
            console.error('Error descargando dedicatoria:', error);
            this.showNotification('Error al descargar', 'error');
        }
    }

    async openPreview(dedicatory) {
        let modal = document.querySelector('.image-preview-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'image-preview-modal';
            modal.innerHTML = `
                <button class="image-preview-close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6L18 18"/>
                    </svg>
                </button>
                <div class="image-preview-content">
                    <img src="" alt="Preview">
                </div>
            `;
            document.body.appendChild(modal);
            
            const close = () => modal.classList.remove('active');
            modal.querySelector('.image-preview-close').addEventListener('click', close);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });
        }
        
        try {
            const { dataURL } = await this.generateDedicatoryImage(dedicatory);
            const img = modal.querySelector('img');
            img.src = dataURL;
            modal.classList.add('active');
        } catch (e) {
            console.error(e);
            this.showNotification('Error al generar previsualización', 'error');
        }
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(line, x, y);
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        
        ctx.fillText(line, x, y);
        return y + lineHeight; // Retornamos la siguiente posición Y para el próximo párrafo
    }

    async deleteDedicatory(id) {
        const confirmed = await CustomDialog.confirm(
            'Eliminar dedicatoria',
            '¿Estás seguro de que quieres eliminar esta dedicatoria?',
            'Eliminar',
            'Cancelar'
        );
        
        if (!confirmed) return;
        
        this.dedicatories = this.dedicatories.filter(d => d.id !== id);
        this.saveDedicatories();
        this.updateDedicatoriesView();
        
        this.showNotification('Dedicatoria eliminada', 'info');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    triggerConfetti() {
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
        document.body.appendChild(container);

        const colors = ['#ffeb3b', '#ff5722', '#e91e63', '#9c27b0', '#2196f3', '#00bcd4', '#4caf50'];
        
        for (let i = 0; i < 100; i++) {
            const el = document.createElement('div');
            const size = Math.random() * 8 + 4;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            el.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                left: ${Math.random() * 100}vw;
                top: -20px;
                border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
                opacity: ${Math.random()};
            `;
            
            container.appendChild(el);
            
            const duration = 1500 + Math.random() * 2000;
            const xEnd = (Math.random() - 0.5) * 300;
            
            el.animate([
                { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
                { transform: `translate(${xEnd}px, 110vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                fill: 'forwards'
            });
        }
        
        setTimeout(() => container.remove(), 4000);
    }

    showNotification(message, type = 'info') {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        }
    }
}