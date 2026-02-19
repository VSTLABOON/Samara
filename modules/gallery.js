/**
 * gallery.js - Sistema de galería con persistencia
 * Integrado con storage.js
 */
import { storage } from './storage.js';
import { dataURLtoFile, CustomDialog } from './utils.js';

export class GalleryManager {
    constructor(flowerCanvas, rainManager, critterManager) {
        this.flowers = flowerCanvas;
        this.rain = rainManager;
        this.critters = critterManager;
        this.modal = document.querySelector('.gallery-modal');
        this.grid = null;
        this.emptyState = document.querySelector('.gallery-empty');
        this.closeBtn = document.querySelector('.gallery-close');
        this.overlay = document.querySelector('.panel-overlay');
        
        this.savedImages = [];
        this.loadFromStorage();
        
        this.init();
    }

    init() {
        if (!this.modal) return;

        // Cerrar modal
        this.closeBtn?.addEventListener('click', () => this.close());
        
        // Crear grid si no existe
        const body = this.modal.querySelector('.gallery-body');
        if (body && !this.grid) {
            this.grid = document.createElement('div');
            this.grid.className = 'gallery-grid';
            body.insertBefore(this.grid, this.emptyState);
        }

        // Botón de captura
        this.createCaptureButton();
        
        this.render();
    }

    createCaptureButton() {
        const header = this.modal.querySelector('.gallery-header');
        if (!header || header.querySelector('.gallery-capture-btn')) return;

        const captureBtn = document.createElement('button');
        captureBtn.className = 'gallery-capture-btn';
        captureBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>Capturar</span>
        `;
        captureBtn.addEventListener('click', () => this.captureAndSave());
        
        header.insertBefore(captureBtn, this.closeBtn);
    }

    captureAndSave() {
        try {
            // Composición: Canvas WebGL + Lluvia (DOM)
            const sourceCanvas = this.flowers.canvas;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = sourceCanvas.width;
            tempCanvas.height = sourceCanvas.height;
            const ctx = tempCanvas.getContext('2d');
            
            // 1. Dibujar flores (fondo)
            ctx.drawImage(sourceCanvas, 0, 0);
            
            // 2. Dibujar suelo/nieve (Canvas 2D)
            if (this.rain && this.rain.floorCanvas) {
                ctx.drawImage(this.rain.floorCanvas, 0, 0);
            }
            
            // 3. Dibujar lluvia si está activa
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

            // 4. Dibujar critters (Abejas/Luciérnagas)
            if (this.critters) {
                this.critters.drawToCanvas(ctx);
            }
            
            const dataURL = tempCanvas.toDataURL('image/png');
            const timestamp = Date.now();
            const id = `capture_${timestamp}`;
            
            const image = {
                id,
                dataURL,
                timestamp,
                date: new Date().toLocaleDateString('es-ES'),
                time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            };

            this.savedImages.unshift(image);
            this.saveToStorage();
            this.render();

            this.showNotification('Captura guardada ✨', 'success');
            
            if (!this.modal.classList.contains('active')) {
                this.open();
            }
        } catch (error) {
            console.error('Error al capturar:', error);
            this.showNotification('Error al capturar', 'error');
        }
    }

    render() {
        if (!this.grid) return;

        if (this.savedImages.length === 0) {
            this.grid.style.display = 'none';
            if (this.emptyState) this.emptyState.style.display = 'flex';
            return;
        }

        this.grid.style.display = 'grid';
        if (this.emptyState) this.emptyState.style.display = 'none';
        this.grid.innerHTML = '';

        this.savedImages.forEach(image => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.dataset.id = image.id;

            item.innerHTML = `
                <img src="${image.dataURL}" alt="Captura ${image.date}">
                <div class="gallery-item-overlay">
                    <div class="gallery-item-info">
                        <span class="gallery-item-date">${image.date}</span>
                        <span class="gallery-item-time">${image.time}</span>
                    </div>
                    <div class="gallery-item-actions">
                        <button class="gallery-item-btn" data-action="share" title="Compartir">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                        </button>
                        <button class="gallery-item-btn" data-action="download" title="Descargar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </button>
                        <button class="gallery-item-btn" data-action="delete" title="Eliminar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;

            const shareBtn = item.querySelector('[data-action="share"]');
            const downloadBtn = item.querySelector('[data-action="download"]');
            const deleteBtn = item.querySelector('[data-action="delete"]');

            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.shareImage(image);
            });

            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadImage(image);
            });

            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteImage(image.id);
            });

            item.querySelector('img').addEventListener('click', () => {
                this.openPreview(image);
            });

            this.grid.appendChild(item);
        });
    }

    async shareImage(image) {
        const filename = `jardin_${image.timestamp}.png`;

        // 1. INTENTO DE COMPARTIR NATIVO (Móvil)
        if (navigator.canShare && navigator.share) {
            try {
                const file = dataURLtoFile(image.dataURL, filename);
                const shareData = {
                    files: [file],
                    title: 'Mi Jardín Floral',
                    text: 'Mira el jardín que he creado ✨'
                };

                if (navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                    this.showNotification('✨ Compartido con éxito', 'success');
                    return;
                }
            } catch (err) {
                console.warn('Share API cancelado o falló:', err);
            }
        }

        // 2. FALLBACK PC: Copiar al portapapeles
        try {
            const res = await fetch(image.dataURL);
            const blob = await res.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            this.showNotification('📋 Imagen copiada al portapapeles', 'success');
        } catch (err) {
            this.showNotification('Función compartir no disponible', 'info');
        }
    }

    downloadImage(image) {
        const filename = `jardin_${image.timestamp}.png`;
        const link = document.createElement('a');
        link.download = filename;
        link.href = image.dataURL;
        link.click();
        this.showNotification('Imagen descargada', 'success');
    }

    async deleteImage(id) {
        const confirmed = await CustomDialog.confirm(
            'Eliminar imagen',
            '¿Estás seguro de que quieres eliminar esta captura?',
            'Eliminar',
            'Cancelar'
        );

        if (!confirmed) return;

        const index = this.savedImages.findIndex(img => img.id === id);
        if (index !== -1) {
            this.savedImages.splice(index, 1);
            this.saveToStorage();
            this.render();
            this.showNotification('Imagen eliminada', 'info');
        }
    }

    saveToStorage() {
        storage.saveGallery(this.savedImages);
    }

    loadFromStorage() {
        this.savedImages = storage.loadGallery();
    }

    clearAll() {
        if (confirm('¿Eliminar todas las capturas?')) {
            this.savedImages = [];
            this.saveToStorage();
            this.render();
            this.showNotification('Galería limpiada', 'info');
        }
    }

    open() {
        this.modal.classList.add('active');
        this.overlay?.classList.add('active');
        this.render();
    }

    close() {
        this.modal.classList.remove('active');
        
        const menuOpen = document.querySelector('.unified-menu.open');
        const inboxOpen = document.querySelector('.inbox-container.open');
        
        if (!menuOpen && !inboxOpen) {
            this.overlay?.classList.remove('active');
        }
    }

    openPreview(image) {
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
        
        const img = modal.querySelector('img');
        img.src = image.dataURL;
        modal.classList.add('active');
    }

    showNotification(message, type = 'info') {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        }
    }
}