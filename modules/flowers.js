import * as THREE from 'https://cdn.skypack.dev/three@0.133.1/build/three.module';
import { storage } from './storage.js';

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
    float wind = sin(uv.y * 5.0 + u_time * 1.5) * 0.003 * uv.y;
    gl_FragColor = texture2D(u_texture, uv + vec2(wind, 0.0));
}
`;

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
        this.flowerQueue = [];
        this.savedFlowers = [];
        
        this._listenersInstalled = false;

        this.init();
    }

    init() {
        this.schemes = {
            default: { f: [1.0, 0.9, 0.95], s: [0.05, 0.15, 0.05] },
            red:     { f: [1.0, 0.1, 0.2],  s: [0.05, 0.15, 0.05] },
            wine:    { f: [0.6, 0.0, 0.2],  s: [0.05, 0.15, 0.05] },
            pink:    { f: [1.0, 0.4, 0.7],  s: [0.05, 0.15, 0.05] },
            blue:    { f: [0.2, 0.5, 1.0],  s: [0.05, 0.15, 0.08] },
            purple:  { f: [0.6, 0.2, 1.0],  s: [0.05, 0.15, 0.08] },
            yellow:  { f: [1.0, 0.9, 0.1],  s: [0.05, 0.15, 0.05] },
            white:   { f: [1.0, 1.0, 1.0],  s: [0.05, 0.15, 0.05] }
        };

        // FIX: Pool de colores para modo aleatorio.
        // Se excluyen 'default' y 'white' porque son visualmente idénticos al color base,
        // lo que hacía que el modo aleatorio pareciera siempre blanco.
        this._randomPool = ['red', 'wine', 'pink', 'blue', 'purple', 'yellow'];

        this.setupRenderer();
        this.setupScenes();
        this.setupCamera();
        this.setupRenderTargets();
        this.createPlane();
        this.updateSize();
        this.setupEvents();
        this.startRenderLoop();
        this.setColorScheme('default');
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
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
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
        const vsEl = document.getElementById('vertexShader');
        const fsEl = document.getElementById('fragmentShader');
        
        const vertexShader   = (vsEl && vsEl.textContent.trim()) ? vsEl.textContent : DEFAULT_VERTEX_SHADER;
        const fragmentShader = (fsEl && fsEl.textContent.trim()) ? fsEl.textContent : DEFAULT_FRAGMENT_SHADER;
        
        if (!vsEl || !fsEl || !vsEl.textContent.trim() || !fsEl.textContent.trim()) {
            console.warn('⚠️ Shaders no encontrados o vacíos. Usando shaders por defecto.');
        }
        
        this.shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_stop_time:       { value: 0 },
                u_stop_randomizer: { value: new THREE.Vector2(Math.random(), Math.random()) },
                u_cursor:          { value: new THREE.Vector2(this.pointer.x, this.pointer.y) },
                u_ratio:           { value: window.innerWidth / window.innerHeight },
                u_texture:         { value: null },
                u_clean:           { value: 1 },
                u_flower_color:    { value: new THREE.Vector3(1, 1, 1) },
                u_stem_color:      { value: new THREE.Vector3(0.5, 0.8, 0.5) },
                u_stem_thickness:  { value: 1.0 },
                u_size_scale:      { value: 1.0 }
            },
            vertexShader,
            fragmentShader,
            transparent: true
        });

        this.basicMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_texture: { value: null },
                u_time:    { value: 0 }
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

    // FIX: _pickRandomColor centraliza la lógica de selección aleatoria.
    // Antes estaba duplicada en setColorScheme y addFlower con lógica ligeramente distinta,
    // lo que causaba inconsistencias. Ahora hay una única fuente de verdad.
    _pickRandomColor() {
        const pool = this._randomPool;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    setColorScheme(scheme) {
        this.currentColorScheme = scheme;
        
        if (scheme === 'random') {
            this._applyUniformsForScheme(this._pickRandomColor());
        } else {
            this._applyUniformsForScheme(scheme);
        }
    }

    _applyUniformsForScheme(schemeName) {
        const colors = this.schemes[schemeName] || this.schemes.default;
        this.updateUniform('u_flower_color', new THREE.Vector3(...colors.f));
        this.updateUniform('u_stem_color',   new THREE.Vector3(...colors.s));
    }

    setupEvents() {
        if (this._listenersInstalled) {
            console.warn('⚠️ Listeners ya instalados');
            return;
        }
        
        console.log('🎯 Instalando event listeners...');
        
        const handlePointerDown = (e) => {
            try {
                let x, y;
                
                if (e.type === 'touchstart') {
                    if (!e.touches || !e.touches[0]) return;
                    x = e.touches[0].clientX;
                    y = e.touches[0].clientY;
                    this.isTouchScreen = true;
                } else {
                    x = e.clientX;
                    y = e.clientY;
                }
                
                if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) return;
                
                const rect = this.canvas.getBoundingClientRect();
                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
                
                if (this.hasOpenModals()) return;
                
                this.addFlower(x, y);
                
            } catch (error) {
                console.error('❌ Error en handlePointerDown:', error);
            }
        };
        
        this.canvas.addEventListener('mousedown', handlePointerDown, { capture: true, passive: false });
        this.canvas.addEventListener('touchstart', handlePointerDown, { capture: true, passive: false });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault(), { capture: true });
        
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
        
        return selectors.some(sel => {
            const el = document.querySelector(sel);
            if (!el) return false;
            const styles = window.getComputedStyle(el);
            return styles.display !== 'none' && 
                   styles.visibility !== 'hidden' && 
                   parseFloat(styles.opacity) > 0;
        });
    }

    addFlower(x, y) {
        try {
            if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) {
                console.error('❌ addFlower: coordenadas inválidas:', x, y);
                return;
            }
            
            this.pointer.x = x / window.innerWidth;
            this.pointer.y = y / window.innerHeight;

            // FIX: Determinar el color concreto ANTES de marcar el click.
            // Antes, en modo aleatorio se llamaba _applyUniformsForScheme con el color elegido,
            // pero si el render loop corría entre addFlower y la siguiente frame podía haber
            // una llamada externa que pisara los uniforms. Ahora guardamos el color resuelto
            // en this.pointer.pendingColor para que el render loop lo reaplique de forma
            // determinista justo antes de renderizar esa flor.
            let resolvedColor;
            if (this.currentColorScheme === 'random') {
                resolvedColor = this._pickRandomColor();
            } else {
                resolvedColor = this.currentColorScheme;
            }

            this.pointer.pendingColor = resolvedColor;
            this.pointer.clicked = true;

            const flowerData = {
                x:     parseFloat(this.pointer.x.toFixed(4)),
                y:     parseFloat(this.pointer.y.toFixed(4)),
                color: resolvedColor
            };
            this.savedFlowers.push(flowerData);
            this.saveToStorage();
            
        } catch (error) {
            console.error('❌ Error en addFlower:', error);
        }
    }

    saveToStorage() {
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
            this.flowerQueue = [...saved];
        }
    }

    clean() {
        this.pointer.vanishCanvas = true;
        setTimeout(() => { this.pointer.vanishCanvas = false; }, 50);
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

        let scale = 1.0;
        if (w < 600)       scale = 0.5;
        else if (w < 1024) scale = 0.75;
        
        this.updateUniform('u_size_scale', scale);
    }

    startRenderLoop() {
        this.isAnimating = true;
        this.render();
    }

    render() {
        if (!this.isAnimating) return;

        const deltaTime = this.clock.getDelta();

        this.updateUniform('u_clean',   this.pointer.vanishCanvas ? 0 : 1);
        this.updateUniform('u_texture', this.renderTargets[0].texture);

        // Procesar cola de restauración
        if (!this.pointer.clicked && this.flowerQueue.length > 0) {
            const nextFlower = this.flowerQueue.shift();
            
            // FIX: Siempre aplicar el color guardado al restaurar,
            // sin importar el esquema actual del usuario.
            const colorToRestore = nextFlower.color || 'default';
            this._applyUniformsForScheme(colorToRestore);
            
            this.pointer.x            = nextFlower.x;
            this.pointer.y            = nextFlower.y;
            this.pointer.pendingColor = colorToRestore;
            this.pointer.clicked      = true;
            this.pointer.isRestoring  = true;
        }

        if (this.pointer.clicked) {
            // FIX: Aplicar el color pendiente justo antes de renderizar.
            // Esto garantiza que los uniforms del color y los del cursor/randomizer
            // se envían al shader en el mismo frame, eliminando la condición de carrera.
            if (this.pointer.pendingColor) {
                this._applyUniformsForScheme(this.pointer.pendingColor);
                this.pointer.pendingColor = null;
            }

            this.updateUniform('u_cursor', new THREE.Vector2(this.pointer.x, 1 - this.pointer.y));
            this.updateUniform('u_stop_randomizer', new THREE.Vector2(Math.random(), Math.random()));
            
            if (this.pointer.isRestoring) {
                this.updateUniform('u_stop_time', 10.0);
                this.pointer.isRestoring = false;
            } else {
                this.updateUniform('u_stop_time', 0);
            }
            
            this.pointer.clicked = false;
        }

        this.updateUniform('u_stop_time', this.shaderMaterial.uniforms.u_stop_time.value + deltaTime);

        this.renderer.setRenderTarget(this.renderTargets[1]);
        this.renderer.render(this.sceneShader, this.camera);
        
        this.basicMaterial.uniforms.u_texture.value = this.renderTargets[1].texture;
        this.basicMaterial.uniforms.u_time.value   += deltaTime;
        
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

    debugClickSystem() {
        console.group('🔍 Sistema de Clicks - Debug');
        
        const canvas = this.canvas;
        if (!canvas) { console.error('❌ Canvas no existe'); console.groupEnd(); return; }
        
        const rect   = canvas.getBoundingClientRect();
        const styles = window.getComputedStyle(canvas);
        
        console.log('Canvas:', {
            width: rect.width, height: rect.height,
            pointerEvents: styles.pointerEvents,
            zIndex: styles.zIndex
        });
        console.log('Modales abiertos:', this.hasOpenModals());
        console.log('Estado:', {
            isAnimating: this.isAnimating,
            currentColorScheme: this.currentColorScheme,
            randomPool: this._randomPool
        });
        
        console.groupEnd();
        
        canvas.style.border = '2px solid lime';
        setTimeout(() => { canvas.style.border = ''; }, 3000);
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