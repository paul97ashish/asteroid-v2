// Void Drifter - Particle System

class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        
        // Velocity
        this.vx = options.vx || Utils.random(-50, 50);
        this.vy = options.vy || Utils.random(-50, 50);
        
        // Visual properties
        this.size = options.size || Utils.random(1, 3);
        this.startSize = this.size;
        this.color = options.color || '#00ffff';
        this.alpha = options.alpha || 1;
        this.startAlpha = this.alpha;
        
        // Lifecycle
        this.life = options.life || 1000; // milliseconds
        this.maxLife = this.life;
        this.decay = options.decay || 0.98;
        
        // Physics
        this.gravity = options.gravity || 0;
        this.friction = options.friction || 0.99;
        this.bounce = options.bounce || 0;
        
        // Visual effects
        this.glow = options.glow || false;
        this.trail = options.trail || false;
        this.trailPoints = [];
        this.maxTrailLength = options.maxTrailLength || 10;
        
        // Animation
        this.rotation = options.rotation || 0;
        this.rotationSpeed = options.rotationSpeed || 0;
        this.scaleSpeed = options.scaleSpeed || 0;
        
        // Behavior
        this.behavior = options.behavior || null;
        this.behaviorData = options.behaviorData || {};
        
        this.alive = true;
    }
    
    update(deltaTime, canvasWidth, canvasHeight) {
        if (!this.alive) return;
        
        const dt = deltaTime / 1000;
        
        // Update lifecycle
        this.life -= deltaTime;
        if (this.life <= 0) {
            this.alive = false;
            return;
        }
        
        // Calculate life progress (0 to 1)
        const lifeProgress = 1 - (this.life / this.maxLife);
        
        // Apply behavior
        if (this.behavior) {
            this.behavior(this, dt, lifeProgress);
        }
        
        // Apply physics
        this.vy += this.gravity * dt;
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Handle bouncing
        if (this.bounce > 0) {
            if (this.x <= 0 || this.x >= canvasWidth) {
                this.vx *= -this.bounce;
                this.x = Utils.clamp(this.x, 0, canvasWidth);
            }
            if (this.y <= 0 || this.y >= canvasHeight) {
                this.vy *= -this.bounce;
                this.y = Utils.clamp(this.y, 0, canvasHeight);
            }
        }
        
        // Update visual properties
        this.alpha = this.startAlpha * (this.life / this.maxLife);
        this.size = this.startSize * (1 + this.scaleSpeed * lifeProgress);
        this.rotation += this.rotationSpeed * dt;
        
        // Update trail
        if (this.trail) {
            this.trailPoints.push({ x: this.x, y: this.y, alpha: this.alpha });
            if (this.trailPoints.length > this.maxTrailLength) {
                this.trailPoints.shift();
            }
        }
        
        // Apply decay
        this.size *= this.decay;
        if (this.size < 0.1) {
            this.alive = false;
        }
    }
    
    render(ctx) {
        if (!this.alive || this.alpha <= 0) return;
        
        ctx.save();
        
        // Set global alpha
        ctx.globalAlpha = this.alpha;
        
        // Render trail first
        if (this.trail && this.trailPoints.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size * 0.5;
            ctx.beginPath();
            
            for (let i = 0; i < this.trailPoints.length; i++) {
                const point = this.trailPoints[i];
                const trailAlpha = (i / this.trailPoints.length) * this.alpha;
                ctx.globalAlpha = trailAlpha;
                
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            }
            ctx.stroke();
        }
        
        // Render particle
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        if (this.glow) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = this.size * 2;
        }
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.emitters = [];
    }
    
    update(deltaTime, canvasWidth, canvasHeight) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime, canvasWidth, canvasHeight);
            
            if (!particle.alive) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update emitters
        for (const emitter of this.emitters) {
            emitter.update(deltaTime);
        }
    }
    
    render(ctx) {
        for (const particle of this.particles) {
            particle.render(ctx);
        }
    }
    
    addParticle(particle) {
        this.particles.push(particle);
    }
    
    addEmitter(emitter) {
        this.emitters.push(emitter);
        emitter.system = this;
    }
    
    removeEmitter(emitter) {
        const index = this.emitters.indexOf(emitter);
        if (index !== -1) {
            this.emitters.splice(index, 1);
        }
    }
    
    clear() {
        this.particles = [];
        this.emitters = [];
    }
    
    getParticleCount() {
        return this.particles.length;
    }
}

class ParticleEmitter {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.active = true;
        this.system = null;
        
        // Emission properties
        this.rate = options.rate || 10; // particles per second
        this.burst = options.burst || 0; // particles per burst
        this.burstDelay = options.burstDelay || 1000; // ms between bursts
        
        // Particle properties
        this.particleOptions = options.particleOptions || {};
        
        // Emission area
        this.emissionRadius = options.emissionRadius || 0;
        this.emissionAngle = options.emissionAngle || 0;
        this.emissionSpread = options.emissionSpread || Math.PI * 2;
        
        // Lifecycle
        this.duration = options.duration || -1; // -1 for infinite
        this.life = this.duration;
        
        // Internal timing
        this.emissionTimer = 0;
        this.burstTimer = 0;
    }
    
    update(deltaTime) {
        if (!this.active || !this.system) return;
        
        // Update lifetime
        if (this.duration > 0) {
            this.life -= deltaTime;
            if (this.life <= 0) {
                this.active = false;
                return;
            }
        }
        
        // Handle continuous emission
        if (this.rate > 0) {
            this.emissionTimer += deltaTime;
            const emissionInterval = 1000 / this.rate;
            
            while (this.emissionTimer >= emissionInterval) {
                this.emitParticle();
                this.emissionTimer -= emissionInterval;
            }
        }
        
        // Handle burst emission
        if (this.burst > 0) {
            this.burstTimer += deltaTime;
            if (this.burstTimer >= this.burstDelay) {
                for (let i = 0; i < this.burst; i++) {
                    this.emitParticle();
                }
                this.burstTimer = 0;
            }
        }
    }
    
    emitParticle() {
        if (!this.system) return;
        
        // Calculate emission position
        let emitX = this.x;
        let emitY = this.y;
        
        if (this.emissionRadius > 0) {
            const angle = Utils.random(0, Math.PI * 2);
            const radius = Utils.random(0, this.emissionRadius);
            emitX += Math.cos(angle) * radius;
            emitY += Math.sin(angle) * radius;
        }
        
        // Calculate emission velocity
        const angle = this.emissionAngle + Utils.random(-this.emissionSpread / 2, this.emissionSpread / 2);
        const speed = this.particleOptions.speed || Utils.random(50, 100);
        
        const particleOptions = {
            ...this.particleOptions,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed
        };
        
        const particle = new Particle(emitX, emitY, particleOptions);
        this.system.addParticle(particle);
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    stop() {
        this.active = false;
    }
    
    start() {
        this.active = true;
    }
}

// Predefined particle effects
class ParticleEffects {
    // Explosion effect
    static explosion(system, x, y, options = {}) {
        const particleCount = options.count || 20;
        const colors = options.colors || ['#ff4444', '#ff8844', '#ffff44', '#ffffff'];
        const size = options.size || 3;
        const speed = options.speed || 100;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const velocity = Utils.random(speed * 0.5, speed);
            
            const particle = new Particle(x, y, {
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: Utils.random(size * 0.5, size),
                color: Utils.randomChoice(colors),
                life: Utils.random(500, 1000),
                glow: true,
                friction: 0.95,
                scaleSpeed: -0.5
            });
            
            system.addParticle(particle);
        }
    }
    
    // Thruster trail effect
    static thrusterTrail(system, x, y, angle, options = {}) {
        const emitter = new ParticleEmitter(x, y, {
            rate: options.rate || 30,
            emissionAngle: angle + Math.PI,
            emissionSpread: options.spread || 0.5,
            particleOptions: {
                size: options.size || 2,
                color: options.color || '#00aaff',
                life: options.life || 300,
                speed: options.speed || 50,
                glow: true,
                friction: 0.98,
                scaleSpeed: -1
            }
        });
        
        system.addEmitter(emitter);
        return emitter;
    }
    
    // Sparks effect
    static sparks(system, x, y, options = {}) {
        const particleCount = options.count || 10;
        const colors = options.colors || ['#ffff00', '#ff8800', '#ffffff'];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const velocity = Utils.random(20, 80);
            
            const particle = new Particle(x, y, {
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: Utils.random(1, 2),
                color: Utils.randomChoice(colors),
                life: Utils.random(200, 500),
                glow: true,
                gravity: 50,
                friction: 0.99,
                bounce: 0.3
            });
            
            system.addParticle(particle);
        }
    }
    
    // Debris effect
    static debris(system, x, y, options = {}) {
        const particleCount = options.count || 15;
        const colors = options.colors || ['#666666', '#888888', '#aaaaaa'];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const velocity = Utils.random(30, 120);
            
            const particle = new Particle(x, y, {
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: Utils.random(2, 5),
                color: Utils.randomChoice(colors),
                life: Utils.random(1000, 2000),
                friction: 0.98,
                rotationSpeed: Utils.random(-5, 5),
                gravity: 20
            });
            
            system.addParticle(particle);
        }
    }
    
    // Shield hit effect
    static shieldHit(system, x, y, options = {}) {
        const particleCount = options.count || 8;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const velocity = Utils.random(40, 80);
            
            const particle = new Particle(x, y, {
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: Utils.random(2, 4),
                color: '#00ffff',
                life: Utils.random(300, 600),
                glow: true,
                friction: 0.95,
                scaleSpeed: -0.8
            });
            
            system.addParticle(particle);
        }
    }
    
    // Warp effect
    static warp(system, x, y, options = {}) {
        const particleCount = options.count || 25;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const distance = Utils.random(10, 50);
            const startX = x + Math.cos(angle) * distance;
            const startY = y + Math.sin(angle) * distance;
            
            const particle = new Particle(startX, startY, {
                vx: -Math.cos(angle) * 200,
                vy: -Math.sin(angle) * 200,
                size: Utils.random(1, 3),
                color: '#ff00ff',
                life: Utils.random(200, 400),
                glow: true,
                trail: true,
                maxTrailLength: 5
            });
            
            system.addParticle(particle);
        }
    }
}

// Export classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Particle, ParticleSystem, ParticleEmitter, ParticleEffects };
}
