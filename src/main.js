import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { ForestScene } from './scenes/ForestScene.js';
import { UIScene } from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 360,
  height: 640,
  pixelArt: true,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, ForestScene, UIScene]
};

window.LUMINA = new Phaser.Game(config);
