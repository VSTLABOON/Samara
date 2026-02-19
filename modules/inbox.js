import { storage, STORAGE_KEYS } from './storage.js';
import { CustomDialog } from './utils.js';

/**
 * inbox.js - Sistema de mensajes con header mejorado
 * CORREGIDO: Overlay ahora solo cierra el inbox, no activa moños ni crea flores
 * OPTIMIZADO: Scroll interno del panel en desktop y móvil
 * ORDEN: Mensajes del sistema respetan el orden del código; Guía del Jardín aparece primero
 */
export class InboxManager {
    constructor() {
        this.container = document.querySelector('.inbox-container');
        this.blocksContainer = document.querySelector('.inbox-blocks');
        this.overlay = document.querySelector('.panel-overlay');
        this.messages = []; // Estado local
        
        if (!this.container || !this.blocksContainer) {
            console.warn('InboxManager: Elementos necesarios no encontrados');
            return;
        }
        
        // CORRECCIÓN: Buscar botón cerrar DENTRO del contenedor para evitar conflictos
        this.closeBtn = this.container.querySelector('.inbox-close');

        this.init();
    }

    init() {
        // Mejorar header visual con diseño coherente
        this.enhanceHeader();
        
        // Crear formulario de escritura
        this.createComposeForm();

        // Cargar mensajes guardados
        this.loadMessages();

        // Delegación de eventos para los mensajes
        this.blocksContainer.addEventListener('click', (e) => {
            // Ignorar clicks en elementos interactivos o si está editando
            if (e.target.closest('input, textarea, button')) return;
            
            const block = e.target.closest('.message-block');
            
            // Si está en modo edición, no colapsar/expandir
            if (block && block.classList.contains('editing')) return;

            if (block) {
                this.toggleMessage(block);
            }
        });

        // Botón cerrar con nueva X mejorada
        this.closeBtn?.addEventListener('click', () => this.close());
        
        // CORREGIDO: Overlay solo cierra el inbox cuando está abierto
        this.overlay?.addEventListener('click', (e) => {
            if (this.container.classList.contains('open') && e.target === this.overlay) {
                this.close();
            }
        });
    }

    /**
     * Mejora el header con diseño coherente
     */
    enhanceHeader() {
        const header = this.container.querySelector('.inbox-header');
        if (!header) return;

        // Aplicar estilos mejorados
        header.style.cssText = `
            background: linear-gradient(135deg, rgba(30, 30, 40, 0.8) 0%, rgba(20, 20, 30, 0.9) 100%);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 28px 24px;
            position: relative;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        // Mejorar la X de cerrar
        if (this.closeBtn) {
            this.closeBtn.style.cssText = `
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 10px;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                color: rgba(255, 255, 255, 0.7);
            `;

            // Hover effect
            this.closeBtn.addEventListener('mouseenter', () => {
                this.closeBtn.style.background = 'rgba(255, 80, 80, 0.2)';
                this.closeBtn.style.borderColor = 'rgba(255, 80, 80, 0.4)';
                this.closeBtn.style.transform = 'rotate(90deg) scale(1.1)';
                this.closeBtn.style.color = 'rgba(255, 100, 100, 1)';
            });

            this.closeBtn.addEventListener('mouseleave', () => {
                this.closeBtn.style.background = 'rgba(255, 255, 255, 0.08)';
                this.closeBtn.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                this.closeBtn.style.transform = 'rotate(0deg) scale(1)';
                this.closeBtn.style.color = 'rgba(255, 255, 255, 0.7)';
            });
        }

        // Botón de escribir nota
        const composeBtn = document.createElement('button');
        composeBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        `;
        composeBtn.title = "Escribir nota";
        composeBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            color: rgba(255, 255, 255, 0.7);
            margin-right: 8px;
        `;
        
        composeBtn.addEventListener('click', () => this.toggleCompose());
        
        // Insertar botón de forma segura
        if (this.closeBtn && this.closeBtn.parentNode === header) {
            header.insertBefore(composeBtn, this.closeBtn);
        } else if (header) {
            header.appendChild(composeBtn);
        }

        // Mejorar título
        const title = header.querySelector('h2');
        if (title) {
            title.style.cssText = `
                font-family: 'Crimson Pro', serif;
                font-size: 24px;
                font-weight: 500;
                margin: 0;
                color: rgba(255, 255, 255, 0.95);
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                flex: 1;
            `;
        }
    }

    createComposeForm() {
        const form = document.createElement('div');
        form.className = 'inbox-compose';
        form.innerHTML = `
            <input type="text" placeholder="Título de tu nota..." class="compose-title" maxlength="200">
            <div class="textarea-container" style="position: relative; width: 100%;">
                <textarea placeholder="Escribe algo para recordar..." class="compose-content" maxlength="5000" style="resize: none; overflow-y: auto; min-height: 80px; max-height: 40vh; width: 100%; padding-bottom: 24px;"></textarea>
                <span class="char-counter" style="position: absolute; right: 12px; bottom: 8px; font-size: 11px; color: rgba(255,255,255,0.3); pointer-events: none; font-family: 'Inter', sans-serif;">0 / 5000</span>
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn-cancel" style="padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: white; cursor: pointer;">Cancelar</button>
                <button class="btn-save" style="padding: 8px 16px; border-radius: 8px; border: none; background: #1de9b6; color: #000; font-weight: 600; cursor: pointer;">Guardar</button>
            </div>
        `;
        
        // Insertar después del header
        const header = this.container.querySelector('.inbox-header');
        if (header) {
            header.after(form);
        } else {
            this.container.insertBefore(form, this.blocksContainer);
        }
        
        // Eventos
        form.querySelector('.btn-cancel').addEventListener('click', () => {
            this.toggleCompose();
        });
        
        form.querySelector('.btn-save').addEventListener('click', () => {
            this.saveUserNote();
        });
        
        // Inicializar auto-resize
        const textarea = form.querySelector('.compose-content');
        const counter = form.querySelector('.char-counter');

        this.initTextareaResize(textarea);
        this.updateCharCounter(textarea, counter);
        textarea.addEventListener('input', () => this.updateCharCounter(textarea, counter));
        
        this.composeForm = form;
    }

    toggleCompose() {
        if (this.composeForm) {
            this.composeForm.classList.toggle('active');
            if (this.composeForm.classList.contains('active')) {
                this.composeForm.querySelector('input').focus();
            }
        }
    }

    saveUserNote() {
        const titleInput = this.composeForm.querySelector('.compose-title');
        const contentInput = this.composeForm.querySelector('.compose-content');
        
        if (titleInput.value.trim() && contentInput.value.trim()) {
            this.addMessage(titleInput.value, contentInput.value, true, 'user-note');
            titleInput.value = '';
            contentInput.value = '';
            this.toggleCompose();
        }
    }

    initTextareaResize(textarea) {
        const resize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        };
        textarea.addEventListener('input', resize);
        // Inicializar altura
        setTimeout(resize, 0);
    }

    updateCharCounter(textarea, counter) {
        const maxLength = parseInt(textarea.getAttribute('maxlength') || '5000', 10);
        const currentLength = textarea.value.length;
        counter.textContent = `${currentLength} / ${maxLength}`;
    }

    toggleMessage(block) {
        const isCurrentlyExpanded = block.classList.contains('expanded');
        
        // Si ya está expandido, colapsar
        if (isCurrentlyExpanded) {
            this.collapseMessage(block);
            return;
        }

        // Cerrar cualquier otro mensaje abierto para mantener el enfoque
        const otherExpanded = this.container.querySelectorAll('.message-block.expanded');
        otherExpanded.forEach(other => {
            if (other !== block) {
                this.collapseMessage(other);
            }
        });

        // Expandir el mensaje clickeado
        this.expandMessage(block);
    }

    /**
     * SCROLL OPTIMIZADO — desktop y móvil
     *
     * Problema anterior: scrollIntoView() opera sobre el viewport global,
     * ignorando que el inbox es un panel con scroll interno propio.
     * Resultado: la página entera se desplazaba, dejando el mensaje
     * cortado o fuera del panel visible.
     *
     * Solución:
     * — Encontrar el contenedor scrollable real (el panel, no el body).
     * — Calcular la posición del bloque relativa a ese contenedor.
     * — Centrarlo con scrollTo(), respetando los límites superior e inferior.
     * — Doble rAF para garantizar que el layout post-expansión esté calculado
     *   antes de medir posiciones (evita valores obsoletos de getBoundingClientRect).
     * — En móvil, se prefiere alinear al tope con un margen visual de 12px
     *   porque el espacio vertical es más limitado y centrar puede esconder
     *   el título del mensaje fuera de pantalla.
     */
    expandMessage(block) {
        block.classList.add('expanded');
        
        // Marcar como leído
        const id = block.dataset.id;
        if (id && block.classList.contains('unread')) {
            this.markAsRead(id);
            block.classList.remove('unread');
        }
        
        this.blocksContainer.classList.add('has-active-focus');

        // Doble rAF: el primero registra el frame donde se añadió 'expanded',
        // el segundo se ejecuta ya con el layout recalculado.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this._scrollToBlock(block);
            });
        });
    }

    /**
     * Desplaza el contenedor scrollable para centrar (desktop)
     * o alinear al tope con margen (móvil) el bloque expandido.
     */
    _scrollToBlock(block) {
        // Buscar el ancestro scrollable más cercano dentro del inbox.
        // Normalmente es this.container o this.blocksContainer, según el CSS.
        const scrollEl = this._findScrollParent(block);
        if (!scrollEl) return;

        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        const containerRect = scrollEl.getBoundingClientRect();
        const blockRect     = block.getBoundingClientRect();

        // Posición del bloque relativa al scroll actual del contenedor
        const blockOffsetTop = blockRect.top - containerRect.top + scrollEl.scrollTop;

        let targetScrollTop;

        if (isMobile) {
            // Móvil: alinear el bloque al tope del panel con un margen de 12px.
            // Así el título siempre es visible y el usuario hace scroll natural.
            const MOBILE_TOP_MARGIN = 12;
            targetScrollTop = blockOffsetTop - MOBILE_TOP_MARGIN;
        } else {
            // Desktop: centrar el bloque dentro del panel.
            const containerHeight = scrollEl.clientHeight;
            const blockHeight     = block.offsetHeight;
            targetScrollTop = blockOffsetTop - (containerHeight / 2) + (blockHeight / 2);
        }

        // Respetar límites del scroll
        const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
        targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));

        scrollEl.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
        });
    }

    /**
     * Recorre los ancestros del elemento buscando el primer contenedor
     * con scroll vertical real, limitado al inbox-container para no
     * escapar al body/window accidentalmente.
     */
    _findScrollParent(el) {
        let node = el.parentElement;

        while (node && node !== document.body) {
            const { overflowY } = window.getComputedStyle(node);
            const isScrollable   = overflowY === 'auto' || overflowY === 'scroll';
            const hasOverflow    = node.scrollHeight > node.clientHeight;

            if (isScrollable && hasOverflow) return node;

            // No salir del inbox-container
            if (node === this.container) break;
            node = node.parentElement;
        }

        // Fallback: usar el container directamente
        return this.container;
    }

    collapseMessage(block) {
        block.classList.remove('expanded');
        
        // Si no hay más mensajes expandidos, quitar el foco
        const anyExpanded = this.container.querySelector('.message-block.expanded');
        if (!anyExpanded) {
            this.blocksContainer.classList.remove('has-active-focus');
        }
    }

    toggle() {
        this.container.classList.contains('open') ? this.close() : this.open();
    }

    open() {
        this.container.classList.add('open');
        this.overlay?.classList.add('active');
    }

    close() {
        // Colapsar todos los mensajes al cerrar
        const expanded = this.container.querySelectorAll('.message-block.expanded');
        expanded.forEach(block => this.collapseMessage(block));
        
        this.container.classList.remove('open');
        
        // Solo quitar overlay si no hay otros paneles abiertos
        const menuOpen = document.querySelector('.unified-menu.open');
        const galleryOpen = document.querySelector('.gallery-modal.active');
        
        if (!menuOpen && !galleryOpen) {
            this.overlay?.classList.remove('active');
        }
    }

    /**
     * Añade un mensaje programáticamente
     */
    addMessage(title, content, isUnread = true, type = 'normal') {
        const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const message = { id, title, content, isUnread, type, date: new Date().toISOString() };
        
        this.messages.unshift(message);
        this.saveMessages();
        this.refreshMessages(); // Actualizar vista manteniendo orden
    }

    generateMessageHTML(message) {
        // Formatear fecha
        let dateStr;
        try {
            const dateObj = message.date ? new Date(message.date) : new Date();
            dateStr = dateObj.toLocaleString('es-ES', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            dateStr = '';
        }

        const isUserNote = message.type === 'user-note';
        const isSystem   = message.type === 'system';
        const isStarred  = message.isStarred || false;
        
        return `
            <div class="block-outer">
                <h3 class="block-title">
                    ${isStarred ? '<span class="star-indicator" style="color: #ffd700; margin-right: 6px;">★</span>' : ''}
                    ${message.title}
                </h3>
                <div class="block-meta">
                    <span class="message-time">${dateStr}</span>
                    <div class="block-indicator"></div>
                </div>
            </div>
            <div class="block-content">
                <div class="message-inner">
                    <p class="message-text">${message.content}</p>
                    <div class="message-footer">
                        ${!isSystem ? `
                        <button class="btn-icon-star ${isStarred ? 'active' : ''}" title="${isStarred ? 'Quitar destacado' : 'Destacar'}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isStarred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            <span>${isStarred ? 'Destacado' : 'Destacar'}</span>
                        </button>` : ''}
                        <button class="btn-icon-delete" title="Eliminar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Eliminar</span>
                        </button>
                        ${isUserNote ? `
                        <button class="btn-icon-edit" title="Editar nota">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>Editar</span>
                        </button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderMessage(message) {
        const block = document.createElement('article');
        block.className = `message-block ${message.isUnread ? 'unread' : ''} ${message.type || 'normal'} ${message.isStarred ? 'starred' : ''}`;
        block.dataset.id = message.id;
        
        block.innerHTML = this.generateMessageHTML(message);
        
        // Listener para editar
        const editBtn = block.querySelector('.btn-icon-edit');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startEditing(block, message);
            });
        }

        // Listener para eliminar
        const deleteBtn = block.querySelector('.btn-icon-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteMessage(message.id);
            });
        }

        // Listener para destacar
        const starBtn = block.querySelector('.btn-icon-star');
        if (starBtn) {
            starBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleStar(message.id);
            });
        }
        
        this.blocksContainer.insertBefore(block, this.blocksContainer.firstChild);
        
        // Actualizar badge si existe
        this.updateNotificationBadge();
    }

    toggleStar(id) {
        const msg = this.messages.find(m => m.id === id);
        if (msg) {
            msg.isStarred = !msg.isStarred;
            this.saveMessages();
            this.refreshMessages();
        }
    }

    startEditing(block, message) {
        block.classList.add('editing');
        block.classList.add('expanded'); // Asegurar que esté expandido
        
        block.innerHTML = `
            <div class="edit-form">
                <input type="text" class="edit-input-title" value="${message.title}" maxlength="200">
                <div class="textarea-container" style="position: relative; width: 100%;">
                    <textarea class="edit-input-content" maxlength="5000" style="resize: none; overflow-y: auto; min-height: 80px; max-height: 40vh; width: 100%; padding-bottom: 24px;">${message.content}</textarea>
                    <span class="char-counter" style="position: absolute; right: 12px; bottom: 8px; font-size: 11px; color: rgba(255,255,255,0.3); pointer-events: none; font-family: 'Inter', sans-serif;">0 / 5000</span>
                </div>
                <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
                    <button class="btn-cancel" style="padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: white; cursor: pointer;">Cancelar</button>
                    <button class="btn-save" style="padding: 8px 16px; border-radius: 8px; border: none; background: #1de9b6; color: #000; font-weight: 600; cursor: pointer;">Guardar Cambios</button>
                </div>
            </div>
        `;

        const textarea = block.querySelector('.edit-input-content');
        const counter = block.querySelector('.char-counter');

        this.initTextareaResize(textarea);
        this.updateCharCounter(textarea, counter);
        textarea.addEventListener('input', () => this.updateCharCounter(textarea, counter));

        // Listeners del formulario de edición
        block.querySelector('.btn-cancel').addEventListener('click', (e) => {
            e.stopPropagation();
            block.classList.remove('editing');
            block.innerHTML = this.generateMessageHTML(message);
            this.rebindBlockEvents(block, message);
        });

        block.querySelector('.btn-save').addEventListener('click', (e) => {
            e.stopPropagation();
            const newTitle = block.querySelector('.edit-input-title').value;
            const newContent = block.querySelector('.edit-input-content').value;
            
            if (newTitle && newContent) {
                message.title = newTitle;
                message.content = newContent;
                this.saveMessages();
                
                block.classList.remove('editing');
                block.innerHTML = this.generateMessageHTML(message);
                
                this.rebindBlockEvents(block, message);
            }
        });
    }

    rebindBlockEvents(block, message) {
        const editBtn = block.querySelector('.btn-icon-edit');
        if (editBtn) {
            editBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.startEditing(block, message);
            });
        }
        const deleteBtn = block.querySelector('.btn-icon-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.deleteMessage(message.id);
            });
        }
        const starBtn = block.querySelector('.btn-icon-star');
        if (starBtn) {
            starBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.toggleStar(message.id);
            });
        }
    }

    /**
     * Actualiza el badge de notificaciones
     */
    updateNotificationBadge() {
        const unreadCount = this.container.querySelectorAll('.message-block.unread').length;
        const badge = document.querySelector('.notification-badge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.classList.add('active');
            } else {
                badge.classList.remove('active');
            }
        }
    }

    /**
     * Limpia todos los mensajes
     */
    clearAll() {
        if (confirm('¿Eliminar todos los mensajes?')) {
            this.messages = [];
            this.saveMessages();
            this.blocksContainer.innerHTML = '';
            this.updateNotificationBadge();
        }
    }

    async deleteMessage(id) {
        const confirmed = await CustomDialog.confirm('¿Eliminar nota?', 'Esta acción no se puede deshacer.', 'Eliminar', 'Cancelar');
        
        if (confirmed) {
            this.messages = this.messages.filter(m => m.id !== id);
            this.saveMessages();
            
            const block = this.blocksContainer.querySelector(`.message-block[data-id="${id}"]`);
            if (block) {
                block.style.transition = 'all 0.3s ease';
                block.style.opacity = '0';
                block.style.transform = 'translateX(20px)';
                setTimeout(() => block.remove(), 300);
            }
            this.updateNotificationBadge();
        }
    }

    // --- PERSISTENCIA ---

    loadMessages() {
        try {
            const saved = storage.load(STORAGE_KEYS.INBOX, []);
            this.messages = Array.isArray(saved) ? saved : [];
        } catch (e) {
            console.warn('InboxManager: Error cargando mensajes, usando array vacío', e);
            this.messages = [];
        }
        
        try {
            this.ensureSystemMessages();
        } catch (e) {
            console.warn('InboxManager: Error en mensajes del sistema', e);
        }
        
        this.refreshMessages();
    }

    /**
     * ORDEN:
     * — Mensajes del sistema: ordenados por `order` (índice en el array del código).
     *   El índice 0 (Guía del Jardín) aparece primero visualmente.
     * — Notas de usuario: al final, por fecha descendente.
     * — Se renderiza en inverso porque renderMessage inserta al principio del DOM.
     */
    refreshMessages() {
        this.blocksContainer.classList.remove('has-active-focus');

        const systemMsgs = this.messages
            .filter(m => m.type === 'system')
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const userMsgs = this.messages
            .filter(m => m.type !== 'system')
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        this.blocksContainer.innerHTML = '';

        // Primero las notas de usuario (quedarán al final visualmente)
        [...userMsgs].reverse().forEach(msg => this.renderMessage(msg));
        // Luego los del sistema de atrás hacia adelante (el índice 0 quedará primero)
        [...systemMsgs].reverse().forEach(msg => this.renderMessage(msg));

        this.updateNotificationBadge();
    }

    ensureSystemMessages() {
        // ---------------------------------------------------------
        // 💌 ÁREA DE CARTAS Y MENSAJES DE AMOR
        // Agrega aquí tus mensajes dentro de los corchetes [ ... ]
        // Se mostrarán automáticamente si no están en el inbox.
        // ---------------------------------------------------------
        const systemMessages = [

            {
                title: "Guía del Jardín",
                content: "¡Bienvenida a tu espacio personal!\n\nToca la pantalla para plantar flores.\nUsa el menú para cambiar colores o habilitar una lluvia de imágenes que, en lo que a mí respecta, te representan.\nGuarda tus creaciones en la galería o dedica escenarios con una firma.\nEscribe tus propios pensamientos por medio de notas en 'Inbox'.\n\nDisfruta de la tranquilidad.",
                type: "system"
            },
            {
                title: "Corazones",
                content: "Los corazones se rompen cuando no son honestos. Esa frase me motivó a escribirte una vez más.\n\nNunca lo mencioné, pero siempre quise ser escritor. Cuando te conocí, encontré la forma de que mis ideas y sentimientos cobraran sentido. Y ese sentido eras tú: inmortalizarte.\n\nPor eso estoy aquí, escribiéndote aún sabiendo que tal vez no me quieras cerca. Aun así escribo, porque mi corazón necesita un respiro. Un último suspiro de honestidad.",
                type: 'system'
            },
            {
                title: "Enamorarse de ti",
                content: "1. Tu forma de ser.\n2. Tu gusto por las cosas bonitas.\n3. Tu disciplina y dedicación.\n4. Tu creatividad.\n5. Tu risa.\n6. Tu voz.\n7. Tu sentido del humor.\n8. Tu espontaneidad.\n9. Tu fortaleza.\n10. Tú.",
                type: 'system'
            },
            {
                title: "Tu forma de ser",
                content: "Tu forma de ser fue, definitivamente, lo primero que me intrigó de ti. Te mostrabas curiosa y juguetona, aunque también con un ferviente sentido de reserva respecto a tu persona, tus pensamientos y tu vida.\n\nFue entonces que te propuse no ser amigos. Pasaba el tiempo y me daba cuenta de que claramente no era sencillo llegar a tu corazón. Tal vez era miedo, o quizá simplemente no estabas cómoda conmigo; de cualquier forma, decidí quedarme más tiempo para seguir observándote y encontrar una llave, una respuesta.\n\nPoco a poco fui notando que eres divertida, carismática, amable, noble; una chica muy bonita, para ser sincero. Aunque también sabía que no estabas bien, y por eso lo que yo llamaba «nuestro» era una bomba de tiempo. Aun así, no planeaba irme, porque para mí el amor va más allá del miedo o los problemas.\n\nConforme avanzábamos, me dejabas entrar cada vez más. Comenzabas a contarme detalles pequeños, un poco de tu día e incluso vivencias que aún te pasaban factura. Lo que más disfrutaba era cuando me dejabas verte de verdad: tu peculiar forma de ser, tu risa chirriante, los chismes, tus inseguridades, las llamadas random.\n\nGenuinamente esperaba que todo siguiera así, porque vales cada uno de los altibajos que teníamos. Y que no haya confusión: no te estoy idealizando. Sé perfectamente cómo te comportabas conmigo; sin embargo, el orgullo o el prejuicio no suelen dominarme cuando alguien genuinamente me importa.\n\nAsí que sí. Tu forma de ser es, definitivamente, tu punto más fuerte y lo que más me gusta de ti. Esa complejidad que hay detrás jamás me causaría conflicto, porque sé perfectamente que yo tampoco soy perfecto.",
                type: 'system'
            },
            {
                title: "Cosas bonitas",
                content: "No es materialismo, es una forma de ordenar el caos.\n\nSiempre noté cómo te esfuerzas por encontrar estética donde otros solo ven rutina. Tu manera de vestirte, los detalles en tus fotos, esa necesidad tuya de que el entorno se vea bien aunque por dentro sintieras que todo se desmoronaba.\n\nMe gustaba ver cómo intentabas embellecer el mundo, tal vez para convencerte a ti misma de que no todo es gris. Tienes un ojo muy fino para la belleza, incluso cuando te costaba verla en ti misma.",
                type: 'system'
            },
            {
                title: "Disciplina y dedicación",
                content: "Sé que había días en los que no querías ni levantarte. Días donde la bomba de tiempo hacía tic-tac más fuerte que nunca. Y aun así, cumplías.\n\nEsa terquedad para no fallar en tus deberes, para mantenerte firme en tus metas incluso cuando te estabas fallando a ti misma emocionalmente, siempre me pareció admirable. Tu disciplina funcionaba como tu ancla. Y ver esa fuerza de voluntad fue una de las razones por las que decidí quedarme a observar.",
                type: 'system'
            },
            {
                title: "Creatividad",
                content: "Tu mente no sigue líneas rectas. Tienes atajos y puentes que nadie más entiende, y a veces era difícil seguirte el ritmo, pero me fascinaba cómo conectabas ideas, cómo resolvías problemas o simplemente cómo contabas historias.\n\nEsa chispa creativa es parte de lo que te hace tan magnética. Tienes un mundo interior muy vasto, y aunque a veces te encierras en él para protegerte, cuando lo dejas salir, es brillante.",
                type: 'system'
            },
            {
                title: "Tu risa",
                content: "Ya lo dije: es chirriante. Y no la cambiaría por nada.\n\nEs una risa que no pide permiso, que rompe el silencio y la tensión sin avisar. Era mi sonido favorito porque, cuando te reías de verdad a carcajadas, sin postura, sabía que por unos segundos se te olvidaba el miedo. Se te olvidaba que se suponía que no debíamos ser nada.\n\nEsa risa era la prueba más honesta de que, en el fondo, disfrutabas estar conmigo.",
                type: 'system'
            },
            {
                title: "Tu voz",
                content: "A veces dulce y aniñada, a veces firme y cortante cuando te ponías a la defensiva.\n\nPero sobre todo, extraño la voz de las llamadas random: esa voz tranquila, de madrugada, sin pretensiones. Podía pasar horas escuchándote hablar de cualquier trivialidad, porque en esos momentos tu voz sonaba a hogar, aunque tú insistieras en mantener las distancias.",
                type: 'system'
            },
            {
                title: "Humor",
                content: "Un poco ácido, lleno de chismes y a veces incomprensible para los demás. Pero para mí tenía sentido, porque lo construimos juntos: bromas que entendíamos, referencias que no necesitaban explicación, sarcasmo que en otra boca hubiera sonado a ofensa y en la tuya sonaba a confianza.\n\nQue pudieras ser tan divertida decía mucho de ti: inteligencia rápida, atención al detalle, y una forma de ver el mundo que me hacía querer seguir mirándolo contigo.",
                type: 'system'
            },
            {
                title: "Espontaneidad",
                content: "Nunca hubo un guion. Un día eras un muro de hielo y al siguiente me buscabas para contarme algo completamente random.\n\nEsa volatilidad, que para otros sería un defecto insoportable, para mí le daba vida a todo. Me mantenías alerta. Nunca sabía qué esperar, y paradójicamente, esa incertidumbre se volvió una constante que aprendí a querer. Tus cambios de ritmo hacían que cada momento bueno se sintiera como una pequeña victoria.",
                type: 'system'
            },
            {
                title: "Fortaleza",
                content: "Mucha gente se fija en tu fortaleza. Incluso tú misma. Pero yo vi tu fragilidad.\n\nRomperse y volver a armarse todos los días requiere un valor inmenso. Seguir caminando con todo ese peso, con las dudas y los miedos a cuestas, no es debilidad: es supervivencia. Eres fuerte no porque no caigas, sino por todas las veces que te vi recomponerte, secarte las lágrimas y seguir.",
                type: 'system'
            },
            {
                title: "Tú",
                content: "Al final, no son las partes sueltas.\n\nEres tú. La suma de todo y toda esa luz. Eres tus huidas, tus silencios, tu cariño intermitente y tu nobleza. Eres esa chica bonita que tiene miedo de que la quieran, pero que merece ser querida más que nadie.\n\nEscribí todo esto no para convencerte de volver, sino para dejar constancia de que alguien te vio y decidió que valías la pena.\n\nGracias por dejarme ser parte de tu historia, aunque fuera solo un capítulo.",
                type: 'system'
            },
            {
                title: "Insomnio",
                content: "Bonita, te dedico cada noche sin dormir.\n\nEn la que pienso en ti y en lo cálidos que pueden ser tus abrazos.",
                type: 'system'
            },
            // ¡Puedes agregar más mensajes aquí copiando el formato anterior!
        ];
        // ---------------------------------------------------------

        // 1. Separar mensajes de usuario (preservar siempre)
        const userMessages = this.messages.filter(m => m.type !== 'system');
        
        // 2. Obtener mensajes de sistema existentes para preservar estado (leído/destacado)
        const existingSystemMsgs = this.messages.filter(m => m.type === 'system');
        
        // 3. Sincronizar: Construir lista basada en código (Source of Truth)
        // El campo `order` preserva el índice del array como posición visual.
        // `isStarred: true` marca todos los mensajes del sistema automáticamente.
        const activeSystemMessages = systemMessages.map((def, index) => {
            const existing = existingSystemMsgs.find(m => m.title === def.title);
            
            if (existing) {
                return {
                    ...existing,
                    content: def.content,
                    type: 'system',
                    order: index,
                    isStarred: true
                };
            } else {
                return {
                    id: `msg_sys_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
                    title: def.title,
                    content: def.content,
                    isUnread: true,
                    type: 'system',
                    order: index,
                    isStarred: true,
                    date: new Date().toISOString()
                };
            }
        });

        // 4. Reemplazar lista completa
        this.messages = [...activeSystemMessages, ...userMessages];

        // 5. Guardar cambios
        try {
            this.saveMessages();
        } catch (e) {
            console.warn('InboxManager: Error sincronizando mensajes del sistema', e);
        }
    }

    saveMessages() {
        storage.saveInbox(this.messages);
    }

    markAsRead(id) {
        const msg = this.messages.find(m => m.id === id);
        if (msg) {
            msg.isUnread = false;
            this.saveMessages();
            this.updateNotificationBadge();
        }
    }
}