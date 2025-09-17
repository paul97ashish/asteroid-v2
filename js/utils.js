// Void Drifter - Utility Functions

// Math utilities
const Utils = {
    // Convert degrees to radians
    toRadians(degrees) {
        return degrees * Math.PI / 180;
    },

    // Convert radians to degrees
    toDegrees(radians) {
        return radians * 180 / Math.PI;
    },

    // Clamp a value between min and max
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    // Linear interpolation
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    },

    // Distance between two points
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    // Angle between two points
    angleBetween(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    // Normalize angle to 0-2π range
    normalizeAngle(angle) {
        while (angle < 0) angle += Math.PI * 2;
        while (angle >= Math.PI * 2) angle -= Math.PI * 2;
        return angle;
    },

    // Random number between min and max
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    // Random integer between min and max (inclusive)
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Random element from array
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    // Screen wrapping for coordinates
    wrapPosition(x, y, width, height) {
        let newX = x;
        let newY = y;

        if (x < 0) newX = width;
        else if (x > width) newX = 0;

        if (y < 0) newY = height;
        else if (y > height) newY = 0;

        return { x: newX, y: newY };
    },

    // Check if point is inside circle
    pointInCircle(px, py, cx, cy, radius) {
        return this.distance(px, py, cx, cy) <= radius;
    },

    // Check collision between two circles
    circleCollision(x1, y1, r1, x2, y2, r2) {
        return this.distance(x1, y1, x2, y2) <= (r1 + r2);
    },

    // Vector operations
    vector: {
        // Create vector from angle and magnitude
        fromAngle(angle, magnitude = 1) {
            return {
                x: Math.cos(angle) * magnitude,
                y: Math.sin(angle) * magnitude
            };
        },

        // Add two vectors
        add(v1, v2) {
            return {
                x: v1.x + v2.x,
                y: v1.y + v2.y
            };
        },

        // Subtract two vectors
        subtract(v1, v2) {
            return {
                x: v1.x - v2.x,
                y: v1.y - v2.y
            };
        },

        // Multiply vector by scalar
        multiply(vector, scalar) {
            return {
                x: vector.x * scalar,
                y: vector.y * scalar
            };
        },

        // Get vector magnitude
        magnitude(vector) {
            return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        },

        // Normalize vector
        normalize(vector) {
            const mag = this.magnitude(vector);
            if (mag === 0) return { x: 0, y: 0 };
            return {
                x: vector.x / mag,
                y: vector.y / mag
            };
        },

        // Dot product
        dot(v1, v2) {
            return v1.x * v2.x + v1.y * v2.y;
        },

        // Rotate vector by angle
        rotate(vector, angle) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return {
                x: vector.x * cos - vector.y * sin,
                y: vector.x * sin + vector.y * cos
            };
        }
    },

    // Color utilities
    color: {
        // Convert HSL to RGB
        hslToRgb(h, s, l) {
            h /= 360;
            s /= 100;
            l /= 100;

            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            let r, g, b;
            if (s === 0) {
                r = g = b = l;
            } else {
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }

            return {
                r: Math.round(r * 255),
                g: Math.round(g * 255),
                b: Math.round(b * 255)
            };
        },

        // Create rgba string
        rgba(r, g, b, a = 1) {
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        },

        // Create hex color string
        hex(r, g, b) {
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        },

        // Interpolate between two colors
        lerp(color1, color2, factor) {
            return {
                r: Math.round(Utils.lerp(color1.r, color2.r, factor)),
                g: Math.round(Utils.lerp(color1.g, color2.g, factor)),
                b: Math.round(Utils.lerp(color1.b, color2.b, factor))
            };
        }
    },

    // Performance utilities
    performance: {
        // Simple FPS counter
        fps: {
            frames: 0,
            lastTime: 0,
            current: 0,
            
            update() {
                this.frames++;
                const now = performance.now();
                if (now - this.lastTime >= 1000) {
                    this.current = Math.round((this.frames * 1000) / (now - this.lastTime));
                    this.frames = 0;
                    this.lastTime = now;
                }
            }
        },

        // Simple timer
        timer: class {
            constructor(duration) {
                this.duration = duration;
                this.elapsed = 0;
                this.active = false;
            }

            start() {
                this.active = true;
                this.elapsed = 0;
            }

            update(deltaTime) {
                if (!this.active) return false;
                
                this.elapsed += deltaTime;
                if (this.elapsed >= this.duration) {
                    this.active = false;
                    return true;
                }
                return false;
            }

            getProgress() {
                return this.active ? this.elapsed / this.duration : 0;
            }

            getRemainingTime() {
                return this.active ? Math.max(0, this.duration - this.elapsed) : 0;
            }
        }
    },

    // Local storage utilities
    storage: {
        // Save data to localStorage
        save(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (e) {
                console.warn('Failed to save to localStorage:', e);
                return false;
            }
        },

        // Load data from localStorage
        load(key, defaultValue = null) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : defaultValue;
            } catch (e) {
                console.warn('Failed to load from localStorage:', e);
                return defaultValue;
            }
        },

        // Remove data from localStorage
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('Failed to remove from localStorage:', e);
                return false;
            }
        }
    },

    // Debug utilities
    debug: {
        enabled: false,
        
        log(...args) {
            if (this.enabled) {
                console.log('[DEBUG]', ...args);
            }
        },

        warn(...args) {
            if (this.enabled) {
                console.warn('[DEBUG]', ...args);
            }
        },

        error(...args) {
            if (this.enabled) {
                console.error('[DEBUG]', ...args);
            }
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
