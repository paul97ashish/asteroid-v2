// Void Drifter - Weapon Systems

// Base Weapon class
class Weapon {
    constructor(owner, options = {}) {
        this.owner = owner;
        this.fireRate = options.fireRate || 500; // ms
        this.lastFired = 0;
        this.damage = options.damage || 10;
        this.projectileSpeed = options.projectileSpeed || 300;
        this.projectileLifetime = options.projectileLifetime || 2000; // ms
        this.projectileColor = options.projectileColor || '#00ff00';
        this.heatPerShot = options.heatPerShot || 10;
    }
    
    canFire() {
        const now = Date.now();
        return now - this.lastFired >= this.fireRate;
    }
    
    fire(game) {
        if (!this.canFire()) return;
        
        this.lastFired = Date.now();
        
        // To be implemented by subclasses
    }
}

// Standard Blaster
class Blaster extends Weapon {
    constructor(owner, options = {}) {
        super(owner, {
            fireRate: 200,
            damage: 20,
            projectileSpeed: 400,
            projectileColor: '#00ffff',
            heatPerShot: 12,
            ...options
        });
    }
    
    fire(game) {
        if (!this.canFire()) return;
        
        super.fire(game);
        
        const projectileX = this.owner.x + Math.cos(this.owner.rotation) * this.owner.size;
        const projectileY = this.owner.y + Math.sin(this.owner.rotation) * this.owner.size;
        
        const projectile = new Projectile(projectileX, projectileY, {
            rotation: this.owner.rotation,
            owner: this.owner,
            damage: this.damage,
            speed: this.projectileSpeed,
            lifetime: this.projectileLifetime,
            color: this.projectileColor
        });
        
        game.addEntity(projectile);
        
        if (game.audio) game.audio.play('laser');
    }
}

// Plasma Cannon
class PlasmaCannon extends Weapon {
    constructor(owner, options = {}) {
        super(owner, {
            fireRate: 800,
            damage: 80,
            projectileSpeed: 250,
            projectileColor: '#ff00ff',
            heatPerShot: 35,
            ...options
        });
    }
    
    fire(game) {
        if (!this.canFire()) return;
        
        super.fire(game);
        
        const projectileX = this.owner.x + Math.cos(this.owner.rotation) * this.owner.size;
        const projectileY = this.owner.y + Math.sin(this.owner.rotation) * this.owner.size;
        
        const projectile = new Projectile(projectileX, projectileY, {
            rotation: this.owner.rotation,
            owner: this.owner,
            damage: this.damage,
            speed: this.projectileSpeed,
            lifetime: this.projectileLifetime,
            color: this.projectileColor,
            physics: {
                collisionRadius: 8
            },
            draw: (ctx) => { // Custom draw function for plasma ball
                ctx.fillStyle = this.projectileColor;
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        });
        
        game.addEntity(projectile);
        
        if (game.audio) game.audio.play('plasma');
    }
}

// Laser Gatling
class LaserGatling extends Weapon {
    constructor(owner, options = {}) {
        super(owner, {
            fireRate: 80,
            damage: 8,
            projectileSpeed: 600,
            projectileColor: '#ff4444',
            heatPerShot: 5,
            spread: 0.1, // radians
            ...options
        });
    }
    
    fire(game) {
        if (!this.canFire()) return;
        
        super.fire(game);
        
        const projectileX = this.owner.x + Math.cos(this.owner.rotation) * this.owner.size;
        const projectileY = this.owner.y + Math.sin(this.owner.rotation) * this.owner.size;
        
        const angle = this.owner.rotation + Utils.random(-this.spread, this.spread);
        
        const projectile = new Projectile(projectileX, projectileY, {
            rotation: angle,
            owner: this.owner,
            damage: this.damage,
            speed: this.projectileSpeed,
            lifetime: this.projectileLifetime,
            color: this.projectileColor,
            draw: (ctx) => { // Custom draw for thin laser bolt
                ctx.strokeStyle = this.projectileColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-10, 0);
                ctx.lineTo(0, 0);
                ctx.stroke();
            }
        });
        
        game.addEntity(projectile);
        
        if (game.audio) game.audio.play('gatling');
    }
}

// Spread Shot
class SpreadShot extends Weapon {
    constructor(owner, options = {}) {
        super(owner, {
            fireRate: 600,
            damage: 15,
            projectileSpeed: 350,
            projectileColor: '#ffff00',
            heatPerShot: 25,
            projectiles: 3,
            spread: 0.5, // radians
            ...options
        });
    }
    
    fire(game) {
        if (!this.canFire()) return;
        
        super.fire(game);
        
        const baseAngle = this.owner.rotation;
        const angleStep = this.spread / (this.projectiles - 1);
        
        for (let i = 0; i < this.projectiles; i++) {
            const angle = baseAngle - this.spread / 2 + angleStep * i;
            
            const projectileX = this.owner.x + Math.cos(angle) * this.owner.size;
            const projectileY = this.owner.y + Math.sin(angle) * this.owner.size;
            
            const projectile = new Projectile(projectileX, projectileY, {
                rotation: angle,
                owner: this.owner,
                damage: this.damage,
                speed: this.projectileSpeed,
                lifetime: this.projectileLifetime,
                color: this.projectileColor
            });
            
            game.addEntity(projectile);
        }
        
        if (game.audio) game.audio.play('spread');
    }
}

// Weapon factory
const WeaponFactory = {
    create(type, owner, options = {}) {
        switch (type) {
            case 'blaster':
                return new Blaster(owner, options);
            case 'plasma_cannon':
                return new PlasmaCannon(owner, options);
            case 'laser_gatling':
                return new LaserGatling(owner, options);
            case 'spread_shot':
                return new SpreadShot(owner, options);
            default:
                return new Blaster(owner, options);
        }
    }
};

// Export classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Weapon, Blaster, PlasmaCannon, LaserGatling, SpreadShot, WeaponFactory };
}
