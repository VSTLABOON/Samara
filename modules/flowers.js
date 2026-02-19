import * as THREE from 'https://cdn.skypack.dev/three@0.133.1/build/three.module';
import { storage } from './storage.js';

/**
 * SHADERS POR DEFECTO (FALLBACK)
 * Para evitar que la app se rompa si faltan los scripts en el HTML
 */
const DEFAULT_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DEFAULT_FRAGMENT_SHADER = `
uniform float u_ratio;
uniform vec2 u_cursor;
uniform float u_stop_time;
uniform vec2 u_stop_randomizer;
uniform sampler2D u_texture;
uniform vec3 u_flower_color;
uniform vec3 u_stem_color;
uniform float u_clean;

varying vec2 vUv;

void main() {
    vec2 uv = vUv;
    vec2 p = uv;
    p.x *= u_ratio;
    vec2 c = u_cursor;
    c.x *= u_ratio;
    
    vec4 color = texture2D(u_texture, uv);
    
    // Lógica básica de flor (círculo simple como fallback)
    float d = distance(p, c);
    float mask = 1.0 - smoothstep(0.0, 0.05, d);
    
    vec3 finalColor = mix(color.rgb, u_flower_color, mask);
    
    if (u_clean == 0.0) {
        gl_FragColor = vec4(0.0);
    } else {
        gl_FragColor = vec4(finalColor, 1.0);
    }
}
`;

const DISPLAY_FRAGMENT_SHADER = `
uniform sampler2D u_texture;
uniform float u_time;
varying vec2 vUv;

void main() {
    vec2 uv = vUv;
    // Efecto de viento suave (Sway)
    float wind = sin(uv.y * 5.0 + u_time * 1.5) * 0.003 * uv.y;
    gl_FragColor = texture2D(u_texture, uv + vec2(wind, 0.0));
}
`;

/**
 * FlowerCanvas - VERSIÓN CORREGIDA
 */

export class FlowerCanvas {
    constructor(canvasSelector) {
        console.log('🌸 Iniciando FlowerCanvas...');
        
        this.canvas = document.querySelector(canvasSelector);
        if (!this.canvas) {
            console.error(`❌ Canvas no encontrado: ${canvasSelector}`);
            throw new Error(`Canvas no encontrado: ${canvasSelector}`);
        }

        this.pointer = { x: 0.66, y: 0.3, clicked: false, vanishCanvas: false };
        this.config = { maxPixelRatio: 2, antialias: false };
        this.isTouchScreen = false;
        this.isAnimating = false;
        this.currentColorScheme = 'default';
        this.flowerQueue = []; // Cola para restaurar flores
        this.savedFlowers = []; // Datos persistentes
        
        this._listenersInstalled = false;

        this.init();
    }

    init() {
        // Definir paleta accesible globalmente PRIMERO para evitar errores
        this.schemes = {
            default: { f: [1.0, 0.9, 0.95], s: [0.05, 0.15, 0.05] }, // Blanco cálido
            red:     { f: [1.0, 0.1, 0.2],  s: [0.05, 0.15, 0.05] }, // Rojo vibrante
            wine:    { f: [0.6, 0.0, 0.2],  s: [0.05, 0.15, 0.05] }, // Vino profundo
            pink:    { f: [1.0, 0.4, 0.7],  s: [0.05, 0.15, 0.05] }, // Rosa chicle
            blue:    { f: [0.2, 0.5, 1.0],  s: [0.05, 0.15, 0.08] }, // Azul cielo
            purple:  { f: [0.6, 0.2, 1.0],  s: [0.05, 0.15, 0.08] }, // Violeta eléctrico
            yellow:  { f: [1.0, 0.9, 0.1],  s: [0.05, 0.15, 0.05] }, // Amarillo puro (Tallo verde corregido)
            white:   { f: [1.0, 1.0, 1.0],  s: [0.05, 0.15, 0.05] }  // Blanco puro
        };

        this.setupRenderer();
        this.setupScenes();
        this.setupCamera();
        this.setupRenderTargets();
        this.createPlane();
        this.updateSize();
        
        // CRÍTICO: Setup de eventos AL FINAL
        this.setupEvents();
        
        this.startRenderLoop();
        this.setColorScheme('default');

        // Restaurar jardín previo
        this.restoreGarden();
        
        console.log('✅ FlowerCanvas: Completamente inicializado');
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: this.config.antialias,
            preserveDrawingBuffer: true 
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.config.maxPixelRatio));
        this.renderer.setClearColor(0x000000, 0);
    }

    setupScenes() {
        this.sceneShader = new THREE.Scene();
        this.sceneBasic = new THREE.Scene();
        this.clock = new THREE.Clock();
    }

    setupCamera() {
        const farPlane = 10; // Reducido a valor estándar ya que no hay objetos lejanos
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, farPlane);
    }

    setupRenderTargets() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const params = { 
            minFilter: THREE.LinearFilter, 
            magFilter: THREE.LinearFilter, 
            format: THREE.RGBAFormat 
        };
        this.renderTargets = [
            new THREE.WebGLRenderTarget(width, height, params),
            new THREE.WebGLRenderTarget(width, height, params)
        ];
    }

    createPlane() {
        // CORRECCIÓN: Usar fallbacks si no existen los elementos en el DOM
        const vsEl = document.getElementById('vertexShader');
        const fsEl = document.getElementById('fragmentShader');
        
        const vertexShader = (vsEl && vsEl.textContent.trim()) ? vsEl.textContent : DEFAULT_VERTEX_SHADER;
        const fragmentShader = (fsEl && fsEl.textContent.trim()) ? fsEl.textContent : DEFAULT_FRAGMENT_SHADER;
        
        if (!vsEl || !fsEl || !vsEl.textContent.trim() || !fsEl.textContent.trim()) {
            console.warn('⚠️ Shaders no encontrados o vacíos. Usando shaders por defecto.');
        }
        
        this.shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_stop_time: { value: 0 },
                u_stop_randomizer: { value: new THREE.Vector2(Math.random(), Math.random()) },
                u_cursor: { value: new THREE.Vector2(this.pointer.x, this.pointer.y) },
                u_ratio: { value: window.innerWidth / window.innerHeight },
                u_texture: { value: null },
                u_clean: { value: 1 },
                u_flower_color: { value: new THREE.Vector3(1, 1, 1) },
                u_stem_color: { value: new THREE.Vector3(0.5, 0.8, 0.5) },
                u_stem_thickness: { value: 1.0 },
                u_size_scale: { value: 1.0 } // Nuevo uniform para escala
            },
            vertexShader,
            fragmentShader,
            transparent: true
        });

        // Usar ShaderMaterial para efecto de viento en el display
        this.basicMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_texture: { value: null },
                u_time: { value: 0 }
            },
            vertexShader: DEFAULT_VERTEX_SHADER,
            fragmentShader: DISPLAY_FRAGMENT_SHADER,
            transparent: true
        });

        const geometry = new THREE.PlaneGeometry(2, 2);
        this.sceneBasic.add(new THREE.Mesh(geometry, this.basicMaterial));
        this.sceneShader.add(new THREE.Mesh(geometry, this.shaderMaterial));
    }

    updateUniform(name, value) {
        if (this.shaderMaterial && this.shaderMaterial.uniforms[name]) {
            this.shaderMaterial.uniforms[name].value = value;
        }
    }

    setColorScheme(scheme) {
        this.currentColorScheme = scheme;
        
        if (scheme === 'random') {
            // ✅ Aplicar un color aleatorio inicial inmediatamente
            const keys = Object.keys(this.schemes).filter(k => k !== 'default');
            const randomScheme = keys[Math.floor(Math.random() * keys.length)] || 'red';
            this._applyUniformsForScheme(randomScheme);
        } else {
            this._applyUniformsForScheme(scheme);
        }
    }

    _applyUniformsForScheme(schemeName) {
        const colors = this.schemes[schemeName] || this.schemes.default;
        this.updateUniform('u_flower_color', new THREE.Vector3(...colors.f));
        this.updateUniform('u_stem_color', new THREE.Vector3(...colors.s));
    }

    setupEvents() {
        if (this._listenersInstalled) {
            console.warn('⚠️ Listeners ya instalados');
            return;
        }
        
        console.log('🎯 Instalando event listeners...');
        
        // Handler para mouse y touch - CORREGIDO
        const handlePointerDown = (e) => {
            try {
                let x, y;
                
                if (e.type === 'touchstart') {
                    if (!e.touches || !e.touches[0]) {
                        console.warn('⚠️ Evento touch sin coordenadas');
                        return;
                    }
                    x = e.touches[0].clientX;
                    y = e.touches[0].clientY;
                    this.isTouchScreen = true;
                } else {
                    x = e.clientX;
                    y = e.clientY;
                }
                
                // CORRECCIÓN: Validación estricta de coordenadas
                if (x === undefined || y === undefined || 
                    x === null || y === null || 
                    typeof x !== 'number' || typeof y !== 'number' ||
                    isNaN(x) || isNaN(y)) {
                    console.warn('⚠️ Coordenadas inválidas:', x, y);
                    return;
                }
                
                console.log('👆 Click detectado en:', x, y);
                
                // Verificar límites del canvas
                const rect = this.canvas.getBoundingClientRect();
                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                    console.log('⚠️ Click fuera del canvas bounds');
                    return;
                }
                
                // Verificar modales
                if (this.hasOpenModals()) {
                    console.log('⚠️ Modal abierto, bloqueando click');
                    return;
                }
                
                console.log('✅ Click válido, creando flor...');
                this.addFlower(x, y);
                
            } catch (error) {
                console.error('❌ Error en handlePointerDown:', error);
            }
        };
        
        // IMPORTANTE: capture:true para capturar antes
        this.canvas.addEventListener('mousedown', handlePointerDown, { 
            capture: true, 
            passive: false 
        });
        
        this.canvas.addEventListener('touchstart', handlePointerDown, { 
            capture: true, 
            passive: false 
        });
        
        // Prevenir menú contextual
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        }, { capture: true });
        
        // Resize
        this._resizeHandler = () => this.updateSize();
        window.addEventListener('resize', this._resizeHandler);
        
        this._listenersInstalled = true;
        
        console.log('✅ Event listeners instalados correctamente');
    }

    hasOpenModals() {
        const selectors = [
            '.inbox-container.open',
            '.unified-menu.open',
            '.gallery-modal.active',
            '.dedicatory-modal.active',
            '.dedicatories-view-modal.active',
            '.custom-dialog-overlay.active'
        ];
        
        // CORRECCIÓN: Verificar visibilidad real
        return selectors.some(sel => {
            const el = document.querySelector(sel);
            if (!el) return false;
            
            // Verificar que esté realmente visible
            const styles = window.getComputedStyle(el);
            const isVisible = styles.display !== 'none' && 
                             styles.visibility !== 'hidden' && 
                             parseFloat(styles.opacity) > 0;
            
            if (isVisible) {
                console.log(`⚠️ Modal visible detectado: ${sel}`);
            }
            
            return isVisible;
        });
    }

    addFlower(x, y) {
        try {
            // CORRECCIÓN: Validación robusta de coordenadas
            if (x === undefined || y === undefined || 
                x === null || y === null || 
                typeof x !== 'number' || typeof y !== 'number' ||
                isNaN(x) || isNaN(y)) {
                console.error('❌ addFlower: coordenadas inválidas:', x, y);
                return;
            }
            
            // Normalizar a [0, 1]
            this.pointer.x = x / window.innerWidth;
            this.pointer.y = y / window.innerHeight;
            this.pointer.clicked = true;

            // LÓGICA ALEATORIA:
            // Si el modo es 'random', elegimos un color al azar AHORA y lo aplicamos
            let colorToUse = this.currentColorScheme;
            
            if (this.currentColorScheme === 'random') {
                const keys = Object.keys(this.schemes).filter(k => k !== 'default');
                colorToUse = keys[Math.floor(Math.random() * keys.length)] || 'red';
            }

            // Aplicar los uniformes para ESTA flor específica
            this._applyUniformsForScheme(colorToUse);

            // OPTIMIZACIÓN DE PERSISTENCIA:
            // Redondeamos coordenadas a 4 decimales para ahorrar espacio en localStorage
            const flowerData = {
                x: parseFloat(this.pointer.x.toFixed(4)),
                y: parseFloat(this.pointer.y.toFixed(4)),
                color: colorToUse // Guardamos el color real usado (ej: 'red'), no 'random'
            };
            this.savedFlowers.push(flowerData);
            this.saveToStorage();
            
            console.log('🌸 Flor creada en:', x, y, 
                        '→ normalizada:', this.pointer.x.toFixed(3), this.pointer.y.toFixed(3));
            
        } catch (error) {
            console.error('❌ Error en addFlower:', error);
        }
    }

    saveToStorage() {
        // Debounce simple para no saturar storage
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => {
            storage.saveGardenState(this.savedFlowers);
        }, 1000);
    }

    restoreGarden() {
        const saved = storage.loadGardenState();
        if (saved && saved.length > 0) {
            console.log(`♻️ Restaurando ${saved.length} flores...`);
            this.savedFlowers = saved;
            // Clonar array a la cola de procesamiento
            this.flowerQueue = [...saved];
        }
    }

    clean() {
        this.pointer.vanishCanvas = true;
        setTimeout(() => { this.pointer.vanishCanvas = false; }, 50);
        
        // Limpiar persistencia
        this.savedFlowers = [];
        storage.saveGardenState([]);
        console.log('🧹 Canvas limpiado');
    }

    updateSize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.renderer.setSize(w, h);
        this.renderTargets[0].setSize(w, h);
        this.renderTargets[1].setSize(w, h);
        this.updateUniform('u_ratio', w / h);

        // Lógica responsiva: Reducir tamaño en pantallas pequeñas para evitar saturación
        let scale = 1.0;
        if (w < 600) scale = 0.5;       // Móvil: 50% del tamaño
        else if (w < 1024) scale = 0.75; // Tablet: 75% del tamaño
        
        this.updateUniform('u_size_scale', scale);
    }

    startRenderLoop() {
        this.isAnimating = true;
        this.render();
    }

    render() {
        if (!this.isAnimating) return;

        const deltaTime = this.clock.getDelta();

        this.updateUniform('u_clean', this.pointer.vanishCanvas ? 0 : 1);
        this.updateUniform('u_texture', this.renderTargets[0].texture);

        // PROCESAR COLA DE RESTAURACIÓN (Si no hay click manual activo)
        if (!this.pointer.clicked && this.flowerQueue.length > 0) {
            const nextFlower = this.flowerQueue.shift();
            
            // Restaurar color si es diferente
            if (nextFlower.color && nextFlower.color !== this.currentColorScheme) {
                this._applyUniformsForScheme(nextFlower.color);
            }
            
            this.pointer.x = nextFlower.x;
            this.pointer.y = nextFlower.y;
            this.pointer.clicked = true;
            this.pointer.isRestoring = true; // Marcar como restauración
        }

        if (this.pointer.clicked) {
            this.updateUniform('u_cursor', new THREE.Vector2(this.pointer.x, 1 - this.pointer.y));
            this.updateUniform('u_stop_randomizer', new THREE.Vector2(Math.random(), Math.random()));
            
            // FIX: Si estamos restaurando, forzar crecimiento completo inmediato
            if (this.pointer.isRestoring) {
                this.updateUniform('u_stop_time', 10.0); // Flor adulta instantánea
                this.pointer.isRestoring = false;
            } else {
                this.updateUniform('u_stop_time', 0); // Flor nueva (animación normal)
            }
            
            this.pointer.clicked = false;
        }

        this.updateUniform('u_stop_time', this.shaderMaterial.uniforms.u_stop_time.value + deltaTime);

        this.renderer.setRenderTarget(this.renderTargets[1]);
        this.renderer.render(this.sceneShader, this.camera);
        
        this.basicMaterial.uniforms.u_texture.value = this.renderTargets[1].texture;
        this.basicMaterial.uniforms.u_time.value += deltaTime;
        
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.sceneBasic, this.camera);

        let tmp = this.renderTargets[0];
        this.renderTargets[0] = this.renderTargets[1];
        this.renderTargets[1] = tmp;

        requestAnimationFrame(() => this.render());
    }

    getDataURL() {
        return this.canvas.toDataURL('image/png');
    }

    /**
     * DEBUG: Sistema de clicks
     */
    debugClickSystem() {
        console.group('🔍 Sistema de Clicks - Debug');
        
        const canvas = this.canvas;
        if (!canvas) {
            console.error('❌ Canvas no existe');
            console.groupEnd();
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const styles = window.getComputedStyle(canvas);
        const containerStyles = window.getComputedStyle(canvas.parentElement);
        
        console.log('Canvas:', {
            id: canvas.id,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            pointerEvents: styles.pointerEvents,
            cursor: styles.cursor,
            zIndex: styles.zIndex
        });
        
        console.log('Container:', {
            pointerEvents: containerStyles.pointerEvents,
            zIndex: containerStyles.zIndex
        });
        
        console.log('Listeners:', {
            instalados: this._listenersInstalled
        });
        
        console.log('Modales abiertos:', this.hasOpenModals());
        
        console.log('Estado:', {
            isAnimating: this.isAnimating,
            currentColorScheme: this.currentColorScheme
        });
        
        console.groupEnd();
        
        // Test visual
        canvas.style.border = '2px solid lime';
        console.log('✅ Borde verde activado en canvas (3 segundos)');
        
        setTimeout(() => {
            canvas.style.border = '';
            console.log('✅ Borde removido');
        }, 3000);
    }

    dispose() {
        this.isAnimating = false;
        
        if (this._listenersInstalled) {
            window.removeEventListener('resize', this._resizeHandler);
            this._listenersInstalled = false;
        }
        
        this.renderTargets.forEach(rt => rt.dispose());
        this.shaderMaterial.dispose();
        this.basicMaterial.dispose();
        this.renderer.dispose();
    }
}