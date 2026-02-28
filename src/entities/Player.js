import { TILE_SIZE, PLAYER_SPEED } from '../config/constants.js';

export class Player {
  constructor(scene, tileX, tileY) {
    this.scene = scene;
    this.speed = PLAYER_SPEED;

    this.sprite = scene.physics.add.sprite(
      tileX * TILE_SIZE + TILE_SIZE / 2,
      tileY * TILE_SIZE + TILE_SIZE / 2,
      'char_idle', 0
    );

    this.sprite.setSize(14, 18);
    this.sprite.setOffset(9, 12);
    this.sprite.setDepth(10);

    // Walk animations (6 frames per direction)
    scene.anims.create({
      key: 'walk_down',
      frames: scene.anims.generateFrameNumbers('char_walk', { start: 0, end: 5 }),
      frameRate: 10, repeat: -1
    });
    scene.anims.create({
      key: 'walk_right',
      frames: scene.anims.generateFrameNumbers('char_walk', { start: 6, end: 11 }),
      frameRate: 10, repeat: -1
    });
    scene.anims.create({
      key: 'walk_up',
      frames: scene.anims.generateFrameNumbers('char_walk', { start: 12, end: 17 }),
      frameRate: 10, repeat: -1
    });

    // Idle animations (4 frames per direction)
    scene.anims.create({
      key: 'idle_down',
      frames: scene.anims.generateFrameNumbers('char_idle', { start: 0, end: 3 }),
      frameRate: 4, repeat: -1
    });
    scene.anims.create({
      key: 'idle_right',
      frames: scene.anims.generateFrameNumbers('char_idle', { start: 4, end: 7 }),
      frameRate: 4, repeat: -1
    });
    scene.anims.create({
      key: 'idle_up',
      frames: scene.anims.generateFrameNumbers('char_idle', { start: 8, end: 11 }),
      frameRate: 4, repeat: -1
    });

    this.facing = 'down';
    this.path = null;      // array of {x, y} tile waypoints
    this.pathIndex = 0;    // current waypoint index
    this._moving = false;
    this._onArrive = null; // callback when path finishes
  }

  // Start following a new path. onArrive called when path completes.
  setPath(path, onArrive) {
    if (!path || path.length === 0) {
      this.stopMoving();
      if (onArrive) onArrive();
      return;
    }
    this.path = path;
    this.pathIndex = 0;
    this._moving = true;
    this._onArrive = onArrive || null;
    this.sprite.body.setVelocity(0, 0);
  }

  stopMoving() {
    this.path = null;
    this.pathIndex = 0;
    this._moving = false;
    this._onArrive = null;
    this.sprite.body.setVelocity(0, 0);
    this._playIdle();
  }

  isMoving() {
    return this._moving;
  }

  getTilePos() {
    return {
      x: Math.floor(this.sprite.x / TILE_SIZE),
      y: Math.floor(this.sprite.y / TILE_SIZE),
    };
  }

  update() {
    if (!this._moving || !this.path) {
      this.sprite.body.setVelocity(0, 0);
      this._playIdle();
      return;
    }

    const wp = this.path[this.pathIndex];
    const targetX = wp.x * TILE_SIZE + TILE_SIZE / 2;
    const targetY = wp.y * TILE_SIZE + TILE_SIZE / 2;

    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Close enough to waypoint — snap and advance
    if (dist < 2) {
      this.sprite.x = targetX;
      this.sprite.y = targetY;
      this.pathIndex++;

      if (this.pathIndex >= this.path.length) {
        // Path complete
        this._moving = false;
        this.sprite.body.setVelocity(0, 0);
        this._playIdle();
        const cb = this._onArrive;
        this._onArrive = null;
        this.path = null;
        if (cb) cb();
        return;
      }
      return; // process next waypoint on next frame
    }

    // Move toward current waypoint
    const vx = (dx / dist) * this.speed;
    const vy = (dy / dist) * this.speed;
    this.sprite.body.setVelocity(vx, vy);

    // Face movement direction and play walk animation
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        this.facing = 'left';
        this.sprite.setFlipX(true);
        this.sprite.anims.play('walk_right', true);
      } else {
        this.facing = 'right';
        this.sprite.setFlipX(false);
        this.sprite.anims.play('walk_right', true);
      }
    } else {
      if (dy < 0) {
        this.facing = 'up';
        this.sprite.setFlipX(false);
        this.sprite.anims.play('walk_up', true);
      } else {
        this.facing = 'down';
        this.sprite.setFlipX(false);
        this.sprite.anims.play('walk_down', true);
      }
    }
  }

  _playIdle() {
    this.sprite.setFlipX(this.facing === 'left');
    const idleDir = this.facing === 'left' ? 'right' : this.facing;
    this.sprite.anims.play(`idle_${idleDir}`, true);
  }
}
