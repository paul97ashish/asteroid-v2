// Void Drifter - Enemy AI

// Base Enemy class
class Enemy extends Entity {
    constructor(x, y, options = {}) {
        super(x, y, {
            type: 'enemy',
            ...options
        });
        
        this.scoreValue = options.scoreValue || 50;
        this.state = 'idle';
        this.stateTimer = 0;
        this.target = null;
        
        // Loot drops
        this.loot = options.loot || {
            scrap: { chance: 0.8, amount: [5, 15] },
            crystal: { chance: 0.1, amount: [1, 3] }
        };
    }
    
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        this.stateTimer += deltaTime;
        
        // Find target if none exists
        if (!this.target || !this.target.alive) {
            this.target = game.player;
        }
        
        // Run AI behavior
        this.ai(deltaTime, game);
    }
    
    ai(deltaTime, game) {
        // To be implemented by subclasses
    }
    
    destroy() {
        super.destroy();
        
        // Drop loot
        const drops = this.createLoot();
        return drops;
    }
    
    createLoot() {
        const drops = [];
        
        // Scrap Metal
        if (Math.random() < this.loot.scrap.chance) {
            const amount = Utils.randomInt(this.loot.scrap.amount[0], this.loot.scrap.amount[1]);
            for (let i = 0; i < amount; i++) {
                drops.push(new Pickup(this.x, this.y, 'scrap'));
            }
        }
        
        // Quantum Crystals
        if (Math.random() < this.loot.crystal.chance) {
            const amount = Utils.randomInt(this.loot.crystal.amount[0], this.loot.crystal.amount[1]);
            for (let i = 0; i < amount; i++) {
                drops.push(new Pickup(this.x, this.y, 'crystal'));
            }
        }
        
        return drops;
    }
}

// Scout Saucer
class ScoutSaucer extends Enemy {
    constructor(x, y, options = {}) {
        super(x, y, {
            color: '#ff4444',
            strokeColor: '#ff8888',
            glow: true,
            health: { max: 30 },
            physics: {
                mass: 0.5,
                maxVelocity: 150,
                collisionRadius: 15,
                damping: 0.95
            },
            scoreValue: 150,
            ...options
        });
        
        this.size = 15;
        this.weapon = new Blaster(this, {
            fireRate: 1500,
            damage: 15,
            projectileSpeed: 200,
            projectileColor: '#ff4444'
        });
    }
    
    ai(deltaTime, game) {
        // Erratic movement
        if (this.stateTimer > 2000) {
            const wanderForce = PhysicsBehaviors.wander(this, 50, 100, 0.5);
            game.physics.applyForce(this, wanderForce.x * 100, wanderForce.y * 100);
            this.stateTimer = 0;
        }
        
        // Fire in random directions
        if (this.weapon.canFire()) {
            this.rotation = Utils.random(0, Math.PI * 2);
            this.weapon.fire(game);
        }
    }
    
    draw(ctx) {
        // Saucer shape
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.lineWidth;
        
        // Bottom hull
        ctx.beginPath();
        ctx.moveTo(-this.size, 0);
        ctx.quadraticCurveTo(0, this.size * 0.5, this.size, 0);
        ctx.stroke();
        
        // Top dome
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.7, 0);
        ctx.quadraticCurveTo(0, -this.size, this.size * 0.7, 0);
        ctx.stroke();
    }
}

// Hunter Drone
class HunterDrone extends Enemy {
    constructor(x, y, options = {}) {
        super(x, y, {
            color: '#ffaa00',
            strokeColor: '#ffff00',
            glow: true,
            health: { max: 60 },
            physics: {
                mass: 0.8,
                maxVelocity: 100,
                collisionRadius: 18,
                damping: 0.98
            },
            scoreValue: 300,
            ...options
        });
        
        this.size = 18;
        this.weapon = new Blaster(this, {
            fireRate: 1000,
            damage: 20,
            projectileSpeed: 300,
            projectileColor: '#ffaa00'
        });
        
        this.optimalRange = 250;
        this.rangeTolerance = 50;
    }
    
    ai(deltaTime, game) {
        if (!this.target) return;
        
        const distanceToTarget = Utils.distance(this.x, this.y, this.target.x, this.target.y);
        
        // Maintain optimal range
        if (distanceToTarget > this.optimalRange + this.rangeTolerance) {
            // Move towards target
            const seekForce = PhysicsBehaviors.seek(this, this.target.x, this.target.y, 1);
            game.physics.applyForce(this, seekForce.x * 150, seekForce.y * 150);
        } else if (distanceToTarget < this.optimalRange - this.rangeTolerance) {
            // Move away from target
            const fleeForce = PhysicsBehaviors.flee(this, this.target.x, this.target.y, 1);
            game.physics.applyForce(this, fleeForce.x * 150, fleeForce.y * 150);
        }
        
        // Aim at target
        this.rotation = Utils.angleBetween(this.x, this.y, this.target.x, this.target.y);
        
        // Fire at target
        if (this.weapon.canFire()) {
            this.weapon.fire(game);
        }
    }
    
    draw(ctx) {
        // Drone shape (diamond)
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(0, -this.size * 0.7);
        ctx.lineTo(-this.size, 0);
        ctx.lineTo(0, this.size * 0.7);
        ctx.closePath();
        ctx.stroke();
        
        // Inner eye
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Marauder Frigate
class MarauderFrigate extends Enemy {
    constructor(x, y, options = {}) {
        super(x, y, {
            color: '#aa00ff',
            strokeColor: '#ff00ff',
            glow: true,
            health: { max: 200 },
            physics: {
                mass: 2.5,
                maxVelocity: 60,
                collisionRadius: 30,
                damping: 0.99
            },
            scoreValue: 800,
            ...options
        });
        
        this.size = 30;
        this.weapon = new SpreadShot(this, {
            fireRate: 2500,
            damage: 25,
            projectiles: 3,
            spread: 0.3,
            projectileSpeed: 250,
            projectileColor: '#aa00ff'
        });
    }
    
    ai(deltaTime, game) {
        if (!this.target) return;
        
        // Slowly move towards player
        const seekForce = PhysicsBehaviors.seek(this, this.target.x, this.target.y, 0.5);
        game.physics.applyForce(this, seekForce.x * 100, seekForce.y * 100);
        
        // Aim at player
        this.rotation = Utils.angleBetween(this.x, this.y, this.target.x, this.target.y);
        
        // Fire burst of projectiles
        if (this.weapon.canFire()) {
            this.weapon.fire(game);
        }
    }
    
    draw(ctx) {
        // Frigate shape (chevron)
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size * 0.5, -this.size * 0.8);
        ctx.lineTo(-this.size, 0);
        ctx.lineTo(-this.size * 0.5, this.size * 0.8);
        ctx.closePath();
        ctx.stroke();
        
        // Side cannons
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.2, -this.size * 0.5);
        ctx.lineTo(this.size * 0.3, -this.size * 0.5);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.2, this.size * 0.5);
        ctx.lineTo(this.size * 0.3, this.size * 0.5);
        ctx.stroke();
    }
}

// Enemy factory
const EnemyFactory = {
    create(type, x, y, options = {}) {
        switch (type) {
            case 'scout_saucer':
                return new ScoutSaucer(x, y, options);
            case 'hunter_drone':
                return new HunterDrone(x, y, options);
            case 'marauder_frigate':
                return new MarauderFrigate(x, y, options);
            default:
                return new ScoutSaucer(x, y, options);
        }
    },
    
    getRandomType() {
        const types = ['scout_saucer', 'hunter_drone', 'marauder_frigate'];
        return Utils.randomChoice(types);
    }
};

// Export classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Enemy, ScoutSaucer, HunterDrone, MarauderFrigate, EnemyFactory };
}
