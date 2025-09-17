// Void Drifter - UI Manager

class UIManager {
    constructor(game) {
        this.game = game;
        this.elements = {};
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        // Main menus
        this.elements.mainMenu = document.getElementById('mainMenu');
        this.elements.hangarMenu = document.getElementById('hangarMenu');
        this.elements.controlsMenu = document.getElementById('controlsMenu');
        this.elements.gameOverMenu = document.getElementById('gameOverMenu');
        this.elements.pauseMenu = document.getElementById('pauseMenu');

        // HUD elements
        this.elements.hud = document.getElementById('hud');
        this.elements.livesCount = document.getElementById('livesCount');
        this.elements.scoreValue = document.getElementById('scoreValue');
        this.elements.waveNumber = document.getElementById('waveNumber');
        this.elements.shieldBar = document.getElementById('shieldBar');
        this.elements.heatBar = document.getElementById('heatBar');
        this.elements.abilityCooldown = document.getElementById('abilityCooldown');

        // Game Over stats
        this.elements.finalScore = document.getElementById('finalScore');
        this.elements.finalWave = document.getElementById('finalWave');
        this.elements.earnedScrap = document.getElementById('earnedScrap');
        this.elements.earnedCrystals = document.getElementById('earnedCrystals');

        // Hangar elements
        this.elements.scrapCount = document.getElementById('scrapCount');
        this.elements.crystalCount = document.getElementById('crystalCount');
        this.elements.chassisOptions = document.getElementById('chassisOptions');
        this.elements.weaponOptions = document.getElementById('weaponOptions');
        this.elements.abilityOptions = document.getElementById('abilityOptions');
    }

    initEventListeners() {
        // Main Menu buttons
        document.getElementById('startGauntlet').addEventListener('click', () => {
            console.log('Gauntlet Mode button clicked');
            this.game.startGame('gauntlet');
        });
        document.getElementById('startClassic').addEventListener('click', () => this.game.startGame('classic'));
        document.getElementById('openHangar').addEventListener('click', () => this.showMenu('hangar'));
        document.getElementById('showControls').addEventListener('click', () => this.showMenu('controls'));

        // Hangar buttons
        document.getElementById('backToMenu').addEventListener('click', () => this.showMenu('main'));

        // Controls buttons
        document.getElementById('backFromControls').addEventListener('click', () => this.showMenu('main'));

        // Game Over buttons
        document.getElementById('playAgain').addEventListener('click', () => this.game.startGame(this.game.lastGameMode));
        document.getElementById('backToMenuFromGameOver').addEventListener('click', () => this.showMenu('main'));

        // Pause Menu buttons
        document.getElementById('resumeGame').addEventListener('click', () => this.game.togglePause());
        document.getElementById('backToMenuFromPause').addEventListener('click', () => {
            this.game.togglePause();
            this.game.endGame();
        });
    }

    showMenu(menuName) {
        // Hide all menus
        for (const key in this.elements) {
            if (key.endsWith('Menu')) {
                this.elements[key].classList.add('hidden');
            }
        }

        // Show the specified menu
        switch (menuName) {
            case 'main':
                this.elements.mainMenu.classList.remove('hidden');
                break;
            case 'hangar':
                this.updateHangar();
                this.elements.hangarMenu.classList.remove('hidden');
                break;
            case 'controls':
                this.elements.controlsMenu.classList.remove('hidden');
                break;
            case 'gameOver':
                this.updateGameOverStats();
                this.elements.gameOverMenu.classList.remove('hidden');
                break;
            case 'pause':
                this.elements.pauseMenu.classList.remove('hidden');
                break;
        }
    }

    hideAllMenus() {
        for (const key in this.elements) {
            if (key.endsWith('Menu')) {
                this.elements[key].classList.add('hidden');
            }
        }
    }

    showHUD() {
        this.elements.hud.classList.remove('hidden');
    }

    hideHUD() {
        this.elements.hud.classList.add('hidden');
    }

    updateHUD() {
        if (!this.game.player) return;

        // Update score, lives, wave
        this.elements.scoreValue.textContent = this.game.score;
        this.elements.livesCount.textContent = this.game.lives;
        this.elements.waveNumber.textContent = this.game.wave;

        // Update player-specific stats
        const player = this.game.player;

        // Shield bar
        const shieldPercent = (player.shield.current / player.shield.max) * 100;
        this.elements.shieldBar.style.setProperty('--fill-width', `${shieldPercent}%`);

        // Weapon heat bar
        const heatPercent = (player.weapon.heat / player.weapon.maxHeat) * 100;
        this.elements.heatBar.style.setProperty('--fill-width', `${heatPercent}%`);
        if (player.weapon.overheated) {
            this.elements.heatBar.classList.add('overheated'); // Add a class for styling
        } else {
            this.elements.heatBar.classList.remove('overheated');
        }

        // Ability cooldown
        const cooldownProgress = player.ability.cooldown / player.ability.maxCooldown;
        const cooldownAngle = 360 * cooldownProgress;
        this.elements.abilityCooldown.style.setProperty('--cooldown-angle', `${cooldownAngle}deg`);
    }

    updateGameOverStats() {
        this.elements.finalScore.textContent = this.game.score;
        this.elements.finalWave.textContent = this.game.wave;
        this.elements.earnedScrap.textContent = this.game.runStats.scrap;
        this.elements.earnedCrystals.textContent = this.game.runStats.crystals;
    }

    updateHangar() {
        // Update resource counts
        this.elements.scrapCount.textContent = this.game.playerData.scrap;
        this.elements.crystalCount.textContent = this.game.playerData.crystals;

        // Populate chassis options
        this.populateHangarOptions(this.elements.chassisOptions, this.game.playerData.chassis, this.game.playerData.unlocked.chassis);

        // Populate weapon options
        this.populateHangarOptions(this.elements.weaponOptions, this.game.playerData.weapon, this.game.playerData.unlocked.weapons);

        // Populate ability options
        this.populateHangarOptions(this.elements.abilityOptions, this.game.playerData.ability, this.game.playerData.unlocked.abilities);
    }

    populateHangarOptions(container, currentSelection, unlockedItems) {
        container.innerHTML = '';
        
        unlockedItems.forEach(item => {
            const button = document.createElement('button');
            button.textContent = item.replace('_', ' ').toUpperCase();
            button.classList.add('option-button');
            
            if (item === currentSelection) {
                button.classList.add('selected');
            }
            
            button.addEventListener('click', () => {
                // Update player data and UI
                if (container === this.elements.chassisOptions) this.game.playerData.chassis = item;
                if (container === this.elements.weaponOptions) this.game.playerData.weapon = item;
                if (container === this.elements.abilityOptions) this.game.playerData.ability = item;
                
                this.updateHangar();
            });
            
            container.appendChild(button);
        });
    }

    // Methods for showing in-game messages
    showMessage(text, duration = 3000, style = {}) {
        const messageElement = document.createElement('div');
        messageElement.textContent = text;
        messageElement.classList.add('game-message');
        
        // Apply custom styles
        Object.assign(messageElement.style, {
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffff00',
            textShadow: '0 0 10px #ffff00',
            zIndex: 200,
            ...style
        });
        
        document.getElementById('gameContainer').appendChild(messageElement);
        
        setTimeout(() => {
            messageElement.remove();
        }, duration);
    }

    showWaveStart(waveNumber) {
        this.showMessage(`WAVE ${waveNumber}`, 2000, {
            fontSize: '36px',
            color: '#00ffff'
        });
    }
}

// Export class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
