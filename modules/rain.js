/**
 * rain.js - Sistema de lluvia con modos reales y combinaciones
 * Usa estructura: asset/s_cute, asset/s_core, asset/s_belike
 */
export class RainManager {
    constructor() {
        this.container = null;
        this.floorCanvas = null;
        this.ctx = null;
        this.particles = [];
        this.floorParticles = []; // Partículas acumuladas en el suelo
        this.isActive = false;
        this.animationId = null;
        this.mouse = { x: -1000, y: -1000, lastX: -1000, lastY: -1000, speed: 0 };
        this.isFloorAnimating = false;
        
        // Modos disponibles
        this.availableModes = ['cute', 'core', 'belike'];
        this.currentModes = ['cute']; // Puede ser array de 1 o 2 modos
        
        this.images = {
            cute: [],
            core: [],
            belike: []
        };
        this.imagesLoaded = false;
        
        this.init();
    }

    init() {
        // Crear contenedor para la lluvia
        this.container = document.createElement('div');
        this.container.className = 'rain-container';
        this.container.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 3;
            overflow: hidden;
            opacity: 0;
            transition: opacity 1s ease;
        `;
        document.body.appendChild(this.container);

        // Crear Canvas para el suelo (acumulación)
        this.floorCanvas = document.createElement('canvas');
        this.floorCanvas.className = 'rain-floor-canvas';
        this.floorCanvas.width = window.innerWidth;
        this.floorCanvas.height = window.innerHeight;
        this.ctx = this.floorCanvas.getContext('2d');
        document.body.appendChild(this.floorCanvas);

        // Eventos de mouse para interactuar con el suelo
        window.addEventListener('mousemove', (e) => {
            this.mouse.speed = Math.abs(e.clientX - this.mouse.lastX) + Math.abs(e.clientY - this.mouse.lastY);
            this.mouse.lastX = this.mouse.x;
            this.mouse.lastY = this.mouse.y;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Precargar imágenes del modo inicial
        this.loadImages();
    }

    resizeCanvas() {
        if (this.floorCanvas) {
            this.floorCanvas.width = window.innerWidth;
            this.floorCanvas.height = window.innerHeight;
        }
    }

    /**
     * Carga las imágenes reales desde las carpetas asset
     */
    async loadImages() {
        this.imagesLoaded = false;
        
        // 1. DETECCIÓN AUTOMÁTICA DE RUTA
        // Probamos cuál es la ruta correcta para los assets
        let basePath = 'asset'; // Asumimos estructura estándar (index en root)
        
        try {
            // Intentar cargar una imagen de prueba
            await this.checkPath('asset/S_cute/img (1).png');
            basePath = 'asset';
        } catch {
            try {
                // Si falla, probar ruta relativa superior
                await this.checkPath('../asset/S_cute/img (1).png');
                basePath = '../asset';
            } catch {
                console.warn('⚠️ No se encontraron assets en rutas estándar. Usando fallback.');
            }
        }

        // Limpiar imágenes previas
        this.images = {
            cute: [],
            core: [],
            belike: []
        };
        
        // Definir las rutas usando el basePath detectado
        const folders = {
            cute: { path: `${basePath}/S_cute`, count: 30, format: 'png' },
            core: { path: `${basePath}/S_core`, count: 17, format: 'jpeg' },
            belike: { path: `${basePath}/S_beLike`, count: 15, format: 'jpeg' }
        };
        
        // Cargar imágenes de cada modo
        for (const [mode, config] of Object.entries(folders)) {
            for (let i = 1; i <= config.count; i++) {

                const imgPath = `${config.path}/img (${i}).${config.format}`;

                // Intentar cargar imagen real, si falla usar placeholder
                try {
                    await this.loadImageAsync(imgPath, mode);
                } catch {
                    // Si no existe la imagen, usar placeholder
                    this.images[mode].push(this.createPlaceholder(mode, i));
                }
            }
        }
        
        this.imagesLoaded = true;
        console.log(`✓ Lluvia cargada: ${Object.keys(this.images).map(k => `${k}(${this.images[k].length})`).join(', ')}`);
    }

    /**
     * Verifica si una ruta existe (para detección inicial)
     */
    checkPath(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = src;
        });
    }

    /**
     * Carga una imagen de forma asíncrona
     */
    loadImageAsync(src, mode) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images[mode].push(src);
                resolve();
            };
            img.onerror = () => reject();
            img.src = src;
        });
    }

    /**
     * Crea placeholder si no hay imágenes reales
     */
    createPlaceholder(mode, index) {
        const emojis = {
            cute: ['🌸', '🌺', '🌼', '🌻', '🌷', '🌹', '💐', '🏵️'],
            core: ['⭐', '🌟', '✨', '💫', '🌠', '🌌', '🌑', '🪐'],
            belike: ['🦋', '🐝', '🌈', '☀️', '🌙', '⚡', '💧', '🍂']
        };
        
        const emoji = emojis[mode][index % emojis[mode].length];
        
        const svg = `
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <text x="20" y="30" font-size="30" text-anchor="middle">${emoji}</text>
            </svg>
        `;
        
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        return URL.createObjectURL(blob);
    }

    /**
     * Establece los modos activos (1 o 2)
     */
    setModes(modes) {
        // modes puede ser: ['cute'], ['core', 'belike'], ['cute', 'core'], etc.
        this.currentModes = Array.isArray(modes) ? modes : [modes];
        
        // Limitar a máximo 2 modos
        if (this.currentModes.length > 2) {
            this.currentModes = this.currentModes.slice(0, 2);
        }
        
        console.log(`Modos de lluvia: ${this.currentModes.join(' + ')}`);
    }

    /**
     * Modo "Todo" - combina los 3 tipos
     */
    setAllModes() {
        this.currentModes = ['cute', 'core', 'belike'];
        console.log('Modo TODO activado: cute + core + belike');
    }

    /**
     * Obtiene una imagen aleatoria de los modos activos
     */
    getRandomImage() {
        // Seleccionar modo aleatorio de los activos
        const mode = this.currentModes[Math.floor(Math.random() * this.currentModes.length)];
        const modeImages = this.images[mode];
        
        if (!modeImages || modeImages.length === 0) {
            return null;
        }
        
        return modeImages[Math.floor(Math.random() * modeImages.length)];
    }

    /**
     * Activa o desactiva la lluvia
     */
    toggle() {
        this.isActive = !this.isActive;
        
        if (this.isActive) {
            this.start();
        } else {
            this.stop();
        }
        
        return this.isActive;
    }

    /**
     * Inicia la lluvia
     */
    start() {
        if (!this.imagesLoaded) {
            console.warn('RainManager: Imágenes aún no cargadas');
            return;
        }
        
        this.container.style.opacity = '1';
        this.createParticles();
        this.animate();
        
        if (!this.isFloorAnimating) {
            this.animateFloor(); // Iniciar loop del suelo solo si no está corriendo
        }
    }

    /**
     * Detiene la lluvia
     */
    stop() {
        this.container.style.opacity = '0';
        
        setTimeout(() => {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            this.clearParticles();
            // No limpiamos el suelo inmediatamente para que se vea bonito desvanecerse
        }, 1000);
    }

    /**
     * Crea las partículas de lluvia
     */
    createParticles() {
        const particleCount = 30;
        
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                if (this.isActive) {
                    this.createParticle();
                }
            }, i * 100);
        }
    }

    /**
     * Crea una partícula individual
     */
    createParticle() {
        if (!this.isActive) return;
        
        const imgSrc = this.getRandomImage();
        if (!imgSrc) return;
        
        const particle = document.createElement('div');
        particle.className = 'rain-particle';
        
        const x = Math.random() * window.innerWidth;
        const speed = 1 + Math.random() * 4;
        const rotation = Math.random() * 360;
        const rotationSpeed = (Math.random() - 0.5) * 4;
        const size = 30 + Math.random() * 30;
        const sway = Math.random() * 40 - 20;
        
        particle.innerHTML = `<img src="${imgSrc}" alt="">`;
        particle.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: -60px;
            width: ${size}px;
            height: ${size}px;
            transform: rotate(${rotation}deg);
            opacity: 0.8;
        `;
        
        const particleData = {
            element: particle,
            x,
            y: -60,
            speed,
            rotation,
            rotationSpeed,
            sway,
            swayPhase: Math.random() * Math.PI * 2,
            imgSrc: imgSrc // Guardamos la fuente para pasarla al suelo
        };
        
        this.container.appendChild(particle);
        this.particles.push(particleData);
    }

    /**
     * Loop de animación
     */
    animate() {
        if (!this.isActive) return;
        
        const height = window.innerHeight;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.y += p.speed;
            p.swayPhase += 0.02;
            const swayOffset = Math.sin(p.swayPhase) * p.sway;
            p.rotation += p.rotationSpeed;
            
            p.element.style.transform = `
                translate(${swayOffset}px, 0)
                rotate(${p.rotation}deg)
            `;
            p.element.style.top = `${p.y}px`;
            
            // Si toca el suelo (con un pequeño margen aleatorio para naturalidad)
            const floorLevel = height - 40 + (Math.random() * 20);
            
            if (p.y > floorLevel) {
                // Transferir al sistema de suelo
                this.landParticle(p);
                
                p.element.remove();
                this.particles.splice(i, 1);
                
                if (this.isActive) {
                    this.createParticle();
                }
            }
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    /**
     * Convierte una partícula DOM en una partícula de Canvas en el suelo
     */
    landParticle(p) {
        // Cargar imagen para el canvas
        const img = new Image();
        img.src = p.imgSrc;

        // Crear partícula física
        const floorParticle = {
            x: parseFloat(p.element.style.left) || p.x, // Posición X actual
            y: window.innerHeight - 20 - (Math.random() * 30), // Posición Y en el suelo
            vx: 0, // Velocidad X
            vy: 0, // Velocidad Y
            rotation: p.rotation,
            size: parseFloat(p.element.style.width) || 40,
            img: img,
            friction: 0.92,
            mass: 1 + Math.random(),
            life: 1.0,
            decay: 0.001 + Math.random() * 0.002
        };

        this.floorParticles.push(floorParticle);

        // Limitar cantidad de partículas en el suelo para rendimiento
        if (this.floorParticles.length > 150) {
            this.floorParticles.shift(); // Eliminar las más viejas
        }
    }

    /**
     * Loop de física y renderizado del suelo
     */
    animateFloor() {
        if (!this.ctx) return;
        this.isFloorAnimating = true;

        this.ctx.clearRect(0, 0, this.floorCanvas.width, this.floorCanvas.height);
        const groundLevel = window.innerHeight - 10;

        for (let i = 0; i < this.floorParticles.length; i++) {
            const p = this.floorParticles[i];

            // 1. Interacción con el Mouse (Repulsión)
            const dx = p.x - this.mouse.x;
            const dy = p.y - this.mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const interactionRadius = 100;

            if (dist < interactionRadius) {
                const force = (interactionRadius - dist) / interactionRadius;
                const angle = Math.atan2(dy, dx);
                
                // Empujar lejos del mouse
                p.vx += Math.cos(angle) * force * 2;
                p.vy += Math.sin(angle) * force * 2;
                p.life = 1.0; // "Derretir" se pausa/reinicia si interactúas
                
                // Si el mouse se mueve rápido, levantar partículas (efecto viento)
                if (this.mouse.speed > 10) {
                    p.vy -= force * 2; 
                }
            }

            // Envejecimiento (derretirse)
            p.life -= p.decay;
            if (p.life <= 0) {
                this.floorParticles.splice(i, 1);
                i--;
                continue;
            }

            // 2. Física
            p.x += p.vx;
            p.y += p.vy;

            // Gravedad (solo si está en el aire)
            if (p.y < groundLevel - p.size/2) {
                p.vy += 0.2; 
            }

            // Fricción (aire y suelo)
            p.vx *= p.friction;
            p.vy *= p.friction;

            // 3. Límites (Suelo y Paredes)
            // Suelo
            if (p.y > groundLevel - p.size/2) {
                p.y = groundLevel - p.size/2;
                p.vy *= -0.5; // Rebote pequeño
            }
            
            // Paredes
            if (p.x < 0) { p.x = 0; p.vx *= -1; }
            if (p.x > this.floorCanvas.width) { p.x = this.floorCanvas.width; p.vx *= -1; }

            // 4. Dibujar
            if (p.img.complete) {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.globalAlpha = p.life;
                this.ctx.rotate((p.rotation * Math.PI) / 180);
                // Rotación dinámica basada en velocidad X
                p.rotation += p.vx; 
                
                this.ctx.drawImage(p.img, -p.size/2, -p.size/2, p.size, p.size);
                this.ctx.restore();
            }
        }

        if (this.isActive || this.floorParticles.length > 0) {
            requestAnimationFrame(() => this.animateFloor());
        } else {
            this.isFloorAnimating = false;
        }
    }

    /**
     * Limpia todas las partículas
     */
    clearParticles() {
        this.particles.forEach(p => p.element.remove());
        this.particles = [];
        // Opcional: Limpiar suelo también o dejar que se quede
        // this.floorParticles = []; 
    }

    /**
     * Limpia el suelo (nieve)
     */
    clearFloor() {
        this.floorParticles = [];
    }

    /**
     * Obtiene el estado actual
     */
    getState() {
        return {
            isActive: this.isActive,
            modes: this.currentModes
        };
    }

    /**
     * Limpieza de recursos
     */
    dispose() {
        this.stop();
        this.clearParticles();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        if (this.floorCanvas && this.floorCanvas.parentNode) {
            this.floorCanvas.parentNode.removeChild(this.floorCanvas);
        }
        
        // Liberar URLs de objetos
        Object.values(this.images).flat().forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    }
}