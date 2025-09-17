// Void Drifter - Power-ups and Pickups

// Base Pickup class
class Pickup extends Entity {
    constructor(x, y, type, options = {}) {
        super(x, y, {
            type: 'pickup',
            physics: {
                mass: 0.2,
                collisionRadius: 10,
                damping: 0.95
            },
            ...options
        });
        
        this.pickupType = type;
        this.lifetime = options.lifetime || 10000; // 10 seconds
        this.magnetRadius = 100;
        this.magnetForce = 200;
        
        // Give random initial velocity
        const angle = Utils.random(0, Math.PI * 2);
        const speed = Utils.random(50, 100);
        this.physics.velocity.x = Math.cos(angle) * speed;
        this.physics.velocity.y = Math.sin(angle) * speed;
    }
    
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.destroy();
        }
        
        // Magnet effect towards player
        if (game.player && game.player.alive) {
            const distance = Utils.distance(this.x, this.y, game.player.x, game.player.y);
            if (distance < this.magnetRadius) {
                const angle = Utils.angleBetween(this.x, this.y, game.player.x, game.player.y);
                const force = Utils.vector.fromAngle(angle, this.magnetForce);
                game.physics.applyForce(this, force.x, force.y);
            }
        }
    }
    
    onCollect(player) {
        // To be implemented by subclasses
        this.destroy();
    }
    
    draw(ctx) {
        // To be implemented by subclasses
    }
}

// Power-up Pickup
class Powerup extends Pickup {
    constructor(x, y, powerupType, options = {}) {
        super(x, y, 'powerup', {
            glow: true,
            ...options
        });
        
        this.powerupType = powerupType;
        this.duration = options.duration || 15000; // 15 seconds
        
        const powerupData = Powerup.getData(powerupType);
        this.color = powerupData.color;
        this.symbol = powerupData.symbol;
    }
    
    static getData(type) {
        const data = {
            rapid_fire: { color: '#ffff00', symbol: '🔥' },
            spread_shot: { color: '#00ff00', symbol: '🚀' },
            aegis_shield: { color: '#00ffff', symbol: '🛡️' }
        };
        return data[type] || { color: '#ffffff', symbol: '?' };
    }
    
    onCollect(player, game) {
        super.onCollect(player);
        
        game.activatePowerup(this.powerupType, this.duration);
        
        if (game.audio) game.audio.play('powerup');
    }
    
    draw(ctx) {
        // Draw glowing circle
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw symbol
        ctx.fillStyle = this.color;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, 0, 0);
    }
}

// Resource Pickup
class Resource extends Pickup {
    constructor(x, y, resourceType, options = {}) {
        super(x, y, 'resource', {
            ...options
        });
        
        this.resourceType = resourceType;
        
        const resourceData = Resource.getData(resourceType);
        this.color = resourceData.color;
        this.shape = resourceData.shape;
    }
    
    static getData(type) {
        const data = {
            scrap: { color: '#888888', shape: 'square' },
            crystal: { color: '#ff00ff', shape: 'diamond' }
        };
        return data[type] || { color: '#ffffff', shape: 'circle' };
    }
    
    onCollect(player, game) {
        super.onCollect(player);
        
        game.addResource(this.resourceType, 1);
        
        if (game.audio) game.audio.play('pickup');
    }
    
    draw(ctx) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        switch (this.shape) {
            case 'square':
                ctx.rect(-5, -5, 10, 10);
                break;
            case 'diamond':
                ctx.moveTo(0, -6);
                ctx.lineTo(6, 0);
                ctx.lineTo(0, 6);
                ctx.lineTo(-6, 0);
                ctx.closePath();
                break;
            default:
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                break;
        }
        
        ctx.stroke();
    }
}

// Pickup factory
const PickupFactory = {
    create(type, x, y, options = {}) {
        switch (type) {
            case 'rapid_fire':
            case 'spread_shot':
            case 'aegis_shield':
                return new Powerup(x, y, type, options);
            case 'scrap':
            case 'crystal':
                return new Resource(x, y, type, options);
            default:
                return null;
        }
    },
    
    spawnRandomPowerup(x, y) {
        const types = ['rapid_fire', 'spread_shot', 'aegis_shield'];
        const randomType = Utils.randomChoice(types);
        return new Powerup(x, y, randomType);
    }
};

// Export classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Pickup, Powerup, Resource, PickupFactory };
}
