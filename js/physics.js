// Void Drifter - Physics Engine

class PhysicsEngine {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.gravity = { x: 0, y: 0 }; // No gravity in space
        this.damping = 0.99; // Slight damping for realistic feel
    }

    // Update physics for an entity
    updateEntity(entity, deltaTime) {
        if (!entity.physics) return;

        const dt = deltaTime / 1000; // Convert to seconds
        const physics = entity.physics;

        // Apply forces to acceleration
        physics.acceleration.x = physics.force.x / physics.mass;
        physics.acceleration.y = physics.force.y / physics.mass;

        // Update velocity with acceleration
        physics.velocity.x += physics.acceleration.x * dt;
        physics.velocity.y += physics.acceleration.y * dt;

        // Apply damping
        physics.velocity.x *= physics.damping || this.damping;
        physics.velocity.y *= physics.damping || this.damping;

        // Limit maximum velocity
        if (physics.maxVelocity) {
            const speed = Utils.vector.magnitude(physics.velocity);
            if (speed > physics.maxVelocity) {
                const normalized = Utils.vector.normalize(physics.velocity);
                physics.velocity.x = normalized.x * physics.maxVelocity;
                physics.velocity.y = normalized.y * physics.maxVelocity;
            }
        }

        // Update position with velocity
        entity.x += physics.velocity.x * dt;
        entity.y += physics.velocity.y * dt;

        // Handle screen wrapping
        if (physics.screenWrap) {
            const wrapped = Utils.wrapPosition(entity.x, entity.y, this.width, this.height);
            entity.x = wrapped.x;
            entity.y = wrapped.y;
        }

        // Reset forces for next frame
        physics.force.x = 0;
        physics.force.y = 0;
    }

    // Apply force to an entity
    applyForce(entity, forceX, forceY) {
        if (!entity.physics) return;
        
        entity.physics.force.x += forceX;
        entity.physics.force.y += forceY;
    }

    // Apply thrust in the direction the entity is facing
    applyThrust(entity, thrust) {
        if (!entity.physics) return;

        const thrustVector = Utils.vector.fromAngle(entity.rotation, thrust);
        this.applyForce(entity, thrustVector.x, thrustVector.y);
    }

    // Check collision between two circular entities
    checkCollision(entity1, entity2) {
        if (!entity1.physics || !entity2.physics) return false;
        if (!entity1.physics.collisionRadius || !entity2.physics.collisionRadius) return false;

        return Utils.circleCollision(
            entity1.x, entity1.y, entity1.physics.collisionRadius,
            entity2.x, entity2.y, entity2.physics.collisionRadius
        );
    }

    // Handle elastic collision between two entities
    handleCollision(entity1, entity2) {
        if (!this.checkCollision(entity1, entity2)) return;

        const dx = entity2.x - entity1.x;
        const dy = entity2.y - entity1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return; // Avoid division by zero

        // Normalize collision vector
        const nx = dx / distance;
        const ny = dy / distance;

        // Separate entities to prevent overlap
        const overlap = (entity1.physics.collisionRadius + entity2.physics.collisionRadius) - distance;
        if (overlap > 0) {
            const separation = overlap / 2;
            entity1.x -= nx * separation;
            entity1.y -= ny * separation;
            entity2.x += nx * separation;
            entity2.y += ny * separation;
        }

        // Calculate relative velocity
        const relativeVelocityX = entity2.physics.velocity.x - entity1.physics.velocity.x;
        const relativeVelocityY = entity2.physics.velocity.y - entity1.physics.velocity.y;

        // Calculate relative velocity along collision normal
        const velocityAlongNormal = relativeVelocityX * nx + relativeVelocityY * ny;

        // Don't resolve if velocities are separating
        if (velocityAlongNormal > 0) return;

        // Calculate restitution (bounciness)
        const restitution = Math.min(entity1.physics.restitution || 0.8, entity2.physics.restitution || 0.8);

        // Calculate impulse scalar
        const impulseScalar = -(1 + restitution) * velocityAlongNormal;
        const totalMass = entity1.physics.mass + entity2.physics.mass;
        const impulse = impulseScalar / totalMass;

        // Apply impulse
        const impulseX = impulse * nx;
        const impulseY = impulse * ny;

        entity1.physics.velocity.x -= impulseX * entity2.physics.mass;
        entity1.physics.velocity.y -= impulseY * entity2.physics.mass;
        entity2.physics.velocity.x += impulseX * entity1.physics.mass;
        entity2.physics.velocity.y += impulseY * entity1.physics.mass;
    }

    // Create physics component for an entity
    static createPhysicsComponent(options = {}) {
        return {
            mass: options.mass || 1,
            velocity: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            force: { x: 0, y: 0 },
            damping: options.damping || 0.99,
            maxVelocity: options.maxVelocity || null,
            collisionRadius: options.collisionRadius || 0,
            restitution: options.restitution || 0.8,
            screenWrap: options.screenWrap !== false, // Default to true
            isStatic: options.isStatic || false
        };
    }
}

// Specialized physics behaviors
class PhysicsBehaviors {
    // Orbital motion around a point
    static orbital(entity, centerX, centerY, radius, speed) {
        if (!entity.orbitalAngle) entity.orbitalAngle = 0;
        
        entity.orbitalAngle += speed;
        entity.x = centerX + Math.cos(entity.orbitalAngle) * radius;
        entity.y = centerY + Math.sin(entity.orbitalAngle) * radius;
    }

    // Seek behavior - move towards a target
    static seek(entity, targetX, targetY, maxForce = 1) {
        if (!entity.physics) return;

        const desired = {
            x: targetX - entity.x,
            y: targetY - entity.y
        };

        const distance = Utils.vector.magnitude(desired);
        if (distance === 0) return;

        // Normalize and scale to maximum speed
        const maxSpeed = entity.physics.maxVelocity || 100;
        desired.x = (desired.x / distance) * maxSpeed;
        desired.y = (desired.y / distance) * maxSpeed;

        // Calculate steering force
        const steer = {
            x: desired.x - entity.physics.velocity.x,
            y: desired.y - entity.physics.velocity.y
        };

        // Limit steering force
        const steerMag = Utils.vector.magnitude(steer);
        if (steerMag > maxForce) {
            steer.x = (steer.x / steerMag) * maxForce;
            steer.y = (steer.y / steerMag) * maxForce;
        }

        return steer;
    }

    // Flee behavior - move away from a target
    static flee(entity, targetX, targetY, maxForce = 1) {
        const seekForce = this.seek(entity, targetX, targetY, maxForce);
        if (seekForce) {
            return {
                x: -seekForce.x,
                y: -seekForce.y
            };
        }
        return null;
    }

    // Wander behavior - random movement
    static wander(entity, wanderRadius = 50, wanderDistance = 100, wanderAngle = 0.3) {
        if (!entity.wanderAngle) entity.wanderAngle = 0;

        // Update wander angle
        entity.wanderAngle += Utils.random(-wanderAngle, wanderAngle);

        // Calculate circle center in front of entity
        const circleCenter = Utils.vector.fromAngle(entity.rotation, wanderDistance);
        circleCenter.x += entity.x;
        circleCenter.y += entity.y;

        // Calculate displacement force
        const displacement = Utils.vector.fromAngle(entity.wanderAngle, wanderRadius);

        // Calculate wander force
        const wanderForce = {
            x: circleCenter.x + displacement.x - entity.x,
            y: circleCenter.y + displacement.y - entity.y
        };

        return Utils.vector.normalize(wanderForce);
    }

    // Separation behavior - avoid crowding
    static separate(entity, neighbors, desiredSeparation = 50) {
        if (!entity.physics || neighbors.length === 0) return null;

        const steer = { x: 0, y: 0 };
        let count = 0;

        for (const neighbor of neighbors) {
            if (neighbor === entity || !neighbor.physics) continue;

            const distance = Utils.distance(entity.x, entity.y, neighbor.x, neighbor.y);
            
            if (distance > 0 && distance < desiredSeparation) {
                // Calculate vector pointing away from neighbor
                const diff = {
                    x: entity.x - neighbor.x,
                    y: entity.y - neighbor.y
                };

                // Weight by distance (closer = stronger force)
                const normalized = Utils.vector.normalize(diff);
                normalized.x /= distance;
                normalized.y /= distance;

                steer.x += normalized.x;
                steer.y += normalized.y;
                count++;
            }
        }

        if (count > 0) {
            steer.x /= count;
            steer.y /= count;

            // Scale to maximum speed
            const maxSpeed = entity.physics.maxVelocity || 100;
            steer.x *= maxSpeed;
            steer.y *= maxSpeed;

            // Subtract current velocity to get steering force
            steer.x -= entity.physics.velocity.x;
            steer.y -= entity.physics.velocity.y;

            return Utils.vector.normalize(steer);
        }

        return null;
    }
}

// Export classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PhysicsEngine, PhysicsBehaviors };
}
