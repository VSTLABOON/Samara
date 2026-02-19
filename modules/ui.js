import { showNotification, CustomDialog } from './utils.js';
import { storage } from './storage.js';

/**
 * UI_Manager - VERSIÓN CORREGIDA CON PREVENCIÓN DE EVENT BUBBLING
 * Evita que eventos del canvas lleguen a los listeners del menú
 */

export class UI_Manager {
    constructor(flowerCanvas, rainManager, galleryManager, dedicatoryManager) {
        this.flowers = flowerCanvas;
        this.rain = rainManager;
        this.gallery = galleryManager;
        this.dedicatory = dedicatoryManager;
        this.menu = document.querySelector('.unified-menu');
        this.overlay = document.querySelector('.panel-overlay');
        
        // Rastrear estado del menú
        this.isMenuOpen = false;
        
        this.views = {
            main: document.querySelector('.view-main'),
            colors: document.querySelector('.view-colors'),
            rain: document.querySelector('.view-rain')
        };
        
        this.init();
        this.restoreState();
    }

    init() {
        if (!this.menu) return;

        console.log('🎨 Inicializando UI_Manager...');

        // 1. Delegación para el menú principal - CON CAPTURE PHASE
        this.views.main?.addEventListener('click', (e) => {
            if (!this.isMenuOpen) {
                e.stopPropagation();
                return;
            }
            
            const btn = e.target.closest('.tool-item');
            if (btn) {
                e.stopPropagation();
                this.handleAction(btn);
            }
        }, true); // ✅ true = capture phase

        // 2. Delegación para colores - CON CAPTURE PHASE
        this.views.colors?.addEventListener('click', (e) => {
            if (!this.isMenuOpen) {
                e.stopPropagation();
                return;
            }
            
            const btn = e.target.closest('.color-option');
            if (btn && btn.dataset.color) {
                e.stopPropagation();
                
                this.flowers.setColorScheme(btn.dataset.color);
                storage.saveColorScheme(btn.dataset.color);
                
                this.views.colors.querySelectorAll('.color-option').forEach(d => d.classList.remove('active'));
                btn.classList.add('active');
                
                showNotification(`Color ${this.getColorName(btn.dataset.color)} aplicado`);
            }
        }, true);

        // 3. Setup de lluvia
        this.setupRainView();

        // 4. Botones de navegación - CON CAPTURE PHASE
        document.querySelectorAll('.menu-back').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.isMenuOpen) {
                    e.stopPropagation();
                    return;
                }
                e.stopPropagation();
                this.switchView('main');
            }, true);
        });

        // 5. Cerrar menú - CON CAPTURE PHASE
        document.querySelector('.menu-close')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeAll();
        }, true);
        
        // 6. Overlay cierra menú
        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay && this.menu.classList.contains('open')) {
                e.stopPropagation();
                this.closeAll();
            }
        });
        
        console.log('✅ UI_Manager inicializado');
    }

    setupRainView() {
        if (!this.views.rain) return;

        // --- INICIO: MODIFICACIÓN PARA SCROLL ---
        // Evitar doble wrapping si ya existe
        if (this.views.rain.querySelector('.rain-scroll-wrapper')) return;

        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'rain-scroll-wrapper';
        
        // Identificar header para mantenerlo fijo (mejor UX)
        const header = this.views.rain.querySelector('.menu-header');
        
        // Mover contenido (todo menos el header) al wrapper
        const children = Array.from(this.views.rain.children);
        children.forEach(child => {
            if (child !== header) {
                scrollWrapper.appendChild(child);
            }
        });
        this.views.rain.appendChild(scrollWrapper);

        // Modos individuales - CON CAPTURE PHASE
        scrollWrapper.querySelectorAll('.rain-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.isMenuOpen) {
                    e.stopPropagation();
                    return;
                }
                
                e.stopPropagation();
                
                const mode = btn.dataset.mode;
                
                if (mode === 'all') {
                    this.rain.setAllModes();
                } else {
                    this.rain.setModes([mode]);
                }
                
                scrollWrapper.querySelectorAll('.rain-mode-btn').forEach(b => b.classList.remove('active'));
                scrollWrapper.querySelectorAll('.combo-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                storage.saveRainState(this.rain.getState());
                showNotification(`Modo ${mode} seleccionado`);
            });
        });

        // Combinaciones - CON CAPTURE PHASE
        scrollWrapper.querySelectorAll('.combo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.isMenuOpen) {
                    e.stopPropagation();
                    return;
                }
                
                e.stopPropagation();
                
                const combo = btn.dataset.combo.split(',');
                this.rain.setModes(combo);
                
                scrollWrapper.querySelectorAll('.rain-mode-btn').forEach(b => b.classList.remove('active'));
                scrollWrapper.querySelectorAll('.combo-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                storage.saveRainState(this.rain.getState());
                showNotification(`Combinación ${combo.join(' + ')} seleccionada`);
            });
        });

        // Activar lluvia - CON CAPTURE PHASE
        const activateBtn = scrollWrapper.querySelector('.btn-rain-activate');
        if (activateBtn) {
            activateBtn.addEventListener('click', (e) => {
                if (!this.isMenuOpen) {
                    e.stopPropagation();
                    return;
                }
                
                e.stopPropagation();
                
                const isActive = this.rain.toggle();
                
                if (isActive) {
                    activateBtn.classList.add('active');
                    activateBtn.querySelector('.rain-status-text').textContent = 'Detener Lluvia';
                    activateBtn.querySelector('.rain-status-icon').textContent = '⏸';
                } else {
                    activateBtn.classList.remove('active');
                    activateBtn.querySelector('.rain-status-text').textContent = 'Activar Lluvia';
                    activateBtn.querySelector('.rain-status-icon').textContent = '▶';
                }
                
                storage.saveRainState(this.rain.getState());
                showNotification(isActive ? 'Lluvia activada ✨' : 'Lluvia detenida');
            });
        }

        // Evitar que el scroll táctil se propague al canvas
        scrollWrapper.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });

        // Evitar que wheel escape al body cuando el wrapper llega a sus límites
        scrollWrapper.addEventListener('wheel', (e) => {
            const atTop    = scrollWrapper.scrollTop === 0 && e.deltaY < 0;
            const atBottom = scrollWrapper.scrollTop + scrollWrapper.clientHeight >= scrollWrapper.scrollHeight && e.deltaY > 0;
            if (!atTop && !atBottom) {
                e.stopPropagation();
            }
        }, { passive: true });

        // FIX DEFINITIVO: Prevenir que el menú se cierre al interactuar con el scroll.
        // Al hacer 'mousedown' en cualquier parte del área de scroll (incluida la barra),
        // detenemos la propagación del evento. Esto evita que un 'click' se complete
        // en el 'overlay' que está detrás, lo que cerraría el panel.
        scrollWrapper.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
    }

    getColorName(color) {
        const names = {
            'default': 'Original',
            'red': 'Rojo',
            'wine': 'Vino',
            'pink': 'Rosa',
            'blue': 'Azul',
            'purple': 'Morado',
            'yellow': 'Amarillo',
            'white': 'Blanco'
        };
        return names[color] || color;
    }

    handleAction(btn) {
        if (!this.isMenuOpen) {
            return;
        }
        
        const action = btn.dataset.action;
        const goto = btn.dataset.goto;

        if (goto) {
            this.switchView(goto);
        } else if (action) {
            switch (action) {
                case 'rain':
                    this.switchView('rain');
                    break;

                case 'clean':
                    this.cleanCanvas();
                    break;

                case 'dedicatory':
                    if (this.dedicatory) {
                        this.dedicatory.open();
                        this.closeMenu();
                    } else {
                        console.error('DedicatoryManager no está disponible en UI_Manager');
                    }
                    break;

                case 'view_dedicatories':
                    if (this.dedicatory) {
                        this.dedicatory.openDedicatoriesView();
                        this.closeMenu();
                    }
                    break;
            }
        }
    }

    async cleanCanvas() {
        const confirmed = await CustomDialog.confirm(
            'Limpiar jardín',
            '¿Estás seguro de que quieres eliminar todas las flores?',
            'Sí, limpiar',
            'Cancelar'
        );

        if (confirmed) {
            this.flowers.clean();
            if (this.rain) this.rain.clearFloor();
            showNotification('Jardín limpiado', 'info');
        }
    }

    switchView(viewName) {
        Object.values(this.views).forEach(view => {
            if (view) view.classList.remove('active');
        });

        const targetView = this.views[viewName];
        if (targetView) {
            targetView.classList.add('active');
        }
    }

    toggleMenu() {
        const isOpen = this.menu.classList.toggle('open');
        
        // Actualizar estado
        this.isMenuOpen = isOpen;
        
        if (isOpen) {
            this.overlay?.classList.add('active');
            this.switchView('main');
            console.log('📂 Menú abierto');
        } else {
            this.closeAll();
        }
    }

    closeMenu() {
        this.menu?.classList.remove('open');
        this.isMenuOpen = false;
        
        const inboxOpen = document.querySelector('.inbox-container.open');
        const galleryOpen = document.querySelector('.gallery-modal.active');
        const dedicatoryOpen = document.querySelector('.dedicatory-modal.active');
        const dedicatoriesViewOpen = document.querySelector('.dedicatories-view-modal.active');
        
        if (!inboxOpen && !galleryOpen && !dedicatoryOpen && !dedicatoriesViewOpen) {
            this.overlay?.classList.remove('active');
        }
        
        console.log('📁 Menú cerrado');
    }

    closeAll() {
        this.closeMenu();
        this.switchView('main');
    }

    restoreState() {
        // Restaurar color
        const savedColor = storage.loadColorScheme();
        if (savedColor && savedColor !== 'default') {
            this.flowers.setColorScheme(savedColor);
            
            const colorBtn = this.views.colors?.querySelector(`[data-color="${savedColor}"]`);
            if (colorBtn) {
                this.views.colors.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
                colorBtn.classList.add('active');
            }
        }

        // Restaurar lluvia
        const savedRainState = storage.loadRainState();
        if (savedRainState.isActive) {
            this.rain.setModes(savedRainState.modes);
            this.rain.toggle();
            
            const activateBtn = this.views.rain?.querySelector('.btn-rain-activate');
            if (activateBtn) {
                activateBtn.classList.add('active');
                activateBtn.querySelector('.rain-status-text').textContent = 'Detener Lluvia';
                activateBtn.querySelector('.rain-status-icon').textContent = '⏸';
            }
        }
    }

    getMenuState() {
        return this.isMenuOpen;
    }
}