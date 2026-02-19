/**
 * navigation.js - Gestor de la barra de navegación inferior
 * Versión corregida con mejor manejo de estados
 */
export class NavigationManager {
    constructor(callback) {
        this.callback = callback;
        this.navItems = document.querySelectorAll('.nav-item');
        this.container = this.navItems[0]?.parentElement; // Contenedor de la barra
        this.currentActive = 'home'; // Estado inicial
        this.isExpanded = false; // Estado del menú
        
        if (!this.navItems.length) {
            console.warn('NavigationManager: No se encontraron elementos .nav-item');
            return;
        }
        
        this.init();
    }

    init() {
        // Configuración inicial: Colapsado
        if (this.container) {
            this.container.classList.add('nav-dynamic-container');
            this.container.classList.add('nav-collapsed');
        }

        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const action = item.dataset.action;
                
                if (!action) {
                    console.warn('NavigationManager: Item sin data-action');
                    return;
                }

                // Lógica del botón Toggle (+)
                if (action === 'add') {
                    this.toggleMenu(item);
                    return; // Detener aquí para no ejecutar la acción original de 'add'
                }
                
                // Manejo visual del estado 'active'
                this.setActive(action);

                // Ejecutar callback hacia App.js
                if (this.callback) {
                    this.callback(action);
                }
            });
        });

        // Establecer el estado inicial
        this.setActive('home');
    }

    toggleMenu(btn) {
        this.isExpanded = !this.isExpanded;
        
        if (this.container) {
            this.container.classList.toggle('nav-collapsed', !this.isExpanded);
            this.container.classList.toggle('nav-expanded', this.isExpanded);
        }

        // Cambiar icono (+ / -)
        const svg = btn.querySelector('svg');
        if (svg) {
            if (this.isExpanded) {
                // Icono Menos (-)
                svg.innerHTML = '<path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
            } else {
                // Icono Más (+)
                svg.innerHTML = '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
            }
        }

        this.pulseButton(btn);
    }

    /**
     * Efecto de pulsación para botones de acción
     */
    pulseButton(item) {
        item.classList.add('pulse');
        setTimeout(() => item.classList.remove('pulse'), 300);
    }

    /**
     * Cambia el estado activo externamente
     */
    setActive(action) {
        if (this.currentActive === action) return;
        
        this.currentActive = action;
        
        this.navItems.forEach(nav => {
            const navAction = nav.dataset.action;
            if (navAction === action) {
                nav.classList.add('active');
                // Añadir aria-current para accesibilidad
                nav.setAttribute('aria-current', 'page');
            } else {
                nav.classList.remove('active');
                nav.removeAttribute('aria-current');
            }
        });
    }

    /**
     * Obtiene el elemento activo actual
     */
    getActive() {
        return this.currentActive;
    }

    /**
     * Limpia todos los estados activos
     */
    clearActive() {
        this.navItems.forEach(nav => {
            nav.classList.remove('active');
            nav.removeAttribute('aria-current');
        });
        this.currentActive = null;
    }
}