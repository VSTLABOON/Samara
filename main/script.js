import { FlowerCanvas } from '../modules/flowers.js';
import { InboxManager } from '../modules/inbox.js';
import { NavigationManager } from '../modules/navigation.js';
import { UI_Manager } from '../modules/ui.js';
import { RainManager } from '../modules/rain.js';
import { GalleryManager } from '../modules/gallery.js';
import { DedicatoryManager } from '../modules/dedicatory.js';
import { CritterManager } from '../modules/critters.js';
import { storage } from '../modules/storage.js';
import { CustomDialog } from '../modules/utils.js';

/**
 * App.js - VERSIÓN FINAL CON TODAS LAS CORRECCIONES
 * 
 * CORRECCIONES APLICADAS:
 * 1. Ghost touch eliminado completamente
 * 2. Moños con debugging exhaustivo
 * 3. Sistema completo de dedicatorias
 * 4. Inicialización controlada
 */

class App {
    constructor() {
        this.state = {
            isInteractive: false,
            initialized: false
        };
        
        // Verificar que no se inicialice dos veces
        if (window.app) {
            console.warn('⚠️ App ya existe, abortando segunda inicialización');
            return window.app;
        }
        
        // Exponer globalmente
        window.app = this;
        
        this.init();
    }

    async init() {
        if (this.state.initialized) {
            console.warn('⚠️ App ya inicializada, abortando');
            return;
        }
        
        console.log('%c✨ Iniciando Sistema Floral', 'color: #4ade80; font-size: 18px; font-weight: bold;');

        try {
            // 1. CANVAS DE FLORES (CORE)
            console.log('1️⃣ Inicializando canvas de flores...');
            this.flowers = new FlowerCanvas('#canvas');
            console.log('   ✅ Canvas listo');

            // 2. SISTEMA DE LLUVIA
            console.log('2️⃣ Inicializando lluvia...');
            this.rain = new RainManager();
            console.log('   ✅ Lluvia lista');

            // 3. CRITTERS (Abejas/Luciérnagas) - Inicializar ANTES de Galería/Dedicatoria
            console.log('3️⃣ Inicializando Critters...');
            this.critters = new CritterManager(this.flowers);
            console.log('   ✅ Critters listos');

            // 4. GALERÍA (Ahora recibe critters)
            console.log('3️⃣ Inicializando galería...');
            this.gallery = new GalleryManager(this.flowers, this.rain, this.critters);
            console.log('   ✅ Galería lista');

            // 5. INBOX
            console.log('4️⃣ Inicializando inbox...');
            this.inbox = new InboxManager();
            console.log('   ✅ Inbox listo');

            // 6. DEDICATORIAS (Ahora recibe critters)
            console.log('5️⃣ Inicializando dedicatorias...');
            this.dedicatory = new DedicatoryManager(this.flowers, this.rain, this.critters);
            console.log('   ✅ Dedicatorias listas');

            // 7. UI MANAGER
            console.log('7️⃣ Inicializando UI...');
            this.ui = new UI_Manager(this.flowers, this.rain, this.gallery, this.dedicatory);
            console.log('   ✅ UI lista');

            // 8. NAVEGACIÓN
            console.log('8️⃣ Inicializando navegación...');
            this.nav = new NavigationManager((action) => this.handleNavigation(action));
            console.log('   ✅ Navegación lista');

            // 9. MODALES
            console.log('9️⃣ Configurando modales...');
            this.initModals();
            console.log('   ✅ Modales configurados');

            // Marcar como inicializado
            this.state.initialized = true;

            // Animación de bienvenida
            this.welcomeSequence();

            // Verificar primera visita
            this.checkFirstVisit();

            console.log('%c🎉 Sistema Floral Completamente Cargado', 'color: #60a5fa; font-size: 16px; font-weight: bold;');
            console.log('%cComandos de debug:', 'color: #fbbf24; font-size: 14px;');
            console.log('%c  window.app.debug()         - Info general', 'color: #a3a3a3;');

        } catch (error) {
            console.error('❌ Error durante la inicialización:', error);
            console.error(error.stack);
            this.showErrorMessage('Error al iniciar la aplicación. Por favor, recarga la página.');
        }
    }

    initModals() {
        // Los listeners del modal de dedicatoria ahora son manejados exclusivamente
        // por DedicatoryManager para evitar duplicidad y conflictos.
        // Agregar botón para ver dedicatorias en el menú Tools
        this.addViewDedicatoriesButton();
    }

    addViewDedicatoriesButton() {
        const menu = document.querySelector('.unified-menu');
        if (!menu) return;
        
        const toolsGrid = menu.querySelector('.tools-grid');
        if (!toolsGrid) return;
        
        // Verificar si ya existe
        if (document.getElementById('view-dedicatories-btn')) return;
        
        // Crear botón
        const viewButton = document.createElement('div');
        viewButton.id = 'view-dedicatories-btn';
        viewButton.className = 'tool-item';
        viewButton.dataset.action = 'view_dedicatories';
        viewButton.innerHTML = `
            <div class="tool-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
            </div>
            <span>Ver Dedicatorias</span>
        `;
        
        // Insertar después del botón "Dedicar"
        const dedicateBtn = toolsGrid.querySelector('[data-action="dedicatory"]');
        if (dedicateBtn?.parentNode) {
            dedicateBtn.parentNode.insertBefore(viewButton, dedicateBtn.nextSibling);
        } else {
            toolsGrid.appendChild(viewButton);
        }
        
        console.log('   ✅ Botón "Ver Dedicatorias" añadido al menú');
    }

    handleNavigation(action) {
        console.log(`🧭 Navegación: ${action}`);
        
        switch(action) {
            case 'home':
                this.ui.closeAll();
                if (this.inbox) this.inbox.close();
                if (this.gallery) this.gallery.close();
                if (this.dedicatory) this.dedicatory.closeDedicatoriesView();
                this.nav.setActive('home');
                break;

            case 'inbox':
                this.ui.closeAll();
                if (this.gallery) this.gallery.close();
                if (this.dedicatory) this.dedicatory.closeDedicatoriesView();
                if (this.inbox) this.inbox.toggle();
                break;

            case 'tools':
                if (this.inbox) this.inbox.close();
                if (this.gallery) this.gallery.close();
                if (this.dedicatory) this.dedicatory.closeDedicatoriesView();
                this.ui.toggleMenu();
                break;

            case 'gallery':
                this.ui.closeAll();
                if (this.inbox) this.inbox.close();
                if (this.dedicatory) this.dedicatory.closeDedicatoriesView();
                if (this.gallery) this.gallery.open();
                break;

            case 'add':
                // Generar flor en el centro con offset aleatorio
                const offset = 60;
                const cx = window.innerWidth / 2 + (Math.random() * offset * 2 - offset);
                const cy = window.innerHeight / 2 + (Math.random() * offset * 2 - offset);
                
                console.log(`➕ Añadiendo flor en: ${cx}, ${cy}`);
                this.flowers.addFlower(cx, cy);
                break;

            default:
                console.warn(`⚠️ Acción de navegación no reconocida: ${action}`);
        }
    }

    welcomeSequence() {
        setTimeout(() => {
            document.body.classList.add('app-ready');
            
            // Flor de bienvenida
            // (Desactivada por solicitud del usuario)
            
            console.log('✨ Aplicación lista');
        }, 800);
    }

    async checkFirstVisit() {
        const settings = storage.loadSettings();
        
        if (!settings.lastVisit) {
            // Primera vez: Mostrar tutorial/bienvenida
            await CustomDialog.alert(
                '¡Bienvenida! Para mayor contexto dirigete hacia la sección Inbox',
                'Comenzar'
            );
        }
        
        storage.updateLastVisit();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `simple-notification ${type}`;
        notification.textContent = message;
        
        const colors = {
            success: 'rgba(34, 197, 94, 0.9)',
            error: 'rgba(239, 68, 68, 0.9)',
            info: 'rgba(59, 130, 246, 0.9)',
            warning: 'rgba(251, 191, 36, 0.9)'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type] || colors.info};
            color: white;
            padding: 14px 28px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        `;

        document.body.appendChild(notification);

        setTimeout(() => notification.style.opacity = '1', 10);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(239, 68, 68, 0.95);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: white;
            padding: 24px 32px;
            border-radius: 16px;
            font-size: 16px;
            z-index: 10000;
            max-width: 400px;
            text-align: center;
            pointer-events: none;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
    }
    
    /**
     * DEBUGGING EXHAUSTIVO
     */
    debug() {
        console.group('🐛 App Debug Info');
        console.log('✅ Estado:');
        console.log('   - Initialized:', this.state.initialized);
        console.log('   - Interactive:', this.state.isInteractive);
        console.log('');
        console.log('✅ Módulos:');
        console.log('   - Flowers:', !!this.flowers);
        console.log('   - Rain:', !!this.rain);
        console.log('   - Gallery:', !!this.gallery);
        console.log('   - Inbox:', !!this.inbox);
        console.log('   - Dedicatory:', !!this.dedicatory);
        console.log('   - UI:', !!this.ui);
        console.log('   - Nav:', !!this.nav);
        console.log('');
        console.log('✅ Integración:');
        console.log('   - Listeners installed:', this.flowers?._listenersInstalled);
        console.groupEnd();
    }
}

// Inicialización controlada
let appInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    if (appInstance) {
        console.warn('⚠️ App ya inicializada previamente, abortando');
        return;
    }
    
    appInstance = new App();
});

// Hot reload support (desarrollo)
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        if (appInstance && appInstance.flowers) {
            appInstance.flowers.dispose();
        }
        appInstance = null;
    });
}