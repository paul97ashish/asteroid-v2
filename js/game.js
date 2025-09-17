// Void Drifter - Main Game Logic

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.state = 'menu'; // menu, playing, paused, gameover
        this.lastTime = 0;
        this.animationFrameId = null;

        // Game components
        this.physics = new PhysicsEngine(this.width, this.height);
        this.particles = new ParticleSystem();
        this.audio = new AudioManager();
        this.ui = new UIManager(this);

        // Game objects
        this.player = null;
        this.entities = [];
        
        // Game state
        this.score = 0;
        this.lives = 3;
        this.wave = 0;
        this.lastGameMode = 'gauntlet';
        this.runStats = { scrap: 0, crystals: 0 };

        // Player progression data
        this.playerData = this.loadPlayerData();

        // Input handling
        this.keys = {};
        this.initInput();

        // Show main menu on start
        this.ui.showMenu('main');
    }

    loadPlayerData() {
        const defaultData = {
            scrap: 0,
            crystals: 0,
            chassis: 'default',
            weapon: 'blaster',
            ability: 'hyperspace',
            unlocked: {
                chassis: ['default'],
                weapons: ['blaster'],
                abilities: ['hyperspace']
            },
            upgrades: {}
        };
        return Utils.storage.load('voidDrifterData', defaultData);
    }

    savePlayerData() {
        Utils.storage.save('voidDrifterData', this.playerData);
    }

    initInput() {
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    }

    startGame(mode) {
        this.lastGameMode = mode;
        this.state = 'playing';
        
        // Reset game state
        this.score = 0;
        this.lives = 3;
        this.wave = 0;
        this.entities = [];
        this.particles.clear();
        this.runStats = { scrap: 0, crystals: 0 };

        // Create player
        this.player = new Player(this.width / 2, this.height / 2);
        this.player.weapon = WeaponFactory.create(this.playerData.weapon, this.player);
        this.player.ability.type = this.playerData.ability;
        this.player.autoFire = true; // Enable auto-fire
        this.player.autoRotate = true; // Enable auto-rotate
        this.addEntity(this.player);

        // UI setup
        this.ui.hideAllMenus();
        this.ui.showHUD();

        // Start game loop
        this.startNextWave();
        if (!this.animationFrameId) {
            this.gameLoop(0);
        }
    }

    endGame() {
        this.state = 'gameover';
        
        // Add earned resources to player data
        this.playerData.scrap += this.runStats.scrap;
        this.playerData.crystals += this.runStats.crystals;
        this.savePlayerData();

        this.ui.hideHUD();
        this.ui.showMenu('gameOver');
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.ui.showMenu('pause');
        } else if (this.state === 'paused') {
            this.state = 'playing';
            this.ui.hideAllMenus();
        }
    }

    startNextWave() {
        this.wave++;
        this.ui.showWaveStart(this.wave);

        // Spawn asteroids
        const asteroidCount = 2 + this.wave;
        for (let i = 0; i < asteroidCount; i++) {
            const x = Math.random() > 0.5 ? 0 : this.width;
            const y = Math.random() * this.height;
            this.addEntity(new Asteroid(x, y, 'large'));
        }

        // Spawn enemies
        if (this.wave > 1) {
            const enemyCount = Math.floor(this.wave / 2);
            for (let i = 0; i < enemyCount; i++) {
                const x = Math.random() * this.width;
                const y = Math.random() > 0.5 ? 0 : this.height;
                const type = EnemyFactory.getRandomType();
                this.addEntity(EnemyFactory.create(type, x, y));
            }
        }
    }

    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.state === 'playing') {
            this.update(deltaTime);
        }
        
        this.render();

        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(deltaTime) {
        // Handle player input
        this.handlePlayerInput();

        // Update all entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            entity.update(deltaTime, this);
            this.physics.updateEntity(entity, deltaTime);

            if (!entity.alive) {
                this.entities.splice(i, 1);
            }
        }

        // Update particles
        this.particles.update(deltaTime, this.width, this.height);

        // Handle collisions
        this.checkCollisions();

        // Check for wave completion
        if (this.isWaveComplete()) {
            this.startNextWave();
        }

        // Update UI
        this.ui.updateHUD();
    }

    handlePlayerInput() {
        if (!this.player || !this.player.alive) return;

        this.player.input.thrust = this.keys['w'] || this.keys['arrowup'];
        this.player.input.rotateLeft = this.keys['a'] || this.keys['arrowleft'];
        this.player.input.rotateRight = this.keys['d'] || this.keys['arrowright'];
        this.player.input.fire = this.keys[' ']; // Space bar
        this.player.input.ability = this.keys['shift'];
        
        if (this.keys['p']) {
            this.togglePause();
            this.keys['p'] = false; // Prevent rapid toggling
        }
    }

    checkCollisions() {
        for (let i = 0; i < this.entities.length; i++) {
            for (let j = i + 1; j < this.entities.length; j++) {
                const e1 = this.entities[i];
                const e2 = this.entities[j];

                if (this.physics.checkCollision(e1, e2)) {
                    this.handleCollision(e1, e2);
                }
            }
        }
    }

    handleCollision(e1, e2) {
        const types = [e1.type, e2.type].sort().join('-');
        
        switch (types) {
            case 'asteroid-player':
                this.playerHit(e1.type === 'player' ? e1 : e2, e1.type === 'asteroid' ? e1 : e2);
                break;
            case 'enemy-player':
                this.playerHit(e1.type === 'player' ? e1 : e2, e1.type === 'enemy' ? e1 : e2);
                break;
            case 'asteroid-projectile':
            case 'enemy-projectile':
                this.projectileHit(
                    e1.type === 'projectile' ? e1 : e2,
                    e1.type !== 'projectile' ? e1 : e2
                );
                break;
            case 'pickup-player':
                this.pickupCollected(
                    e1.type === 'pickup' ? e1 : e2,
                    e1.type === 'player' ? e1 : e2
                );
                break;
            case 'asteroid-asteroid':
            case 'asteroid-enemy':
            case 'enemy-enemy':
                this.physics.handleCollision(e1, e2);
                break;
        }
    }

    playerHit(player, hazard) {
        if (player.takeDamage(25)) {
            this.playerDestroyed();
        }
        ParticleEffects.shieldHit(this.particles, player.x, player.y);
        this.audio.playGenerated('hit');
    }

    projectileHit(projectile, target) {
        if (projectile.owner === target || target.owner === projectile) return;
        
        if (target.takeDamage(projectile.damage)) {
            this.entityDestroyed(target);
        }
        
        projectile.destroy();
        ParticleEffects.sparks(this.particles, projectile.x, projectile.y);
    }
    
    pickupCollected(pickup, player) {
        if (pickup.onCollect) {
            pickup.onCollect(player, this);
        }
    }

    entityDestroyed(entity) {
        this.score += entity.scoreValue || 0;
        ParticleEffects.explosion(this.particles, entity.x, entity.y);
        this.audio.playGenerated('explosion');

        if (entity.destroy) {
            const fragments = entity.destroy();
            if (fragments && fragments.length > 0) {
                fragments.forEach(f => this.addEntity(f));
            }
        }
    }

    playerDestroyed() {
        this.lives--;
        ParticleEffects.explosion(this.particles, this.player.x, this.player.y, { count: 50 });
        this.audio.playGenerated('explosion');

        if (this.lives <= 0) {
            this.endGame();
        } else {
            // Respawn player
            this.player.x = this.width / 2;
            this.player.y = this.height / 2;
            this.player.physics.velocity = { x: 0, y: 0 };
            this.player.heal(this.player.health.max);
            this.player.health.invulnerable = true;
            this.player.health.invulnerabilityTime = 3000;
        }
    }

    isWaveComplete() {
        return this.entities.every(e => e.type === 'player' || e.type === 'projectile' || e.type === 'pickup');
    }

    addEntity(entity) {
        this.entities.push(entity);
    }
    
    addResource(type, amount) {
        if (type === 'scrap') this.runStats.scrap += amount;
        if (type === 'crystal') this.runStats.crystals += amount;
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Render entities
        for (const entity of this.entities) {
            entity.render(this.ctx);
        }

        // Render particles
        this.particles.render(this.ctx);
    }
}

// Export class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}
