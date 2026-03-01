import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, CAMERA_LERP, INTERACT_RANGE } from '../config/constants.js';
import { FOREST_MAP, BLOCKED_TILES, NPC_SPAWNS, PLAYER_START, FOUNTAIN_POS } from '../map/forestMap.js';
import { DIALOGUE } from '../config/dialogueData.js';
import { Player } from '../entities/Player.js';
import { NPC } from '../entities/NPC.js';
import { Pathfinder } from '../systems/Pathfinder.js';
import { AtmosphereManager } from '../systems/AtmosphereManager.js';
import { ProgressManager } from '../systems/ProgressManager.js';
import { QuestManager } from '../systems/QuestManager.js';
import { CollectibleManager } from '../systems/CollectibleManager.js';
import { TutorialGuide } from '../systems/TutorialGuide.js';
import { QuestGuide } from '../systems/QuestGuide.js';
import { QUEST_CHAIN } from '../config/questData.js';

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

    // 9. Pointer (tap/hold) input
    this.input.on('pointerdown', (pointer) => this.handleTap(pointer));
    this.input.on('pointermove', (pointer) => this.handlePointerMove(pointer));
    this.input.on('pointerup', (pointer) => this.handlePointerUp(pointer));

    // Hold-to-move state
    this.holdingPointer = false;
    this.lastMoveTime = 0;
    this.lastMoveTarget = { x: -1, y: -1 };

    // 10. Dialogue state
    this.dialogueState = {
      phase: 'idle',       // idle | intro | conversation_*
      npcId: null,
      lineIndex: 0,
      pendingNpc: null,    // NPC to talk to after arriving
      conversationMessages: [],
      apiAvailable: true,
    };

    // 11. Progress + Quest tracking
    this.progressManager = new ProgressManager();
    this.questManager = new QuestManager(QUEST_CHAIN);

    // 12. Atmosphere effects (tier from saved progress)
    this.atmosphereManager = new AtmosphereManager(this);
    const savedTier = this.progressManager.getWorldTier();
    this.atmosphereManager.applyTier(savedTier, false);

    // 13. Collectible orbs
    this.collectibleManager = new CollectibleManager(this);

    // 14. Tutorial guide for first-time players
    if (this.questManager.data.currentQuestIndex === -1) {
      this.tutorialGuide = new TutorialGuide(this);
    }

    // 15. Quest guide firefly (first quest only)
    this.questGuide = new QuestGuide(this);

    // 16. Restore quest HUD + collectible counter + guide if first quest
    this.time.delayedCall(200, () => {
      this.updateQuestHUD();
      this.updateCollectibleCounter();
      const quest = this.questManager.getCurrentQuest();
      if (quest && this.questManager.data.currentQuestIndex === 0) {
        this.questGuide.show(quest.target);
      }
    });
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
    this.groundLayer.setCollision([3, 4]);
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

    // Notify tutorial guide of first tap
    if (this.tutorialGuide && !this.tutorialGuide.complete) {
      this.tutorialGuide.onFirstTap();
    }

    // Convert screen coords to world coords
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);

    // Check if we tapped on a collectible orb
    const orb = this.collectibleManager.checkTap(tileX, tileY);
    if (orb) {
      const result = this.collectibleManager.collectOrb(orb);
      this.updateCollectibleCounter();
      return;
    }

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
      // Tap on ground — pathfind there + enable hold-to-move
      if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
        this.holdingPointer = true;
        this.lastMoveTime = Date.now();
        this.lastMoveTarget = { x: tileX, y: tileY };
        this.pathfindToGround(tileX, tileY);
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

  // ─── HOLD-TO-MOVE ───────────────────────────────────────

  handlePointerMove(pointer) {
    if (!this.holdingPointer) return;
    if (this.dialogueState.phase !== 'idle') return;
    if (!pointer.isDown) return;

    // Throttle to every 400ms to reduce stuttering
    const now = Date.now();
    if (now - this.lastMoveTime < 400) return;
    this.lastMoveTime = now;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);

    // Skip if target hasn't moved at least 3 tiles from last target
    const dx = Math.abs(tileX - this.lastMoveTarget.x);
    const dy = Math.abs(tileY - this.lastMoveTarget.y);
    if (dx + dy < 3) return;

    // Skip if out of bounds
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return;

    this.lastMoveTarget = { x: tileX, y: tileY };
    this.pathfindToGround(tileX, tileY);
  }

  handlePointerUp(pointer) {
    if (!this.holdingPointer) return;
    this.holdingPointer = false;

    if (this.dialogueState.phase !== 'idle') return;

    // Final pathfind to release point
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);

    if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
      this.pathfindToGround(tileX, tileY);
    }
  }

  pathfindToGround(tileX, tileY) {
    const playerPos = this.player.getTilePos();
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
      this.dialogueState.pendingNpc = null;
      this.player.setPath(path);
    }
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
            // Intro done — check quest progression
            this.checkQuestCompletion(this.dialogueState.npcId);

            // Start conversation or end
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
          const data = DIALOGUE[this.dialogueState.npcId];
          uiScene.hideDialogue();
          this.dialogueState.phase = 'conversation_listening';
          uiScene.showConversation(
            (confirmedText) => { this.sendChildMessage(confirmedText); },
            () => { this.endConversation(); },
            data.name
          );
        }
        break;
      }

      case 'conversation_listening': {
        // Exit handled by X button in ConversationUI — ignore taps
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

    // Enhance system prompt if both orbs for this NPC are collected
    let systemPrompt = data.systemPrompt;
    if (this.collectibleManager && this.collectibleManager.allCollectedForNpc(npcId)) {
      systemPrompt += '\n\nThe child has found your two hidden orbs in the forest! Mention this — you are grateful and impressed. Tell them a secret about your part of the forest.';
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npcId,
        systemPrompt,
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

  // ─── QUEST LOGIC ─────────────────────────────────────────

  checkQuestCompletion(npcId) {
    if (!this.questManager) return;

    // First Keeper intro starts the quest chain
    if (npcId === 'keeper' && this.questManager.data.currentQuestIndex === -1) {
      this.questManager.startFirstQuest();
      this.questManager.markIntroSeen(npcId);
      this.updateQuestHUD();
      return;
    }

    // Is this NPC the current quest target?
    if (this.questManager.isQuestTarget(npcId)) {
      const previousTotal = this.progressManager.getTotalCompleted();
      const completedQuest = this.questManager.completeCurrentQuest();

      if (completedQuest) {
        this.progressManager.markCompleted(completedQuest.id);

        // Check for milestone (world tier change)
        const milestone = this.progressManager.checkMilestone(previousTotal);
        if (milestone !== null) {
          const newTier = this.progressManager.getWorldTier();
          this.atmosphereManager.applyTier(newTier, true);
          this.atmosphereManager.celebrateTierUp();
        }

        this.updateQuestHUD();
      }
    }

    this.questManager.markIntroSeen(npcId);
  }

  updateQuestHUD() {
    const uiScene = this.scene.get('UIScene');
    if (!uiScene || !uiScene.questHUD) return;

    const quest = this.questManager.getCurrentQuest();
    if (quest) {
      uiScene.showQuest(quest.objectiveText);
    } else if (this.questManager.isAllComplete()) {
      uiScene.hideQuest();
    }
  }

  endConversation() {
    const uiScene = this.scene.get('UIScene');
    this.dialogueState.phase = 'idle';
    this.dialogueState.npcId = null;
    this.dialogueState.lineIndex = 0;
    this.dialogueState.conversationMessages = [];
    uiScene.hideDialogue();
    uiScene.hideConversation();
    this.showPostDialogueGuidance();
  }

  updateCollectibleCounter() {
    const uiScene = this.scene.get('UIScene');
    if (!uiScene || !uiScene.collectibleCounter) return;
    const collected = this.collectibleManager.getTotalCollected();
    const total = this.collectibleManager.getTotal();
    uiScene.collectibleCounter.update(collected, total);
    if (collected > 0) {
      uiScene.collectibleCounter.flash();
    }
  }

  endDialogue() {
    const uiScene = this.scene.get('UIScene');
    this.dialogueState.phase = 'idle';
    this.dialogueState.npcId = null;
    this.dialogueState.lineIndex = 0;
    this.dialogueState.conversationMessages = [];
    uiScene.hideDialogue();
    this.showPostDialogueGuidance();
  }

  showPostDialogueGuidance() {
    const quest = this.questManager.getCurrentQuest();
    if (!quest) return;

    // Guide firefly only for the first quest (Keeper → Moth)
    if (this.questManager.data.currentQuestIndex === 0) {
      this.questGuide.show(quest.target);
    }
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

      // Orb proximity glow
      const playerPos = this.player.getTilePos();
      this.collectibleManager.updateProximity(playerPos.x, playerPos.y);

      // Tutorial guide follows player
      if (this.tutorialGuide && !this.tutorialGuide.complete) {
        this.tutorialGuide.update(playerPos.x, playerPos.y);
      }

      // Quest guide firefly follows player (first quest only)
      if (this.questGuide && !this.questGuide.complete) {
        this.questGuide.update(playerPos.x, playerPos.y);
      }
    }
  }
}
