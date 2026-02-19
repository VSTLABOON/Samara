/**
 * critters.js - Sistema de "bichitos" (abejas y luciérnagas)
 * Se mueven de forma inteligente hacia las flores.
 */

export class CritterManager {
    constructor(flowerCanvas) {
        this.flowers = flowerCanvas;
        this.container = null;
        this.critters = [];
        this.mode = null; // 'bees' o 'fireflies'
        this.animationId = null;

        this.config = {
            count: 10,
            maxSpeed: 1.5,
            steeringForce: 0.03
        };

        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.className = 'critter-container';
        this.container.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 2;
            overflow: hidden;
        `;
        document.body.appendChild(this.container);

        // Comprobar hora inicial y luego cada 5 minutos
        this.checkTimeOfDay();
        setInterval(() => this.checkTimeOfDay(), 300000);

        // Configurar interacción (asustar con click/touch)
        this.setupInteraction();

        this.animate();
    }

    checkTimeOfDay() {
        const hour = new Date().getHours();
        const isNight = hour < 7 || hour >= 19;
        const newMode = isNight ? 'fireflies' : 'bees';

        console.log(`🕐 Hora: ${hour}h → Modo: ${newMode} (${isNight ? '🌙' : '☀️'})`);

        if (this.mode !== newMode) {
            this.mode = newMode;
            console.log(`✨ Cambiando a: ${this.mode}`);
            this.updateCritters();
        } else if (this.critters.length === 0) {
            // Si el modo es correcto pero no hay critters, crearlos
            console.log(`🐛 No hay critters, creando ${this.mode}...`);
            this.updateCritters();
        }
    }

    setupInteraction() {
        const scare = (x, y) => {
            this.critters.forEach(critter => {
                const dx = critter.x - x;
                const dy = critter.y - y;
                const distSq = dx * dx + dy * dy;
                
                // Radio de susto: 150px
                if (distSq < 90 * 90) {
                    critter.state = 'fleeing';
                    critter.fleeSource = { x, y };
                    critter.fleeTimer = 40 + Math.random() * 20; // ~1 segundo
                    
                    // Impulso inicial fuerte en dirección opuesta
                    const angle = Math.atan2(dy, dx);
                    const force = 5 + Math.random() * 3;
                    critter.vx = Math.cos(angle) * force;
                    critter.vy = Math.sin(angle) * force;
                    
                    // Romper el "posarse" inmediatamente
                    critter.targetFlower = null;
                }
            });
        };

        window.addEventListener('mousedown', (e) => scare(e.clientX, e.clientY));
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                scare(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
    }

    updateCritters() {
        // Eliminar bichitos actuales
        this.critters.forEach(c => c.element.remove());
        this.critters = [];

        // Crear nuevos
        for (let i = 0; i < this.config.count; i++) {
            this.createCritter();
        }
        
        console.log(`✅ ${this.critters.length} ${this.mode} creados`);
    }

    createCritter() {
        const element = document.createElement('div');
        element.className = `critter ${this.mode}`;

        const isBee = this.mode === 'bees';
        
        // Opacidad base
        element.style.opacity = isBee ? '0.9' : '0.7';

        // Configuración específica para abejas (Emoji)
        if (isBee) {
            element.textContent = '🐝';
        }

        // Animación de parpadeo para luciérnagas
        if (!isBee) {
            const flickerAnimation = () => {
                const intensity = 0.5 + Math.random() * 0.5;
                element.style.opacity = intensity;
                setTimeout(flickerAnimation, 100 + Math.random() * 200);
            };
            flickerAnimation();
        }

        // Asegurar dimensiones válidas (fallback a 100px si window es 0)
        const w = window.innerWidth || 100;
        const h = window.innerHeight || 100;

        const critter = {
            element: element,
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            wanderAngle: Math.random() * Math.PI * 2,
            targetFlower: null,
            scale: isBee ? (0.6 + Math.random() * 0.6) : 1,
            state: 'seeking',
            perchTimer: 0
        };

        this.container.appendChild(element);
        this.critters.push(critter);
    }

    animate() {
        this.critters.forEach(critter => {
            // Inicializar estado si no existe
            if (!critter.state) critter.state = 'seeking';

            // 1. Lógica de Comportamiento (Máquina de estados)
            if (critter.state === 'fleeing') {
                critter.fleeTimer--;
                if (critter.fleeTimer <= 0) {
                    critter.state = 'seeking';
                }
            } else if (critter.state === 'seeking') {
                // Si no tiene objetivo, buscar uno
                if (!critter.targetFlower) {
                    critter.targetFlower = this.getNewTarget();
                }

                // Si está cerca de la flor, aterrizar
                if (this.isNearTarget(critter, 10)) { // Mayor precisión (15px)
                    critter.state = 'perching';
                    critter.perchTimer = 100 + Math.random() * 200; // Tiempo posada (frames)
                    // Frenar drásticamente
                    critter.vx *= 0.1;
                    critter.vy *= 0.1;
                    
                    // "Postrarse" exactamente en la flor (Snap visual)
                    if (critter.targetFlower) {
                        critter.x = critter.targetFlower.x * window.innerWidth;
                        critter.y = critter.targetFlower.y * window.innerHeight;
                    }
                }
            } else if (critter.state === 'perching') {
                critter.perchTimer--;
                if (critter.perchTimer <= 0) {
                    critter.state = 'seeking';
                    critter.targetFlower = this.getNewTarget(); // Buscar nueva flor
                }
            }

            // 2. Calcular movimiento
            if (critter.state === 'fleeing') {
                // Huir de la fuente (fuerza continua suave)
                if (critter.fleeSource) {
                    const dx = critter.x - critter.fleeSource.x;
                    const dy = critter.y - critter.fleeSource.y;
                    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                    critter.vx += (dx/dist) * 0.3;
                    critter.vy += (dy/dist) * 0.3;
                }
            } else if (critter.state === 'seeking') {
                const steer = this.seek(critter);
                const wander = this.wander(critter);
                critter.vx += steer.x + wander.x;
                critter.vy += steer.y + wander.y;
            } else {
                // Perching: Movimiento muy sutil (vibración sobre la flor)
                // Añadir fuerza de resorte para mantenerla centrada y evitar deriva
                if (critter.targetFlower) {
                    const tx = critter.targetFlower.x * window.innerWidth;
                    const ty = critter.targetFlower.y * window.innerHeight;
                    critter.vx += (tx - critter.x) * 0.1;
                    critter.vy += (ty - critter.y) * 0.1;
                }
                critter.vx += (Math.random() - 0.5) * 0.5;
                critter.vy += (Math.random() - 0.5) * 0.5;
                critter.vx *= 0.8; // Fricción alta
                critter.vy *= 0.8;
            }

            // Limitar velocidad
            const limit = critter.state === 'fleeing' ? this.config.maxSpeed * 4 : this.config.maxSpeed;
            const speed = Math.sqrt(critter.vx * critter.vx + critter.vy * critter.vy);
            if (speed > limit && speed > 0) {
                critter.vx = (critter.vx / speed) * limit;
                critter.vy = (critter.vy / speed) * limit;
            }

            // Actualizar posición
            critter.x += critter.vx;
            critter.y += critter.vy;

            // Protección contra NaN
            if (isNaN(critter.x) || isNaN(critter.y)) {
                critter.x = Math.random() * (window.innerWidth || 100);
                critter.y = Math.random() * (window.innerHeight || 100);
                critter.vx = 0;
                critter.vy = 0;
            }

            // Mantener en pantalla (wrap around)
            if (critter.x < -20) critter.x = window.innerWidth + 20;
            if (critter.x > window.innerWidth + 20) critter.x = -20;
            if (critter.y < -20) critter.y = window.innerHeight + 20;
            if (critter.y > window.innerHeight + 20) critter.y = -20;

            // Calcular dirección (Flip horizontal si va a la derecha)
            // El emoji 🐝 mira a la izquierda por defecto. Si vx > 0 (derecha), invertimos.
            const direction = critter.vx > 0 ? -1 : 1;
            const scale = critter.scale || 1;

            // Aplicar transformación
            critter.element.style.transform = `translate3d(${critter.x}px, ${critter.y}px, 0) translate(-50%, -50%) scale(${scale * direction}, ${scale})`;
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    // Comportamiento: Buscar un objetivo
    seek(critter) {
        if (!critter.targetFlower) return { x: 0, y: 0 };

        // Validación de seguridad
        if (typeof critter.targetFlower.x !== 'number' || typeof critter.targetFlower.y !== 'number') {
            return { x: 0, y: 0 };
        }

        // Convertir coordenadas normalizadas de la flor a coordenadas de pantalla
        const targetX = critter.targetFlower.x * window.innerWidth;
        const targetY = critter.targetFlower.y * window.innerHeight;

        const desiredX = targetX - critter.x;
        const desiredY = targetY - critter.y;

        // Normalizar y aplicar fuerza
        const dist = Math.sqrt(desiredX * desiredX + desiredY * desiredY);
        if (dist === 0) return { x: 0, y: 0 };

        const steerX = ((desiredX / dist) * this.config.maxSpeed - critter.vx) * this.config.steeringForce;
        const steerY = ((desiredY / dist) * this.config.maxSpeed - critter.vy) * this.config.steeringForce;

        return { x: steerX, y: steerY };
    }

    // Comportamiento: Deambular aleatoriamente
    wander(critter) {
        critter.wanderAngle += (Math.random() - 0.5) * 0.5;
        const wanderForce = 0.1;
        return {
            x: Math.cos(critter.wanderAngle) * wanderForce,
            y: Math.sin(critter.wanderAngle) * wanderForce
        };
    }

    getNewTarget() {
        const savedFlowers = this.flowers?.savedFlowers;
        
        if (!savedFlowers || savedFlowers.length === 0) {
            // Objetivo aleatorio en área central si no hay flores
            return { 
                x: 0.3 + Math.random() * 0.4, 
                y: 0.3 + Math.random() * 0.4 
            };
        }
        
        // Validación básica
        const isValid = (f) => f && typeof f.x === 'number' && typeof f.y === 'number';

        // Si no son abejas o hay pocas flores, selección aleatoria simple
        if (this.mode !== 'bees' || savedFlowers.length < 5) {
            const flower = savedFlowers[Math.floor(Math.random() * savedFlowers.length)];
            return isValid(flower) ? flower : { x: 0.5, y: 0.5 };
        }

        // Lógica de Enjambre (Solo Abejas): Preferir flores con más vecinos (zonas densas)
        let bestFlower = null;
        let maxDensity = -1;

        // Probar 5 candidatos aleatorios (aumentado para mejor detección)
        for (let i = 0; i < 5; i++) {
            const candidate = savedFlowers[Math.floor(Math.random() * savedFlowers.length)];
            if (!isValid(candidate)) continue;

            // Calcular densidad alrededor del candidato (radio ~0.15 normalizado)
            let density = 0;
            const radiusSq = 0.15 * 0.15; 
            
            // Muestreo de densidad (optimización: mirar hasta 20 vecinos aleatorios)
            const sampleSize = Math.min(savedFlowers.length, 20);
            for (let j = 0; j < sampleSize; j++) {
                const other = savedFlowers[Math.floor(Math.random() * savedFlowers.length)];
                if (!isValid(other)) continue;
                
                const dx = candidate.x - other.x;
                const dy = candidate.y - other.y;
                if (dx * dx + dy * dy < radiusSq) {
                    density++;
                }
            }
        
            if (density > maxDensity) {
                maxDensity = density;
                bestFlower = candidate;
            }
        }
        
        return bestFlower || savedFlowers[Math.floor(Math.random() * savedFlowers.length)];
    }

    /**
     * Dibuja los critters en un contexto de canvas externo (para capturas)
     */
    drawToCanvas(ctx) {
        if (!ctx) return;

        this.critters.forEach(critter => {
            const x = critter.x;
            const y = critter.y;
            
            ctx.save();
            ctx.translate(x, y);

            if (this.mode === 'bees') {
                // Abejas: Emoji
                const direction = critter.vx > 0 ? -1 : 1;
                const scale = critter.scale || 1;
                
                ctx.scale(direction * scale, scale);
                ctx.font = "24px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.shadowColor = "rgba(0,0,0,0.2)";
                ctx.shadowBlur = 4;
                ctx.shadowOffsetY = 4;
                ctx.fillText('🐝', 0, 0);
            } else {
                // Luciérnagas: Círculo brillante
                const isOrange = Math.random() > 0.5;
                const color = isOrange ? '#ffaa00' : '#ffff00';
                
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;
                ctx.globalAlpha = 0.8 + Math.random() * 0.2;
                
                ctx.beginPath();
                ctx.arc(0, 0, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        });
    }

    isNearTarget(critter, threshold = 100) {
        if (!critter.targetFlower) return true;
        
        const targetX = critter.targetFlower.x * window.innerWidth;
        const targetY = critter.targetFlower.y * window.innerHeight;
        const dx = targetX - critter.x;
        const dy = targetY - critter.y;
        
        return (dx * dx + dy * dy) < threshold * threshold;
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.container) {
            this.container.remove();
        }
        this.critters = [];
    }
}