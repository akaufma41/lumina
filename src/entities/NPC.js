import { TILE_SIZE, COLORS } from '../config/constants.js';

export class NPC {
  constructor(scene, data) {
    this.scene = scene;
    this.id = data.id;
    this.name = data.name;
    this.tileX = data.x;
    this.tileY = data.y;

    const px = data.x * TILE_SIZE + TILE_SIZE / 2;
    const py = data.y * TILE_SIZE + TILE_SIZE / 2;

    // Animated sprite (same 32x32 format as player)
    this.sprite = scene.add.sprite(px, py, `npc_${data.id}_idle`, 0);
    this.sprite.setDepth(10);
    this.sprite.setInteractive({ useHandCursor: true });

    // Create idle animations (4 frames × 3 directions, same as player)
    scene.anims.create({
      key: `npc_${data.id}_idle_down`,
      frames: scene.anims.generateFrameNumbers(`npc_${data.id}_idle`, { start: 0, end: 3 }),
      frameRate: 4, repeat: -1
    });
    scene.anims.create({
      key: `npc_${data.id}_idle_right`,
      frames: scene.anims.generateFrameNumbers(`npc_${data.id}_idle`, { start: 4, end: 7 }),
      frameRate: 4, repeat: -1
    });
    scene.anims.create({
      key: `npc_${data.id}_idle_up`,
      frames: scene.anims.generateFrameNumbers(`npc_${data.id}_idle`, { start: 8, end: 11 }),
      frameRate: 4, repeat: -1
    });

    // Play facing-down idle by default
    this.sprite.anims.play(`npc_${data.id}_idle_down`, true);

    // Soft glow circle beneath the NPC
    const glowColor = COLORS[data.colorKey] || 0xffffff;
    this.glow = scene.add.circle(px, py + 6, 18, glowColor, 0.12);
    this.glow.setDepth(9);

    // Name label (hidden by default, shown on proximity)
    this.nameLabel = scene.add.text(px, py - 22, data.name, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#eeddff',
      stroke: '#1a1a2e',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15);
    this.nameLabel.setVisible(false);

    // Proximity indicator ("!" bubble, hidden by default)
    this.indicator = scene.add.container(px, py - 24);
    const indicatorBg = scene.add.circle(0, 0, 8, 0xffaa44, 0.9);
    const indicatorText = scene.add.text(0, 0, '!', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.indicator.add([indicatorBg, indicatorText]);
    this.indicator.setDepth(15);
    this.indicator.setVisible(false);

    scene.tweens.add({
      targets: this.indicator,
      y: py - 28,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // Face toward a world position (e.g., the player)
  faceToward(worldX, worldY) {
    const dx = worldX - this.sprite.x;
    const dy = worldY - this.sprite.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        this.sprite.setFlipX(true);
        this.sprite.anims.play(`npc_${this.id}_idle_right`, true);
      } else {
        this.sprite.setFlipX(false);
        this.sprite.anims.play(`npc_${this.id}_idle_right`, true);
      }
    } else {
      if (dy < 0) {
        this.sprite.setFlipX(false);
        this.sprite.anims.play(`npc_${this.id}_idle_up`, true);
      } else {
        this.sprite.setFlipX(false);
        this.sprite.anims.play(`npc_${this.id}_idle_down`, true);
      }
    }
  }

  setIndicatorVisible(visible) {
    this.indicator.setVisible(visible);
    this.nameLabel.setVisible(visible);
  }

  // Check if a world-space point is inside this NPC's tap area
  containsPoint(worldX, worldY) {
    const bounds = this.sprite.getBounds();
    // Expand bounds slightly for easier tapping
    const pad = 8;
    return worldX >= bounds.x - pad && worldX <= bounds.right + pad &&
           worldY >= bounds.y - pad && worldY <= bounds.bottom + pad;
  }
}
