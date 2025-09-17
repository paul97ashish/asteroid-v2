// Void Drifter - Audio Manager

class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {};
        this.music = {};
        this.masterVolume = 0.7;
        this.sfxVolume = 1.0;
        this.musicVolume = 0.5;
        this.isMuted = false;
    }

    // Load a single sound effect
    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds[name] = audioBuffer;
        } catch (error) {
            console.error(`Failed to load sound: ${name}`, error);
        }
    }

    // Load multiple sound effects
    async loadSounds(soundList) {
        const promises = [];
        for (const name in soundList) {
            promises.push(this.loadSound(name, soundList[name]));
        }
        await Promise.all(promises);
    }

    // Play a sound effect
    play(name, options = {}) {
        if (!this.sounds[name] || this.isMuted) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.sounds[name];

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = (options.volume || 1.0) * this.sfxVolume * this.masterVolume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        if (options.loop) {
            source.loop = true;
        }

        if (options.playbackRate) {
            source.playbackRate.value = options.playbackRate;
        }

        source.start(0);
        return source;
    }

    // Load a music track
    loadMusic(name, url) {
        const audio = new Audio(url);
        audio.loop = true;
        this.music[name] = audio;
    }

    // Play a music track
    playMusic(name) {
        if (!this.music[name] || this.isMuted) return;

        this.stopAllMusic();
        const music = this.music[name];
        music.volume = this.musicVolume * this.masterVolume;
        music.currentTime = 0;
        music.play().catch(e => console.warn("Music play failed:", e));
    }

    // Stop a music track
    stopMusic(name) {
        if (this.music[name]) {
            this.music[name].pause();
            this.music[name].currentTime = 0;
        }
    }

    // Stop all music
    stopAllMusic() {
        for (const name in this.music) {
            this.stopMusic(name);
        }
    }

    // Set master volume
    setMasterVolume(volume) {
        this.masterVolume = Utils.clamp(volume, 0, 1);
        this.updateAllVolumes();
    }

    // Set SFX volume
    setSfxVolume(volume) {
        this.sfxVolume = Utils.clamp(volume, 0, 1);
    }

    // Set music volume
    setMusicVolume(volume) {
        this.musicVolume = Utils.clamp(volume, 0, 1);
        this.updateAllVolumes();
    }

    // Update volumes of playing music
    updateAllVolumes() {
        for (const name in this.music) {
            this.music[name].volume = this.musicVolume * this.masterVolume;
        }
    }

    // Mute/unmute all audio
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopAllMusic();
        }
        return this.isMuted;
    }

    // Generate simple synth sounds (fallback if assets fail to load)
    generateSynthSound(type) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume, now);

        switch (type) {
            case 'laser':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(880, now);
                oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                break;
            case 'explosion':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(440, now);
                oscillator.frequency.exponentialRampToValueAtTime(55, now + 0.3);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                break;
            case 'pickup':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, now);
                oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                break;
            case 'hit':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(330, now);
                oscillator.frequency.exponentialRampToValueAtTime(110, now + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                break;
        }

        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }

    // Play generated sound if buffer is missing
    playGenerated(name) {
        if (this.isMuted) return;
        
        if (this.sounds[name]) {
            this.play(name);
        } else {
            this.generateSynthSound(name);
        }
    }
}

// Export class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
}
