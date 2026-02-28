import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, CAMERA_LERP, INTERACT_RANGE } from '../config/constants.js';
import { FOREST_MAP, BLOCKED_TILES, NPC_SPAWNS, PLAYER_START, FOUNTAIN_POS } from '../map/forestMap.js';
import { DIALOGUE } from '../config/dialogueData.js';
import { Player } from '../entities/Player.js';
import { NPC } from '../entities/NPC.js';
import { Pathfinder } from '../systems/Pathfinder.js';
import { AtmosphereManager } from '../systems/AtmosphereManager.js';

export class ForestScene extends Phaser.Scene {
  constructor() {
    super('ForestScene');
  }

  create() {
    // 1. Build the tilemap from the map array
    this.buildTilemap();

    // 2. Place object sprites (trees, mushrooms, fountain, lanterns)
    this.placeObjects();

    // 3. Spawn the player
    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);

    // 4. Spawn NPCs
    this.npcs = NPC_SPAWNS.map(data => new NPC(this, data));

    // 5. Collision: player vs. non-walkable tiles
    this.physics.add.collider(this.player.sprite, this.groundLayer);

    // 6. Build pathfinding grid
    this.buildPathfinder();

    // 7. Camera follows player (zoomed in for close-up view)
    const worldW = MAP_WIDTH * TILE_SIZE;
    const worldH = MAP_HEIGHT * TILE_SIZE;
    this.cameras.main.setZoom(2);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player.sprite, true, CAMERA_LERP, CAMERA_LERP);

    // 8. Launch UI scene on top
    this.scene.launch('UIScene');

    // 9. Pointer (tap) input
    this.input.on('pointerdown', (pointer) => this.handleTap(pointer));

    // 10. Dialogue state
    this.dialogueState = {
      phase: 'idle',       // idle | intro | conversation_*
      npcId: null,
      lineIndex: 0,
      pendingNpc: null,    // NPC to talk to after arriving
      conversationMessages: [],
      apiAvailable: true,
    };

    // 11. Atmosphere effects
    this.atmosphereManager = new AtmosphereManager(this);
    this.atmosphereManager.applyTier(1, false);
  }

  // ─── TILEMAP ──────────────────────────────────────────────

  buildTilemap() {
    const map = this.make.tilemap({
      data: FOREST_MAP,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE
    });

    const tileset = map.addTilesetImage('forest_tileset');
    this.groundLayer = map.createLayer(0, tileset, 0, 0);
    this.groundLayer.setCollision([3, 4, 8]);
  }

  // ─── OBJECTS ──────────────────────────────────────────────

  placeObjects() {
    // Deterministic seeded random for consistent placement
    let rng = 42;
    const rand = () => { rng = (rng * 16807 + 0) % 2147483647; return rng / 2147483647; };

    // Curated frame indices for each object type (picked for deep forest aesthetic)
    // Trees: 32x48 frames, rows 3-5 have medium→large trees, teal/green variants
    const treeFrames = [9, 10, 11, 12, 13, 14]; // medium and large trees
    // Mushrooms: 32x48 frames, rows 2-4 have colorful fantasy mushrooms
    const mushFrames = [6, 7, 8, 9, 10, 11];
    // Bushes: 48x48 frames, row 0-1 have nice round bushes
    const bushFrames = [0, 1, 2, 3, 4, 5];

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = FOREST_MAP[y][x];
        const px = x * TILE_SIZE + TILE_SIZE / 2;
        const py = y * TILE_SIZE + TILE_SIZE / 2;

        // Trees on tree tiles (sparse placement)
        if (tileId === 3 && rand() < 0.3) {
          const frame = treeFrames[Math.floor(rand() * treeFrames.length)];
          const tree = this.add.sprite(px, py - 8, 'obj_trees', frame);
          tree.setDepth(y + 5);
          tree.setScale(1.2 + rand() * 0.4);  // native 32x48, upscale slightly
          tree.setOrigin(0.5, 0.9);
        }

        // Mushrooms on mushroom tiles
        if (tileId === 5 && rand() < 0.2) {
          const frame = mushFrames[Math.floor(rand() * mushFrames.length)];
          const mush = this.add.sprite(
            px + (rand() - 0.5) * 10,
            py + (rand() - 0.5) * 6,
            'obj_mushrooms', frame
          );
          mush.setDepth(y + 4);
          mush.setScale(0.8 + rand() * 0.4);
          mush.setOrigin(0.5, 0.9);
        }

        // Bushes on grass edges near trees
        if ((tileId === 0 || tileId === 1) && rand() < 0.04) {
          const frame = bushFrames[Math.floor(rand() * bushFrames.length)];
          const bush = this.add.sprite(px, py, 'obj_bushes', frame);
          bush.setDepth(y + 3);
          bush.setScale(0.6 + rand() * 0.3);
          bush.setOrigin(0.5, 0.9);
        }

        // Lanterns on lantern tiles (sparse — a few along the path)
        if (tileId === 6 && rand() < 0.15) {
          const lamp = this.add.sprite(px, py - 4, 'obj_lamp', 0);
          lamp.setDepth(y + 4);
          lamp.setScale(2);  // 16px upscaled to match tile size
          lamp.setOrigin(0.5, 0.8);
        }
      }
    }

    // Fountain at center of Keeper's clearing (frame 0 of spritesheet)
    const fpx = FOUNTAIN_POS.x * TILE_SIZE + TILE_SIZE / 2;
    const fpy = FOUNTAIN_POS.y * TILE_SIZE + TILE_SIZE / 2;
    const fountain = this.add.sprite(fpx, fpy - 8, 'obj_fountain', 0);
    fountain.setDepth(FOUNTAIN_POS.y + 4);
    fountain.setScale(0.7);  // 48x64 native, scaled to fit clearing
    fountain.setOrigin(0.5, 0.8);
  }

  // ─── PATHFINDER ───────────────────────────────────────────

  buildPathfinder() {
    // Build walkability grid: true = walkable, false = blocked
    const grid = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const row = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        row.push(!BLOCKED_TILES.has(FOREST_MAP[y][x]));
      }
      grid.push(row);
    }

    // Mark NPC tiles as blocked so player paths around them
    for (const spawn of NPC_SPAWNS) {
      grid[spawn.y][spawn.x] = false;
    }

    this.pathfinder = new Pathfinder(grid, MAP_WIDTH, MAP_HEIGHT);
  }

  // ─── TAP INPUT ────────────────────────────────────────────

  handleTap(pointer) {
    // During dialogue, tap advances dialogue instead
    if (this.dialogueState.phase !== 'idle') {
      this.handleDialogueTap();
      return;
    }

    // Convert screen coords to world coords
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);

    // Check if we tapped on an NPC
    let tappedNpc = null;
    for (const npc of this.npcs) {
      if (npc.containsPoint(worldPoint.x, worldPoint.y)) {
        tappedNpc = npc;
        break;
      }
    }

    const playerPos = this.player.getTilePos();

    if (tappedNpc) {
      // Find an adjacent walkable tile to the NPC
      const adj = this.findAdjacentWalkable(tappedNpc.tileX, tappedNpc.tileY);
      if (adj) {
        const path = this.pathfinder.findPath(playerPos.x, playerPos.y, adj.x, adj.y);
        if (path) {
          this.dialogueState.pendingNpc = tappedNpc;
          this.player.setPath(path, () => this.onArrivedAtNpc(tappedNpc));
        }
      }
    } else {
      // Tap on ground — pathfind there
      this.dialogueState.pendingNpc = null;
      if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
        // Find nearest walkable tile if target is blocked
        let targetX = tileX;
        let targetY = tileY;
        if (BLOCKED_TILES.has(FOREST_MAP[tileY][tileX])) {
          const near = this.findNearestWalkable(tileX, tileY);
          if (!near) return;
          targetX = near.x;
          targetY = near.y;
        }

        const path = this.pathfinder.findPath(playerPos.x, playerPos.y, targetX, targetY);
        if (path) {
          this.player.setPath(path);
        }
      }
    }
  }

  findAdjacentWalkable(tx, ty) {
    // Check 4 adjacent tiles, prefer the one closest to player
    const dirs = [
      { x: tx, y: ty + 1 },  // below
      { x: tx, y: ty - 1 },  // above
      { x: tx - 1, y: ty },  // left
      { x: tx + 1, y: ty },  // right
    ];

    const playerPos = this.player.getTilePos();
    let best = null;
    let bestDist = Infinity;

    for (const d of dirs) {
      if (d.x < 0 || d.x >= MAP_WIDTH || d.y < 0 || d.y >= MAP_HEIGHT) continue;
      if (BLOCKED_TILES.has(FOREST_MAP[d.y][d.x])) continue;
      // Also check it's not another NPC's tile
      const isNpcTile = NPC_SPAWNS.some(s => s.x === d.x && s.y === d.y);
      if (isNpcTile) continue;

      const dist = Math.abs(d.x - playerPos.x) + Math.abs(d.y - playerPos.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  }

  findNearestWalkable(tx, ty) {
    // Spiral outward to find nearest walkable tile
    for (let r = 1; r <= 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const nx = tx + dx;
          const ny = ty + dy;
          if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
          if (!BLOCKED_TILES.has(FOREST_MAP[ny][nx])) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }

  // ─── NPC INTERACTION ──────────────────────────────────────

  onArrivedAtNpc(npc) {
    if (this.dialogueState.phase !== 'idle') return;

    const data = DIALOGUE[npc.id];
    if (!data) return;

    this.dialogueState.npcId = npc.id;
    this.dialogueState.lineIndex = 0;
    this.dialogueState.phase = 'intro';
    this.dialogueState.pendingNpc = null;

    npc.setIndicatorVisible(false);

    // NPC turns to face the player
    npc.faceToward(this.player.sprite.x, this.player.sprite.y);

    const uiScene = this.scene.get('UIScene');
    uiScene.showDialogueText(data.name, data.intro[0]);
  }

  // ─── DIALOGUE ─────────────────────────────────────────────

  handleDialogueTap() {
    const uiScene = this.scene.get('UIScene');

    switch (this.dialogueState.phase) {

      case 'intro': {
        if (uiScene.isTypewriting()) {
          uiScene.completeTypewriter();
        } else {
          this.dialogueState.lineIndex++;
          const data = DIALOGUE[this.dialogueState.npcId];
          if (this.dialogueState.lineIndex >= data.intro.length) {
            // Intro done — start conversation or end
            if (this.dialogueState.apiAvailable && data.systemPrompt) {
              this.startConversation();
            } else {
              this.endDialogue();
            }
          } else {
            uiScene.showDialogueText(data.name, data.intro[this.dialogueState.lineIndex]);
          }
        }
        break;
      }

      case 'conversation_npc_talking': {
        if (uiScene.isTypewriting()) {
          uiScene.completeTypewriter();
        } else {
          // NPC finished — show conversation input
          uiScene.hideDialogue();
          this.dialogueState.phase = 'conversation_listening';
          uiScene.showConversation((confirmedText) => {
            this.sendChildMessage(confirmedText);
          });
        }
        break;
      }

      case 'conversation_listening': {
        // Tap during listening ends conversation
        this.endConversation();
        break;
      }

      case 'conversation_greeting':
      case 'conversation_thinking':
        // Waiting for API — ignore taps
        break;
    }
  }

  // ─── CONVERSATION (API) ───────────────────────────────────

  async startConversation() {
    const npcId = this.dialogueState.npcId;
    const data = DIALOGUE[npcId];
    const uiScene = this.scene.get('UIScene');

    this.dialogueState.conversationMessages = [];
    this.dialogueState.phase = 'conversation_greeting';

    uiScene.showThinking();

    try {
      const reply = await this.callAPI(npcId, []);
      uiScene.hideThinking();
      uiScene.showDialogueText(data.name, reply);
      this.dialogueState.conversationMessages.push(
        { role: 'assistant', content: reply }
      );
      this.dialogueState.phase = 'conversation_npc_talking';
    } catch (err) {
      this.dialogueState.apiAvailable = false;
      uiScene.hideThinking();
      this.endDialogue();
    }
  }

  async sendChildMessage(text) {
    const npcId = this.dialogueState.npcId;
    const data = DIALOGUE[npcId];
    const uiScene = this.scene.get('UIScene');

    this.dialogueState.conversationMessages.push(
      { role: 'user', content: text }
    );

    this.dialogueState.phase = 'conversation_thinking';
    uiScene.showThinking();

    try {
      const reply = await this.callAPI(npcId, this.dialogueState.conversationMessages);
      uiScene.hideThinking();
      uiScene.hideChildBubble();
      uiScene.showDialogueText(data.name, reply);
      this.dialogueState.conversationMessages.push(
        { role: 'assistant', content: reply }
      );
      this.dialogueState.phase = 'conversation_npc_talking';
    } catch (err) {
      uiScene.hideThinking();
      uiScene.hideConversation();
      uiScene.showDialogueText(data.name, 'Oh! I lost my thought. Come back soon!');
      this.dialogueState.phase = 'conversation_npc_talking';
    }
  }

  async callAPI(npcId, messages) {
    const data = DIALOGUE[npcId];
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npcId,
        systemPrompt: data.systemPrompt,
        messages: messages.length === 0
          ? [{ role: 'user', content: 'Hello! I just came to talk to you.' }]
          : messages
      })
    });

    if (!res.ok) throw new Error('API error');
    const json = await res.json();
    if (!json.reply) throw new Error('No reply');
    return json.reply;
  }

  endConversation() {
    const uiScene = this.scene.get('UIScene');
    this.dialogueState.phase = 'idle';
    this.dialogueState.npcId = null;
    this.dialogueState.lineIndex = 0;
    this.dialogueState.conversationMessages = [];
    uiScene.hideDialogue();
    uiScene.hideConversation();
  }

  endDialogue() {
    const uiScene = this.scene.get('UIScene');
    this.dialogueState.phase = 'idle';
    this.dialogueState.npcId = null;
    this.dialogueState.lineIndex = 0;
    this.dialogueState.conversationMessages = [];
    uiScene.hideDialogue();
  }

  // ─── UPDATE LOOP ──────────────────────────────────────────

  update(time, delta) {
    // Update player movement (path following)
    this.player.update();

    // NPC proximity indicators (only when idle)
    if (this.dialogueState.phase === 'idle') {
      for (const npc of this.npcs) {
        const dx = this.player.sprite.x - npc.sprite.x;
        const dy = this.player.sprite.y - npc.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        npc.setIndicatorVisible(dist < INTERACT_RANGE);
      }
    }
  }
}
