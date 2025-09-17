// Void Drifter - Game Entities

// Base Entity class
class Entity {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.rotation = options.rotation || 0;
        this.scale = options.scale || 1;
        this.alive = true;
        this.type = options.type || 'entity';
        
        // Visual properties
        this.color = options.color || '#00ffff';
        this.strokeColor = options.strokeColor || this.color;
        this.lineWidth = options.lineWidth || 2;
        this.glow = options.glow || false;
        this.alpha = options.alpha || 1;
        
        // Physics component
        if (options.physics) {
            this.physics = PhysicsEngine.createPhysicsComponent(options.physics);
        }
        
        // Health system
        if (options.health) {
            this.health = {
                current: options.health.max || 100,
                max: options.health.max || 100,
                invulnerable: false,
                invulnerabilityTime: 0
            };
        }
        
        // Animation
        this.animationTime = 0;
        this.pulseSpeed = options.pulseSpeed || 0;
        this.rotationSpeed = options.rotationSpeed || 0;
    }
    
    update(deltaTime, game) {
        this.animationTime += deltaTime;
        
        // Update rotation animation
        if (this.rotationSpeed) {
            this.rotation += this.rotationSpeed * (deltaTime / 1000);
        }
        
        // Update invulnerability
        if (this.health && this.health.invulnerable) {
            this.health.invulnerabilityTime -= deltaTime;
            if (this.health.invulnerabilityTime <= 0) {
                this.health.invulnerable = false;
            }
        }
    }
    
    render(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        // Apply pulse effect
        if (this.pulseSpeed > 0) {
            const pulse = 1 + Math.sin(this.animationTime * this.pulseSpeed * 0.01) * 0.1;
            ctx.scale(pulse, pulse);
        }
        
        // Apply invulnerability flashing
        if (this.health && this.health.invulnerable) {
            ctx.globalAlpha = this.alpha * (0.3 + 0.7 * Math.sin(this.animationTime * 0.02));
        } else {
            ctx.globalAlpha = this.alpha;
        }
        
        // Set up glow effect
        if (this.glow) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
        }
        
        // Render the entity (to be overridden by subclasses)
        this.draw(ctx);
        
        ctx.restore();
    }
    
    draw(ctx) {
        // Default drawing - simple circle
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    takeDamage(amount) {
        if (!this.health || this.health.invulnerable) return false;
        
        this.health.current -= amount;
        if (this.health.current <= 0) {
            this.health.current = 0;
            this.destroy();
            return true;
        }
        
        // Make invulnerable for a short time
        this.health.invulnerable = true;
        this.health.invulnerabilityTime = 500; // 0.5 seconds
        
        return false;
    }
    
    heal(amount) {
        if (!this.health) return;
        
        this.health.current = Math.min(this.health.current + amount, this.health.max);
    }
    
    destroy() {
        this.alive = false;
    }
    
    getCollisionRadius() {
        return this.physics ? this.physics.collisionRadius : 10;
    }
}

// Player Ship
class Player extends Entity {
    constructor(x, y, options = {}) {
        super(x, y, {
            type: 'player',
            color: '#00ffff',
            glow: true,
            health: { max: 100 },
            physics: {
                mass: 1,
                maxVelocity: 300,
                collisionRadius: 12,
                damping: 0.98
            },
            ...options
        });
        
        // Ship properties
        this.thrustPower = 200;
        this.rotationSpeed = 3; // radians per second
        this.size = 15;
        
        // Weapon system
        this.weapon = {
            heat: 0,
            maxHeat: 100,
            heatPerShot: 15,
            cooldownRate: 30, // heat units per second
            overheated: false,
            fireRate: 200, // milliseconds between shots
            lastFired: 0
        };
        
        // Special ability
        this.ability = {
            type: 'hyperspace',
            cooldown: 0,
            maxCooldown: 3000, // 3 seconds
            active: false
        };
        
        // Shield system
        this.shield = {
            current: 50,
            max: 50,
            regenRate: 10, // per second
            regenDelay: 2000, // delay after taking damage
            lastDamageTime: 0,
            active: true
        };
        
        // Visual effects
        this.thrusterEmitter = null;
        this.showThrust = false;
        
        // Input state
        this.input = {
            thrust: false,
            rotateLeft: false,
            rotateRight: false,
            fire: false,
            ability: false
        };

        // Auto-fire property
        this.autoFire = false;

        // Auto-rotate property
        this.autoRotate = false;
    }
    
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        const dt = deltaTime / 1000;

        // Apply auto-rotation if enabled and no manual rotation input is active
        if (this.autoRotate && !this.input.rotateLeft && !this.input.rotateRight) {
            this.rotation += this.rotationSpeed * dt;
        }
        
        // Handle input
        this.handleInput(dt, game);
        
        // Update weapon heat (pass game object for auto-fire)
        this.updateWeapon(deltaTime, game);
        
        // Update shield
        this.updateShield(deltaTime);
        
        // Update ability cooldown
        if (this.ability.cooldown > 0) {
            this.ability.cooldown -= deltaTime;
        }
        
        // Update thruster particles
        if (this.showThrust && this.thrusterEmitter) {
            const thrusterX = this.x - Math.cos(this.rotation) * this.size;
            const thrusterY = this.y - Math.sin(this.rotation) * this.size;
            this.thrusterEmitter.setPosition(thrusterX, thrusterY);
            this.thrusterEmitter.particleOptions.emissionAngle = this.rotation + Math.PI;
        }
    }
    
    handleInput(dt, game) {
        // Rotation
        if (this.input.rotateLeft) {
            this.rotation -= this.rotationSpeed * dt;
        }
        if (this.input.rotateRight) {
            this.rotation += this.rotationSpeed * dt;
        }
        
        // Thrust
        if (this.input.thrust) {
            game.physics.applyThrust(this, this.thrustPower);
            this.showThrust = true;
            
            // Create thruster particles if not already active
            if (!this.thrusterEmitter) {
                this.thrusterEmitter = ParticleEffects.thrusterTrail(
                    game.particles, this.x, this.y, this.rotation
                );
            }
        } else {
            this.showThrust = false;
            if (this.thrusterEmitter) {
                game.particles.removeEmitter(this.thrusterEmitter);
                this.thrusterEmitter = null;
            }
        }
        
        // Firing
        if (this.input.fire) {
            this.fire(game);
        }
        
        // Special ability
        if (this.input.ability) {
            this.useAbility(game);
        }
    }
    
    updateWeapon(deltaTime, game) {
        // Cool down weapon heat
        if (this.weapon.heat > 0) {
            this.weapon.heat -= this.weapon.cooldownRate * (deltaTime / 1000);
            this.weapon.heat = Math.max(0, this.weapon.heat);
        }
        
        // Check if weapon is no longer overheated
        if (this.weapon.overheated && this.weapon.heat < this.weapon.maxHeat * 0.3) {
            this.weapon.overheated = false;
        }

        // Auto-fire if enabled
        if (this.autoFire) {
            this.fire(game);
        }
    }
    
    updateShield(deltaTime) {
        const now = Date.now();
        
        // Regenerate shield if not recently damaged
        if (this.shield.current < this.shield.max && 
            now - this.shield.lastDamageTime > this.shield.regenDelay) {
            this.shield.current += this.shield.regenRate * (deltaTime / 1000);
            this.shield.current = Math.min(this.shield.current, this.shield.max);
        }
    }
    
    fire(game) {
        const now = Date.now();
        
        // Check fire rate and heat
        if (now - this.weapon.lastFired < this.weapon.fireRate || 
            this.weapon.overheated) {
            return;
        }
        
        // Add heat
        this.weapon.heat += this.weapon.heatPerShot;
        if (this.weapon.heat >= this.weapon.maxHeat) {
            this.weapon.overheated = true;
        }
        
        // Create projectile
        const projectileX = this.x + Math.cos(this.rotation) * this.size;
        const projectileY = this.y + Math.sin(this.rotation) * this.size;
        
        const projectile = new Projectile(projectileX, projectileY, {
            rotation: this.rotation,
            owner: this,
            damage: 25,
            speed: 400,
            color: '#00ffff'
        });
        
        game.addEntity(projectile);
        this.weapon.lastFired = now;
        
        // Play sound effect (if audio system is available)
        if (game.audio) {
            game.audio.play('laser');
        }
    }
    
    useAbility(game) {
        if (this.ability.cooldown > 0) return;
        
        switch (this.ability.type) {
            case 'hyperspace':
                this.hyperspace(game);
                break;
            case 'shield':
                this.activateShield(game);
                break;
            case 'dash':
                this.dash(game);
                break;
        }
        
        this.ability.cooldown = this.ability.maxCooldown;
    }
    
    hyperspace(game) {
        // Create warp effect at current position
        ParticleEffects.warp(game.particles, this.x, this.y);
        
        // Teleport to random location
        this.x = Utils.random(50, game.canvas.width - 50);
        this.y = Utils.random(50, game.canvas.height - 50);
        
        // Create warp effect at new position
        ParticleEffects.warp(game.particles, this.x, this.y);
        
        // Reset velocity
        this.physics.velocity.x = 0;
        this.physics.velocity.y = 0;
        
        // Brief invulnerability
        this.health.invulnerable = true;
        this.health.invulnerabilityTime = 1000;
    }
    
    activateShield(game) {
        this.shield.current = this.shield.max;
        this.shield.active = true;
        
        // Visual effect
        ParticleEffects.shieldHit(game.particles, this.x, this.y, { count: 15 });
    }
    
    dash(game) {
        const dashForce = 500;
        game.physics.applyThrust(this, dashForce);
        
        // Create dash trail
        ParticleEffects.thrusterTrail(game.particles, this.x, this.y, this.rotation, {
            rate: 50,
            life: 200,
            color: '#ff00ff'
        });
    }
    
    takeDamage(amount) {
        // Shield absorbs damage first
        if (this.shield.current > 0) {
            const shieldDamage = Math.min(amount, this.shield.current);
            this.shield.current -= shieldDamage;
            amount -= shieldDamage;
            this.shield.lastDamageTime = Date.now();
            
            if (amount <= 0) return false; // Shield absorbed all damage
        }
        
        // Apply remaining damage to health
        return super.takeDamage(amount);
    }
    
    draw(ctx) {
        // Draw ship body
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        
        // Ship shape (triangle)
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size * 0.7, -this.size * 0.5);
        ctx.lineTo(-this.size * 0.3, 0);
        ctx.lineTo(-this.size * 0.7, this.size * 0.5);
        ctx.closePath();
        ctx.stroke();
        
        // Draw thrust flame
        if (this.showThrust) {
            ctx.strokeStyle = '#ff8800';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-this.size * 0.7, -this.size * 0.3);
            ctx.lineTo(-this.size * 1.2, 0);
            ctx.lineTo(-this.size * 0.7, this.size * 0.3);
            ctx.stroke();
        }
        
        // Draw shield
        if (this.shield.current > 0) {
            const shieldAlpha = this.shield.current / this.shield.max * 0.3;
            ctx.strokeStyle = `rgba(0, 255, 255, ${shieldAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// Asteroid
class Asteroid extends Entity {
    constructor(x, y, size = 'large', options = {}) {
        const sizeData = Asteroid.getSizeData(size);
        
        super(x, y, {
            type: 'asteroid',
            color: '#888888',
            strokeColor: '#aaaaaa',
            health: { max: sizeData.health },
            physics: {
                mass: sizeData.mass,
                maxVelocity: sizeData.maxVelocity,
                collisionRadius: sizeData.radius,
                damping: 1.0 // No damping for asteroids
            },
            rotationSpeed: Utils.random(-2, 2),
            ...options
        });
        
        this.size = size;
        this.radius = sizeData.radius;
        this.points = this.generateShape();
        this.scoreValue = sizeData.score;
        
        // Give random initial velocity
        const angle = Utils.random(0, Math.PI * 2);
        const speed = Utils.random(20, 60);
        this.physics.velocity.x = Math.cos(angle) * speed;
        this.physics.velocity.y = Math.sin(angle) * speed;
    }
    
    static getSizeData(size) {
        const sizes = {
            large: { radius: 40, health: 100, mass: 3, maxVelocity: 80, score: 20 },
            medium: { radius: 25, health: 50, mass: 2, maxVelocity: 120, score: 50 },
            small: { radius: 15, health: 25, mass: 1, maxVelocity: 160, score: 100 }
        };
        return sizes[size] || sizes.large;
    }
    
    generateShape() {
        const points = [];
        const numPoints = Utils.randomInt(8, 12);
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (Math.PI * 2 * i) / numPoints;
            const radiusVariation = Utils.random(0.7, 1.3);
            const radius = this.radius * radiusVariation;
            
            points.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        
        return points;
    }
    
    destroy() {
        super.destroy();
        
        // Create smaller asteroids when destroyed
        const fragments = this.createFragments();
        return fragments;
    }
    
    createFragments() {
        const fragments = [];
        
        if (this.size === 'large') {
            // Create 2-3 medium asteroids
            const count = Utils.randomInt(2, 3);
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + Utils.random(-0.5, 0.5);
                const distance = this.radius * 0.5;
                const x = this.x + Math.cos(angle) * distance;
                const y = this.y + Math.sin(angle) * distance;
                
                fragments.push(new Asteroid(x, y, 'medium'));
            }
        } else if (this.size === 'medium') {
            // Create 2 small asteroids
            for (let i = 0; i < 2; i++) {
                const angle = (Math.PI * i) + Utils.random(-0.5, 0.5);
                const distance = this.radius * 0.5;
                const x = this.x + Math.cos(angle) * distance;
                const y = this.y + Math.sin(angle) * distance;
                
                fragments.push(new Asteroid(x, y, 'small'));
            }
        }
        
        return fragments;
    }
    
    draw(ctx) {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        
        ctx.closePath();
        ctx.stroke();
    }
}

// Projectile
class Projectile extends Entity {
    constructor(x, y, options = {}) {
        super(x, y, {
            type: 'projectile',
            color: options.color || '#ffff00',
            glow: true,
            physics: {
                mass: 0.1,
                collisionRadius: 3,
                screenWrap: false
            },
            ...options
        });
        
        this.damage = options.damage || 25;
        this.speed = options.speed || 300;
        this.owner = options.owner || null;
        this.lifetime = options.lifetime || 3000; // 3 seconds
        this.age = 0;
        
        // Set initial velocity
        const velocity = Utils.vector.fromAngle(this.rotation, this.speed);
        this.physics.velocity.x = velocity.x;
        this.physics.velocity.y = velocity.y;
        
        // Add owner's velocity for realistic physics
        if (this.owner && this.owner.physics) {
            this.physics.velocity.x += this.owner.physics.velocity.x * 0.5;
            this.physics.velocity.y += this.owner.physics.velocity.y * 0.5;
        }
    }
    
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        this.age += deltaTime;
        
        // Remove projectile after lifetime expires
        if (this.age >= this.lifetime) {
            this.destroy();
        }
        
        // Remove if off-screen (since screen wrap is disabled)
        if (this.x < -50 || this.x > game.canvas.width + 50 ||
            this.y < -50 || this.y > game.canvas.height + 50) {
            this.destroy();
        }
    }
    
    draw(ctx) {
        // Draw projectile as a glowing circle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw trail
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
    }
}

// Export classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Entity, Player, Asteroid, Projectile };
}
