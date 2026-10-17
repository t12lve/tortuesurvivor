import * as THREE from 'three';
import { Power, PlayerStats, SaveSlotData } from '../types/game';

export interface GameEngineCallbacks {
  onStateChange: (state: string) => void;
  onStatsChange: (stats: PlayerStats, totalConvinced: number, gameTime: number) => void;
  onCombosChange: (journalistes: number, reqJ: number, politiciens: number, reqP: number) => void;
  onActivePowersChange: (powers: Power[]) => void;
  onLevelUp: (choices: { power: Power; bonusLevels: number; isGolden: boolean }[], remainingRerolls: number) => void;
  onGameOver: (timeStr: string) => void;
  onVictory: () => void;
  onMusicChange: (title: string, isPlaying: boolean) => void;
  onKillFeed: (text: string) => void;
  onBreakingNews: (text: string, type: 'score' | 'ally' | 'custom') => void;
  onFlash: (opacity: number) => void;
  onAllyDefense: (active: boolean) => void;
  onLoadingProgress: (percent: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private callbacks: GameEngineCallbacks;

  // State
  public gameState: 'START' | 'PLAYING' | 'LEVELUP' | 'GAMEOVER' | 'VICTORY' | 'PAUSED' | 'PAUSED_LITE' = 'START';
  public gameTime = 0;
  private lastTime = 0;
  public gameSpeedMultiplier = 1.0;
  public remainingRerolls = 3;
  public totalConvinced = 0;
  public showDamageNumbers = true;
  private isDestroyed = false;

  // Three.js
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private animFrameId: number | null = null;

  // Textures and Audio
  private sprites: Record<string, THREE.Texture> = {};
  private audioCtx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private ostAudio = new Audio();
  private ostTracks: string[] = [
    'source/ost/8bits mais 6e republique.mp3',
    'source/ost/Accordeon de goch.mp3',
    'source/ost/Capote Demon Hunter.mp3',
    'source/ost/Ero M6 be like.mp3',
    'source/ost/Espoir populaire.mp3',
    'source/ost/La marche.mp3',
    'source/ost/Latino Revolucion.mp3',
    'source/ost/Les fantomes du capitalisme.mp3',
    'source/ost/On est chill a boire un lait fraise.mp3',
    'source/ost/POV Bernard Arnaud paye des impots.mp3',
    'source/ost/POV je touche le smic a 1700euros.mp3',
    'source/ost/Slow as Capitalism.mp3',
    'source/ost/Un reve de pixels.mp3',
    'source/ost/Wallah cest pas Nelly.mp3'
  ];
  private lastOstIndex = -1;
  private soundBuffers: Record<string, AudioBuffer> = {};
  private bossMusicSource: AudioBufferSourceNode | null = null;

  // Player & Entities
  public player!: THREE.Mesh & { stats: PlayerStats; orbDamageAccum?: number };
  public keyBinds = { up: 'z', down: 's', left: 'q', right: 'd' };
  private keys = { up: false, down: false, left: false, right: false };
  private pointerActive = false;
  private pointerTarget = new THREE.Vector2();
  public joystickActive = false;
  public joystickDx = 0;
  public joystickDy = 0;

  private enemies: (THREE.Mesh & { stats: any; orbDamageAccum?: number })[] = [];
  private lootDrops: (THREE.Mesh & { stats: any })[] = [];
  private projectiles: any[] = [];
  private enemyProjectiles: any[] = [];
  private auras: any[] = [];
  private particles: any[] = [];
  private environmentProps: (THREE.Mesh & { userData: any })[] = [];
  private allies: { mesh: THREE.Mesh; life: number; maxLife: number; type: any; bounceVx?: number; bounceVy?: number }[] = [];
  private damageTexts: { mesh: THREE.Mesh; life: number; maxLife: number; vy: number }[] = [];
  private poofs: { mesh: THREE.Mesh; life: number; maxLife: number; vrx: number; vry: number; vrz: number }[] = [];
  private referendumZones: any[] = [];
  private fireTrails: any[] = [];

  // Progression & Spawners
  private spawnTimer = 0;
  private BASE_SPAWN_RATE = 1.0;
  private leaRaphTimer = 0;
  private leaRaphSpawnCount = 0;
  public journalisteKills = 0;
  public politicienKills = 0;
  private glucksKills = 0;
  private tondelierKills = 0;
  private bossSpawned = false;
  private overhealTimer = 0;
  private threatTimer = 0;
  private threatCount = 0;
  private bossOstFadeStarted = false;
  private shakeTimer = 0;
  private flashTimer = 0;
  private screenShakeTimer = 0;
  private breakingNewsTimer = 0;
  private nextBreakingNewsTime = 40;
  private killFeedTimer = 0;
  private killFeedBuffer: Record<string, { count: number; enemyType: string; weaponId: string }> = {};
  private lastAllyThreshold = 0;
  private kranidosInvincible = false;
  private pauseCheatBuffer = '';

  // Powers
  public availablePowers: Power[] = [];
  public activePowers: Power[] = [];

  // Biomes
  private CHUNK_SIZE = 40;
  private groundChunks: (THREE.Mesh & { userData: any })[] = [];
  private concreteTex!: THREE.CanvasTexture;
  private floorTex!: THREE.CanvasTexture;
  private sandTex!: THREE.CanvasTexture;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.initPowersList();
    this.init();
  }

  private initPowersList() {
    this.availablePowers = [
      {
        id: 'regle_verte',
        name: "La Règle Verte",
        category: "Offensif",
        desc: "Une aura constante qui blesse les ennemis au contact.",
        icon: 'book',
        cooldown: 0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Augmente les dégâts de zone (Niv ${lvl + 1})`,
        onFire: () => this.activateRegleVerte()
      },
      {
        id: 'service_eau',
        name: "Le Service Public de l'Eau",
        category: "Offensif",
        desc: "Tire un jet d'eau transperçant en direction des ennemis.",
        icon: 'droplet',
        cooldown: 2.0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Réduit le temps de recharge (Niv ${lvl + 1})`,
        onFire: () => this.fireWaterJet()
      },
      {
        id: 'smic_1700',
        name: "Le SMIC à 1700€ net",
        category: "Offensif",
        desc: "Tire des billets de banque à haute vitesse.",
        icon: 'banknote',
        cooldown: 0.8,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Tire plus fréquemment (Niv ${lvl + 1})`,
        onFire: () => this.fireCash()
      },
      {
        id: 'retraite_60',
        name: "Retraite à 60 ans",
        category: "Défensif",
        desc: "Aura qui ralentit considérablement les ennemis proches.",
        icon: 'clock',
        cooldown: 0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Augmente la zone de ralentissement (Niv ${lvl + 1})`,
        onFire: () => this.activateRetraiteSlow()
      },
      {
        id: 'garantie_autonomie',
        name: "Garantie d'Autonomie",
        category: "Défensif",
        desc: "Orbe protecteur tournant qui blesse les ennemis proches.",
        icon: 'shield',
        cooldown: 0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `+20 Dégâts de contact (Niv ${lvl + 1})`,
        onFire: () => this.activateOrbShield()
      },
      {
        id: 'blocage_prix',
        name: "Blocage des Prix",
        category: "Défensif",
        desc: "Gèle temporairement tous les ennemis à l'écran.",
        icon: 'snowflake',
        cooldown: 8.0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Gel plus fréquent (Niv ${lvl + 1})`,
        onFire: () => this.freezeEnemies()
      },
      {
        id: 'isf_climatique',
        name: "ISF Climatique",
        category: "Offensif",
        desc: "Frappe aléatoirement les ennemis avec la foudre fiscale.",
        icon: 'cloud-lightning',
        cooldown: 1.5,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Foudre plus rapide et violente (Niv ${lvl + 1})`,
        onFire: () => this.fireISF()
      },
      {
        id: 'cantine_gratuite',
        name: "Cantine Bio & Locale",
        category: "Défensif",
        desc: "Restaure de la vie passivement.",
        icon: 'utensils',
        cooldown: 5.0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Soin plus régulier (Niv ${lvl + 1})`,
        onFire: () => {
          if (this.player && this.player.stats) {
            this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + 2);
          }
        }
      },
      {
        id: 'revocation_elus',
        name: "Révoquer les Élus",
        category: "Offensif",
        desc: "Fait chuter un panneau RÉVOQUÉ sur l'ennemi le plus fort.",
        icon: 'gavel',
        cooldown: 5.0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `+100 Dégâts du panneau (Niv ${lvl + 1})`,
        onFire: () => this.fireRevocation()
      },
      {
        id: 'taxe_zucman',
        name: "Taxe Zucman",
        category: "Utilitaire",
        desc: "Passif: Réduit l'esquive des milliardaires (-2% par niveau).",
        icon: 'percent',
        cooldown: 0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `-2% d'Esquive ennemie (Niv ${lvl + 1})`,
        onFire: () => {}
      },
      {
        id: 'allocation_autonomie',
        name: "Allocation d'Autonomie",
        category: "Utilitaire",
        desc: "Passif: Augmente l'XP reçue des bulletins de vote.",
        icon: 'graduation-cap',
        cooldown: 0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Multiplicateur d'XP accru (Niv ${lvl + 1})`,
        onFire: () => {}
      },
      {
        id: 'referendum_autodetermination',
        name: "Référendum d'Autodétermination",
        category: "Utilitaire",
        desc: "Zone au sol : les ennemis dedans ont 30% de chance d'être convertis.",
        icon: 'globe',
        cooldown: 8.0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `+ Rayon, Durée et % Chance (Niv ${lvl + 1})`,
        onFire: () => this.fireReferendum()
      },
      {
        id: 'kranidos_rush',
        name: "Le Rush Kranidos",
        category: "Offensif",
        desc: "Charge ultra-rapide invincible laissant du sable incandescent (DoT).",
        icon: 'zap',
        cooldown: 10.0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `+60 Dégâts, + Distance, + Durée du Feu (Niv ${lvl + 1})`,
        onFire: () => this.fireKranidosRush()
      }
    ];
  }

  private init() {
    // 1. Audio Setup
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
        this.masterGainNode = this.audioCtx.createGain();
        this.masterGainNode.gain.value = 0.5;
        this.masterGainNode.connect(this.audioCtx.destination);
      }
    } catch (e) {
      console.warn("AudioContext init error:", e);
    }

    // 2. Three.js Core
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 16;
    this.camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3. Procedural Biome Textures
    this.concreteTex = this.createConcreteTexture();
    this.floorTex = this.createFloorTexture();
    this.sandTex = this.createSandTexture();

    // 3x3 Chunks Grid
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        const chunkGeo = new THREE.PlaneGeometry(this.CHUNK_SIZE, this.CHUNK_SIZE);
        const chunkMat = new THREE.MeshBasicMaterial({ map: this.concreteTex, side: THREE.DoubleSide });
        const chunk = new THREE.Mesh(chunkGeo, chunkMat);
        chunk.position.set(x * this.CHUNK_SIZE, y * this.CHUNK_SIZE, -0.1);
        chunk.userData = { gridX: x, gridY: y };
        this.scene.add(chunk);
        this.groundChunks.push(chunk as any);
        this.generatePropsForChunk(chunk, true);
      }
    }

    // 4. Load Textures & Audio
    this.loadAssets();

    // 5. Create Player Mesh
    const playerGeo = new THREE.PlaneGeometry(1.8, 1.8);
    const playerMat = new THREE.MeshBasicMaterial({
      map: this.sprites.rightfront || null,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.player = new THREE.Mesh(playerGeo, playerMat) as any;
    this.player.position.set(0, 0, 0);
    this.player.visible = false;
    this.player.stats = {
      hp: 100,
      maxHp: 100,
      xp: 0,
      maxXp: 10,
      level: 1,
      pickupRadius: 3,
      facingRight: true,
      facingFront: true,
      dashTimer: 0,
      dashCooldown: 0,
      dashDir: { x: 0, y: 0 }
    };
    this.scene.add(this.player);

    // Initial basic attack
    const offensives = this.availablePowers.filter(p => p.category === 'Offensif');
    const startPower = offensives[Math.floor(Math.random() * offensives.length)];
    this.activePowers = [{ ...startPower, level: 1 }];

    // Bind event listeners
    this.bindEvents();

    // Setup OST Audio
    this.ostAudio.loop = false;
    this.ostAudio.volume = 0.2;
    this.ostAudio.addEventListener('ended', () => {
      this.playRandomOst();
    });

    // Start Animation Loop
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    this.animFrameId = requestAnimationFrame(this.animate);
  }

  private loadAssets() {
    const textureLoader = new THREE.TextureLoader();
    const spriteUrls: Record<string, string> = {
      leftback: 'source/leftback.png',
      leftfront: 'source/leftfront.png',
      rightback: 'source/rightback2.png',
      rightfront: 'source/rightfront.png',
      journaR: 'source/journaR.png',
      journaRm: 'source/journaRm.png',
      usR: 'source/usright.png',
      poliRI: 'source/poliRI.png',
      glucksR: 'source/glucksR.png',
      billet_vert: 'source/billet_vert.png',
      isfclim: 'source/isfclim.png',
      marineR: 'source/marinelpdroite.png',
      tondR: 'source/tondR.png',
      mail: 'source/mail.png',
      laitfraise: 'source/laitfraise.png',
      maillotinvul: 'source/maillotinvul.png',
      erepu6: 'source/6erepu.png',
      aimant: 'source/aimant.png',
      colis: 'source/colis.png',
      roussoR: 'source/roussoR.png',
      rimaR: 'source/rimaR.png',
      poutouR: 'source/poutouR.png',
      ruffin: 'source/ruffin.png',
      renaut: 'source/renaut.png',
      fn: 'source/fn.png',
      boots: 'source/boots.png'
    };

    let total = Object.keys(spriteUrls).length + 10;
    let loaded = 0;
    const tick = () => {
      loaded++;
      this.callbacks.onLoadingProgress(Math.min(100, Math.floor((loaded / total) * 100)));
    };

    for (const [key, url] of Object.entries(spriteUrls)) {
      textureLoader.load(
        url,
        (tex) => {
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          this.sprites[key] = tex;
          if (key === 'rightfront' && this.player) {
            (this.player.material as THREE.MeshBasicMaterial).map = tex;
            (this.player.material as THREE.MeshBasicMaterial).needsUpdate = true;
          }
          tick();
        },
        undefined,
        () => tick()
      );
    }

    // Audio files
    const soundUrls: Record<string, string> = {
      reward: 'source/reward.mp3',
      abatez: 'source/abatez.mp3',
      faites_mieux: 'source/faites_mieux.mp3',
      glucksvlf: 'source/glucksvlf.mp3',
      tondelier_etca: 'source/tondelier_etca.mp3',
      boss: 'source/boss/boss_danslescampagnes.mp3',
      bossBgMusic: 'source/boss/boss_Psy 4 de Mah Rime.mp3',
      silence: 'source/silencepourlafrance.mp3',
      boots: 'source/boots.mp3',
      fakenews: 'source/fakenews.mp3'
    };

    for (const [key, url] of Object.entries(soundUrls)) {
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((buf) => {
          if (this.audioCtx) {
            return this.audioCtx.decodeAudioData(buf);
          }
          return null;
        })
        .then((audio) => {
          if (audio) this.soundBuffers[key] = audio;
          tick();
        })
        .catch(() => tick());
    }
  }

  public startGame() {
    this.resumeAudioContext();
    this.gameState = 'PLAYING';
    this.player.visible = true;
    this.lastTime = performance.now();
    this.callbacks.onStateChange(this.gameState);
    this.callbacks.onActivePowersChange(this.activePowers);
    this.playRandomOst();
    this.playSound(200, 'sine', 0.5);
  }

  public resumeAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public playRandomOst() {
    if (this.ostTracks.length === 0) return;
    let nextIdx = Math.floor(Math.random() * this.ostTracks.length);
    if (nextIdx === this.lastOstIndex && this.ostTracks.length > 1) {
      nextIdx = (nextIdx + 1) % this.ostTracks.length;
    }
    this.lastOstIndex = nextIdx;
    const track = this.ostTracks[nextIdx];
    this.ostAudio.src = track;
    this.ostAudio
      .play()
      .then(() => {
        const title = track.replace('source/ost/', '').replace('.mp3', '');
        this.callbacks.onMusicChange(title, true);
      })
      .catch((e) => console.log('OST play error:', e));
  }

  public toggleMusic() {
    if (this.ostAudio.paused) {
      this.ostAudio.play().catch(() => {});
      const title = this.ostAudio.src.split('/').pop()?.replace('.mp3', '') || 'Musique';
      this.callbacks.onMusicChange(decodeURIComponent(title), true);
    } else {
      this.ostAudio.pause();
      const title = this.ostAudio.src.split('/').pop()?.replace('.mp3', '') || 'Musique';
      this.callbacks.onMusicChange(decodeURIComponent(title), false);
    }
  }

  public setMasterVolume(val: number) {
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = val;
    }
  }

  public setOstVolume(val: number) {
    this.ostAudio.volume = val;
  }

  public triggerDash() {
    if (!this.player || this.player.stats.dashCooldown > 0 || this.player.stats.dashTimer > 0) return;

    let dx = 0,
      dy = 0;
    if (this.keys.up) dy += 1;
    if (this.keys.down) dy -= 1;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;

    if (this.joystickActive) {
      dx += this.joystickDx;
      dy += this.joystickDy;
    }

    if (dx === 0 && dy === 0) {
      dx = this.player.stats.facingRight ? 1 : -1;
      dy = this.player.stats.facingFront ? -1 : 1;
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    this.player.stats.dashDir = { x: dx, y: dy };
    this.player.stats.dashTimer = 0.2;
    this.player.stats.dashCooldown = 2.0;

    this.playSound(300, 'sine', 0.1);
  }

  public togglePause() {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
      this.ostAudio.pause();
      this.callbacks.onStateChange(this.gameState);
    } else if (this.gameState === 'PAUSED') {
      this.gameState = 'PLAYING';
      this.ostAudio.play().catch(() => {});
      this.lastTime = performance.now();
      this.callbacks.onStateChange(this.gameState);
    }
  }

  public togglePauseLite() {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED_LITE';
      this.callbacks.onStateChange(this.gameState);
    } else if (this.gameState === 'PAUSED_LITE') {
      this.gameState = 'PLAYING';
      this.lastTime = performance.now();
      this.callbacks.onStateChange(this.gameState);
    }
  }

  public selectPower(powerData: Power, bonusLevels = 1) {
    const existing = this.activePowers.find((p) => p.id === powerData.id);
    if (existing) {
      existing.level += bonusLevels;
      existing.cooldown *= Math.pow(0.8, bonusLevels);
    } else {
      this.activePowers.push({
        ...powerData,
        level: bonusLevels
      });
    }

    this.gameState = 'PLAYING';
    this.lastTime = performance.now();
    this.callbacks.onStateChange(this.gameState);
    this.callbacks.onActivePowersChange([...this.activePowers]);
  }

  public rerollPowers() {
    if (this.remainingRerolls > 0) {
      this.remainingRerolls--;
      this.generatePowerChoices();
    }
  }

  private triggerLevelUp() {
    this.gameState = 'LEVELUP';
    this.callbacks.onStateChange(this.gameState);
    if (this.soundBuffers.abatez) {
      this.playAudioBuffer(this.soundBuffers.abatez);
    } else {
      this.playSound(600, 'square', 0.2);
    }
    this.generatePowerChoices();
  }

  private generatePowerChoices() {
    const availablePool = [...this.availablePowers];
    const choices: { power: Power; bonusLevels: number; isGolden: boolean }[] = [];

    for (let i = 0; i < 3; i++) {
      if (availablePool.length === 0) break;
      const idx = Math.floor(Math.random() * availablePool.length);
      const power = availablePool[idx];
      availablePool.splice(idx, 1);

      const isGolden = Math.random() < 0.005;
      const bonusLevels = isGolden ? Math.floor(Math.random() * 2) + 2 : 1;
      choices.push({ power, bonusLevels, isGolden });

      if (isGolden && this.soundBuffers.reward) {
        this.playAudioBuffer(this.soundBuffers.reward);
      }
    }

    this.callbacks.onLevelUp(choices, this.remainingRerolls);
  }

  // ==================== LOOP & UPDATES ====================
  private animate(time: number) {
    if (this.isDestroyed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(((time - this.lastTime) / 1000) * this.gameSpeedMultiplier, 0.1);
    this.lastTime = time;

    this.pollGamepads();

    if (this.gameState !== 'PLAYING') {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.gameTime += delta;

    // Check level up or boss
    if (this.gameTime >= 12 * 60 && !this.bossSpawned) {
      this.bossSpawned = true;
      this.spawnMegaBoss();
    }

    // Mini boss Lea & Raph every 3 min
    this.leaRaphTimer += delta;
    if (this.leaRaphTimer >= 180) {
      this.leaRaphTimer = 0;
      this.spawnLeaRaph();
    }

    // Killfeed buffer processing
    this.killFeedTimer += delta;
    if (this.killFeedTimer >= 1.0) {
      this.processKillFeedBuffer();
      this.killFeedTimer = 0;
    }

    // Breaking news
    this.breakingNewsTimer += delta;
    if (this.breakingNewsTimer >= this.nextBreakingNewsTime) {
      this.callbacks.onBreakingNews(
        `🚨 FLASH INFO 🚨 MÉLENCHON: Déjà au deuxième tour ? ${this.totalConvinced} convaincus !`,
        'score'
      );
      this.breakingNewsTimer = 0;
      this.nextBreakingNewsTime = 45 + Math.random() * 60;
    }

    // Threat warnings
    if (this.gameTime < 12 * 60) {
      this.threatTimer += delta;
      if (this.threatTimer >= 240) {
        this.threatTimer -= 240;
        this.threatCount++;
        let msg = '';
        if (this.threatCount === 1) msg = '⚠️ UNE MENACE INCONNUE APPROCHE... ⚠️';
        else if (this.threatCount === 2) msg = '☠️ LA MENACE SE RAPPROCHE DANGEREUSEMENT... ☠️';
        else msg = "🔥 LE CIEL S'ASSOMBRIT... IL EST LÀ ! 🔥";
        this.callbacks.onBreakingNews(msg, 'custom');
      }
    }

    // Shake & Flash feedback
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      this.camera.position.x = (Math.random() - 0.5) * 0.5;
      this.camera.position.y = (Math.random() - 0.5) * 0.5;
    } else {
      this.camera.position.x = 0;
      this.camera.position.y = 0;
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      this.callbacks.onFlash(Math.min(0.5, this.flashTimer * 2));
    } else {
      this.callbacks.onFlash(0);
    }

    // Ralliement Allies Every 50 Convinced
    const allyMilestone = Math.floor(this.totalConvinced / 50);
    if (allyMilestone > this.lastAllyThreshold && this.totalConvinced > 0) {
      this.lastAllyThreshold = allyMilestone;
      const ally = this.spawnRalliement();
      if (ally) {
        this.callbacks.onBreakingNews(
          `🤝 FLASH INFO 🤝 SOUTIEN ! ${ally.name} rejoint la lutte aux côtés de MÉLENCHON !`,
          'ally'
        );
      }
    }

    if (this.allies.length > 0) {
      this.updateRalliement(delta);
    } else {
      this.callbacks.onAllyDefense(false);
    }

    this.updatePlayer(delta);
    this.updateEnemies(delta);
    this.updateProjectiles(delta);
    this.updateEnemyProjectiles(delta);
    this.updateParticles(delta);
    this.updatePoofs(delta);
    this.updateDamageTexts(delta);
    this.updateLoot(delta);
    this.updatePowers(delta);
    this.updateReferendumZones(delta);
    this.updateFireTrails(delta);
    this.updateChunks();

    // Overheal drain
    if (this.player.stats.hp > this.player.stats.maxHp) {
      this.overhealTimer += delta;
      if (this.overhealTimer >= 2.0) {
        this.overhealTimer = 0;
        this.player.stats.hp -= 1;
      }
    } else {
      this.overhealTimer = 0;
    }

    // Camera follow with screen shake
    let camOffsetX = 0;
    let camOffsetY = 0;
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer -= delta;
      const intensity = (this.screenShakeTimer / 0.5) * 0.5;
      camOffsetX = (Math.random() - 0.5) * intensity;
      camOffsetY = (Math.random() - 0.5) * intensity;
    }
    this.camera.position.x = this.player.position.x + camOffsetX;
    this.camera.position.y = this.player.position.y + camOffsetY;

    // React Stats Sync
    this.callbacks.onStatsChange({ ...this.player.stats }, this.totalConvinced, this.gameTime);
    this.callbacks.onCombosChange(
      this.journalisteKills,
      this.getComboReq(30),
      this.politicienKills,
      this.getComboReq(15)
    );

    this.renderer.render(this.scene, this.camera);
  }

  // ==================== PLAYER UPDATE ====================
  private updatePlayer(delta: number) {
    const PLAYER_SPEED = 5;

    if (this.player.stats.dashCooldown > 0) {
      this.player.stats.dashCooldown -= delta;
    }

    if (this.player.stats.dashTimer > 0) {
      this.player.stats.dashTimer -= delta;
      const moveX = this.player.stats.dashDir.x * PLAYER_SPEED * 3.5 * delta;
      const moveY = this.player.stats.dashDir.y * PLAYER_SPEED * 3.5 * delta;

      if (!this.checkWallCollision(this.player.position.x + moveX, this.player.position.y, 1.5, 1.5)) {
        this.player.position.x += moveX;
      }
      if (!this.checkWallCollision(this.player.position.x, this.player.position.y + moveY, 1.5, 1.5)) {
        this.player.position.y += moveY;
      }

      if (Math.random() < 0.3) {
        this.spawnParticles(this.player.position, 0x3498db, 1, 3);
      }
      return;
    }

    let dx = 0;
    let dy = 0;

    if (this.keys.up) dy += 1;
    if (this.keys.down) dy -= 1;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;

    if (this.pointerActive) {
      const pdx = this.pointerTarget.x - this.player.position.x;
      const pdy = this.pointerTarget.y - this.player.position.y;
      const dist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (dist > 0.5) {
        dx += pdx / dist;
        dy += pdy / dist;
      }
    }

    if (this.joystickActive) {
      dx += this.joystickDx;
      dy += this.joystickDy;
    }

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    const moveX = dx * PLAYER_SPEED * delta;
    const moveY = dy * PLAYER_SPEED * delta;

    if (!this.checkWallCollision(this.player.position.x + moveX, this.player.position.y, 1.5, 1.5)) {
      this.player.position.x += moveX;
    }
    if (!this.checkWallCollision(this.player.position.x, this.player.position.y + moveY, 1.5, 1.5)) {
      this.player.position.y += moveY;
    }

    if (dx > 0) this.player.stats.facingRight = true;
    if (dx < 0) this.player.stats.facingRight = false;
    if (dy > 0) this.player.stats.facingFront = false;
    if (dy < 0) this.player.stats.facingFront = true;

    const pMat = this.player.material as THREE.MeshBasicMaterial;
    if (this.player.stats.facingRight && this.player.stats.facingFront) {
      if (this.sprites.rightfront) pMat.map = this.sprites.rightfront;
    } else if (this.player.stats.facingRight && !this.player.stats.facingFront) {
      if (this.sprites.rightback) pMat.map = this.sprites.rightback;
    } else if (!this.player.stats.facingRight && this.player.stats.facingFront) {
      if (this.sprites.leftfront) pMat.map = this.sprites.leftfront;
    } else if (!this.player.stats.facingRight && !this.player.stats.facingFront) {
      if (this.sprites.leftback) pMat.map = this.sprites.leftback;
    }
  }

  public damagePlayer(amount: number) {
    if (this.player.stats.invincible || this.kranidosInvincible || this.player.stats.dashTimer > 0) return;

    if (this.allies.length > 0) {
      amount *= 0.5;
    }

    this.player.stats.hp -= amount;
    this.playSound(150, 'sawtooth', 0.1);

    const mat = this.player.material as THREE.MeshBasicMaterial;
    mat.color.setHex(0xff0000);
    this.shakeTimer = 0.1;
    this.flashTimer = 0.15;
    setTimeout(() => {
      if (this.player && this.player.material) {
        (this.player.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      }
    }, 100);

    if (this.player.stats.hp <= 0) {
      this.gameState = 'GAMEOVER';
      this.ostAudio.pause();
      const timeStr = this.formatTime(this.gameTime);
      this.callbacks.onGameOver(timeStr);
      this.callbacks.onStateChange(this.gameState);
      if (this.soundBuffers.faites_mieux) {
        this.playAudioBuffer(this.soundBuffers.faites_mieux);
      }
    }
  }

  public healPlayer(amount: number) {
    this.player.stats.hp = Math.min(115, this.player.stats.hp + amount);
    this.playSound(400, 'sine', 0.1);
  }

  private checkWallCollision(x: number, y: number, w: number, h: number): boolean {
    for (let i = 0; i < this.environmentProps.length; i++) {
      const prop = this.environmentProps[i];
      if (prop.userData && prop.userData.isWall) {
        const pw = prop.userData.width;
        const ph = prop.userData.height;
        const px = prop.position.x;
        const py = prop.position.y;
        if (Math.abs(x - px) < (w + pw) / 2 && Math.abs(y - py) < (h + ph) / 2) {
          return true;
        }
      }
    }
    return false;
  }

  // ==================== ENEMIES ====================
  private spawnEnemy(forcedType: string | null = null) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 15;
    const x = this.player.position.x + Math.cos(angle) * distance;
    const y = this.player.position.y + Math.sin(angle) * distance;

    const types = ['Journaliste', 'Politique', 'Milliardaire'];
    const type = types[Math.floor(Math.random() * types.length)];

    let subType = forcedType;
    if (!subType) {
      if (type === 'Journaliste') subType = Math.random() < 0.5 ? 'JournalisteF' : 'JournalisteH';
      if (type === 'Politique') subType = Math.random() < 0.5 ? 'Poli' : 'Glucks';
      if (type === 'Milliardaire') subType = Math.random() < 0.5 ? 'Bill1' : 'Bill2';
    }

    const geo = new THREE.PlaneGeometry(1.44, 1.44);
    let hp = 10;
    let speed = 2.0;
    let map: THREE.Texture | null = null;
    let dodgeChance = 0;
    let attackTimer = 0;

    switch (subType) {
      case 'JournalisteF':
        map = this.sprites.journaR || null;
        hp = 10;
        speed = 2.0;
        break;
      case 'JournalisteH':
        map = this.sprites.journaRm || null;
        hp = 10;
        speed = 2.0;
        break;
      case 'Poli':
        map = this.sprites.poliRI || null;
        hp = 20;
        speed = 1.5;
        break;
      case 'Glucks':
        map = this.sprites.glucksR || null;
        hp = 20;
        speed = 1.5;
        attackTimer = 2.0;
        break;
      case 'Bill1':
      case 'Bill2':
        map = this.sprites.usR || null;
        hp = 30;
        speed = 2.5;
        dodgeChance = 0.25;
        if (this.soundBuffers.fakenews && Math.random() < 0.1) {
          this.playAudioBuffer(this.soundBuffers.fakenews);
        }
        break;
    }

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: map,
      transparent: true,
      side: THREE.DoubleSide
    });
    const enemy = new THREE.Mesh(geo, mat) as any;
    enemy.position.set(x, y, 0);

    const timeScale = 1 + (this.gameTime / 60) * 0.15;
    hp = Math.floor(hp * timeScale);

    enemy.scale.set(0.1, 0.1, 0.1);
    enemy.stats = {
      hp,
      maxHp: hp,
      speed,
      type: subType,
      originalColor: 0xffffff,
      frozenTimer: 0,
      slowTimer: 0,
      dodgeChance,
      attackTimer,
      spawnTween: 0,
      dmgScale: timeScale
    };

    this.scene.add(enemy);
    this.enemies.push(enemy);
  }

  private spawnLeaRaph() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumH = 16;
    const frustumW = 16 * aspect;
    const halfW = frustumW / 2 + 2;
    const halfH = frustumH / 2 + 2;
    const cx = this.player.position.x;
    const cy = this.player.position.y;

    const side = Math.floor(Math.random() * 4);
    let startX = 0,
      startY = 0,
      endX = 0,
      endY = 0;
    if (side === 0) {
      startX = cx - halfW;
      startY = cy + (Math.random() - 0.5) * frustumH;
      endX = cx + halfW;
      endY = cy + (Math.random() - 0.5) * frustumH;
    } else if (side === 1) {
      startX = cx + halfW;
      startY = cy + (Math.random() - 0.5) * frustumH;
      endX = cx - halfW;
      endY = cy + (Math.random() - 0.5) * frustumH;
    } else if (side === 2) {
      startX = cx + (Math.random() - 0.5) * frustumW;
      startY = cy + halfH;
      endX = cx + (Math.random() - 0.5) * frustumW;
      endY = cy - halfH;
    } else {
      startX = cx + (Math.random() - 0.5) * frustumW;
      startY = cy - halfH;
      endX = cx + (Math.random() - 0.5) * frustumW;
      endY = cy + halfH;
    }

    const dvx = endX - startX;
    const dvy = endY - startY;
    const dlen = Math.max(0.01, Math.sqrt(dvx * dvx + dvy * dvy));

    const geo = new THREE.PlaneGeometry(3.0, 3.0);
    const mat = new THREE.MeshBasicMaterial({
      map: this.sprites.renaut || null,
      transparent: true,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat) as any;
    mesh.position.set(startX, startY, 1.2);

    const baseHp = 100 * (1 + this.player.stats.level * 0.5) + this.leaRaphSpawnCount * 100;
    mesh.stats = {
      type: 'LeaRaph',
      hp: baseHp,
      maxHp: baseHp,
      speed: 4.0,
      vx: dvx / dlen,
      vy: dvy / dlen,
      spawnTween: 0.0,
      originalColor: 0xffffff,
      isMiniBoss: true
    };

    this.scene.add(mesh);
    this.enemies.push(mesh);
    this.leaRaphSpawnCount++;

    localStorage.setItem('seen_learaph', 'true');
    this.callbacks.onBreakingNews('🚨 LEA ET RAPH DÉBARQUENT ! ILS TRAVERSENT LA CARTE !', 'custom');
  }

  private spawnMiniBoss(type: string, pos: THREE.Vector3) {
    const geo = new THREE.PlaneGeometry(5, 5);
    const timeScale = 1 + (this.gameTime / 60) * 0.15;
    let hp = 300 * timeScale;
    let speed = 1.2;
    let map = this.sprites.glucksR;
    let name = 'MEGA GLUCKSMANN';

    if (type === 'GrosGlucks') {
      if (this.soundBuffers.glucksvlf) this.playAudioBuffer(this.soundBuffers.glucksvlf);
    } else {
      map = this.sprites.tondR;
      hp = 600 * timeScale;
      name = 'MEGA TONDELIER';
      if (this.soundBuffers.tondelier_etca) this.playAudioBuffer(this.soundBuffers.tondelier_etca);
    }

    this.callbacks.onBreakingNews(`🚨 ⚠️ ${name} APPARAÎT ! ⚠️ 🚨`, 'custom');

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: map || null,
      transparent: true,
      side: THREE.DoubleSide
    });
    const enemy = new THREE.Mesh(geo, mat) as any;
    enemy.position.copy(pos);
    enemy.stats = {
      hp: Math.floor(hp),
      maxHp: Math.floor(hp),
      speed,
      type: type === 'GrosGlucks' ? 'Glucks' : 'Tondelier',
      originalColor: 0xffffff,
      frozenTimer: 0,
      slowTimer: 0,
      dodgeChance: 0.005,
      attackTimer: 0,
      isMiniBoss: true,
      spawnTween: 0
    };

    this.scene.add(enemy);
    this.enemies.push(enemy);
  }

  private spawnMegaBoss() {
    this.screenShakeTimer = 2.0;
    if (this.soundBuffers.boss) this.playAudioBuffer(this.soundBuffers.boss);

    this.ostAudio.pause();
    if (this.soundBuffers.bossBgMusic && this.audioCtx && this.masterGainNode) {
      const source = this.audioCtx.createBufferSource();
      source.buffer = this.soundBuffers.bossBgMusic;
      source.loop = true;
      source.connect(this.masterGainNode);
      source.start();
      this.bossMusicSource = source;
    }
    this.callbacks.onMusicChange('🎵 Boss Final (Marine Le Pen)', true);

    // Disintegrate trash mobs
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.spawnParticles(this.enemies[i].position, this.enemies[i].stats.originalColor || 0xffffff, 8);
      this.scene.remove(this.enemies[i]);
    }
    this.enemies.length = 0;

    const geo = new THREE.PlaneGeometry(8, 8);
    const rightSide = this.player.position.x > 0;
    const mat = new THREE.MeshBasicMaterial({
      map: this.sprites.marineR || null,
      transparent: true,
      side: THREE.DoubleSide
    });
    const boss = new THREE.Mesh(geo, mat) as any;
    boss.position.set(this.player.position.x + (rightSide ? -15 : 15), this.player.position.y, 0);
    boss.stats = {
      hp: 7500,
      maxHp: 7500,
      speed: 1.5,
      type: 'MegaBoss',
      originalColor: 0xffffff,
      frozenTimer: 0,
      slowTimer: 0,
      dodgeChance: 0,
      isMegaBoss: true,
      spawnTween: 0,
      attackTimer: 3.0
    };

    this.scene.add(boss);
    this.enemies.push(boss);
  }

  private updateEnemies(delta: number) {
    this.spawnTimer += delta;
    const currentSpawnRate = this.BASE_SPAWN_RATE / (1 + this.gameTime / 120);
    if (this.spawnTimer >= currentSpawnRate && !this.bossSpawned) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.stats.spawnTween !== undefined && enemy.stats.spawnTween < 1.0) {
        enemy.stats.spawnTween += delta * 2;
        const s = Math.min(1.0, enemy.stats.spawnTween);
        enemy.scale.set(s, s, s);
      }

      if (enemy.stats.frozenTimer > 0) {
        enemy.stats.frozenTimer -= delta;
        continue;
      }

      let currentSpeed = enemy.stats.speed;
      if (enemy.stats.slowTimer > 0) {
        currentSpeed *= 0.5;
        enemy.stats.slowTimer -= delta;
      }

      const dx = this.player.position.x - enemy.position.x;
      const dy = this.player.position.y - enemy.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let moveX = 0,
        moveY = 0;
      let faceRight = true;

      if (enemy.stats.type === 'LeaRaph') {
        moveX = enemy.stats.vx * currentSpeed * delta;
        moveY = enemy.stats.vy * currentSpeed * delta;
        faceRight = enemy.stats.vx > 0;
        if (dist > 60) {
          enemy.stats.hp = -9999;
          enemy.stats.noLoot = true;
        }
      } else if (dist > 0.5) {
        moveX = (dx / dist) * currentSpeed * delta;
        moveY = (dy / dist) * currentSpeed * delta;
        faceRight = dx > 0;
      }

      if (moveX !== 0 || moveY !== 0) {
        if (!this.checkWallCollision(enemy.position.x + moveX, enemy.position.y, 1.4, 1.4)) {
          enemy.position.x += moveX;
        }
        if (!this.checkWallCollision(enemy.position.x, enemy.position.y + moveY, 1.4, 1.4)) {
          enemy.position.y += moveY;
        }

        const absX = Math.abs(enemy.scale.x);
        enemy.scale.x = faceRight ? absX : -absX;
      }

      // Attacks
      if (enemy.stats.attackTimer !== undefined && enemy.stats.attackTimer > 0) {
        enemy.stats.attackTimer -= delta;
        if (enemy.stats.attackTimer <= 0) {
          if (enemy.stats.type === 'Glucks') {
            this.createTextProjectile('et surtout... vive, la fraaaaaaaaaaaaaance', enemy.position, 0, 5, '#e74c3c');
            enemy.stats.attackTimer = 3.0 + Math.random() * 2;
          } else if (enemy.stats.type === 'MegaBoss' && this.sprites.fn) {
            for (let a = -1; a <= 1; a += 0.6) {
              const geo = new THREE.PlaneGeometry(1.2, 2.1);
              const mat = new THREE.MeshBasicMaterial({
                map: this.sprites.fn,
                transparent: true,
                side: THREE.DoubleSide
              });
              const mesh = new THREE.Mesh(geo, mat);
              mesh.position.copy(enemy.position);

              const edx = this.player.position.x - enemy.position.x;
              const edy = this.player.position.y - enemy.position.y;
              const baseAngle = Math.atan2(edy, edx);
              const angle = baseAngle + a;
              mesh.rotation.z = angle - Math.PI / 2;

              this.scene.add(mesh);
              this.enemyProjectiles.push({
                mesh,
                vx: Math.cos(angle) * 6,
                vy: Math.sin(angle) * 6,
                life: 6.0,
                maxLife: 6.0,
                damage: 15
              });
            }
            if (Math.random() > 0.8 && this.soundBuffers.silence) {
              this.playAudioBuffer(this.soundBuffers.silence);
            }
            enemy.stats.attackTimer = 2.5;
          }
        }
      }

      // Boss boots attack
      if (enemy.stats.type === 'MegaBoss') {
        if (enemy.stats.bootsTimer === undefined) enemy.stats.bootsTimer = 2.0;
        enemy.stats.bootsTimer -= delta;
        if (enemy.stats.bootsTimer <= 0 && this.sprites.boots) {
          const geo = new THREE.PlaneGeometry(1.8, 1.5);
          const mat = new THREE.MeshBasicMaterial({
            map: this.sprites.boots,
            transparent: true,
            side: THREE.DoubleSide
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.copy(enemy.position);

          const edx = this.player.position.x - enemy.position.x;
          const edy = this.player.position.y - enemy.position.y;
          const elen = Math.max(0.1, Math.sqrt(edx * edx + edy * edy));

          this.scene.add(mesh);
          this.enemyProjectiles.push({
            mesh,
            vx: (edx / elen) * 8,
            vy: (edy / elen) * 8,
            life: 8.0,
            maxLife: 8.0,
            damage: 15
          });

          if (this.soundBuffers.boots) {
            this.playAudioBuffer(this.soundBuffers.boots);
          }
          enemy.stats.bootsTimer = 5.0 + Math.random() * 2;
        }
      }

      // Contact with player
      if (dist < 1.0) {
        const dmg = 5 * (enemy.stats.dmgScale || 1);
        this.damagePlayer(dmg);
        enemy.position.x -= dx * 0.5;
        enemy.position.y -= dy * 0.5;
      }

      // Check if dead
      if (enemy.stats.hp <= 0) {
        if (enemy.stats.isMegaBoss) {
          localStorage.setItem('bossDefeated', 'true');
          const wins = parseInt(localStorage.getItem('timesFinished') || '0', 10);
          localStorage.setItem('timesFinished', String(wins + 1));

          if (this.bossMusicSource) {
            this.bossMusicSource.stop();
            this.bossMusicSource = null;
          }

          this.scene.remove(enemy);
          this.enemies.splice(i, 1);
          this.gameState = 'VICTORY';
          this.callbacks.onVictory();
          this.callbacks.onStateChange(this.gameState);
          return;
        }

        this.scene.remove(enemy);
        this.shakeTimer = 0.05;
        this.flashTimer = 0.05;

        this.spawnParticles(enemy.position, enemy.stats.originalColor || 0xffffff, 8);
        this.spawnPoof(enemy.position);

        this.totalConvinced++;

        if (!enemy.stats.noLoot) {
          if (enemy.stats.type === 'LeaRaph') this.spawnBigXP(enemy.position);
          else this.dropLoot(enemy.position);
        }

        if (enemy.stats.lastHitBy) {
          this.addToKillFeed(enemy.stats.type, enemy.stats.lastHitBy);
        }

        // Combos
        if (enemy.stats.type === 'JournalisteF' || enemy.stats.type === 'JournalisteH') {
          this.journalisteKills++;
          const reqJ = this.getComboReq(30);
          if (this.journalisteKills >= reqJ) {
            this.journalisteKills = 0;
            this.spawnSpecialItem('magnet');
          }
        }

        if (['Poli', 'Glucks'].includes(enemy.stats.type)) {
          this.politicienKills++;
          const reqP = this.getComboReq(15);
          if (this.politicienKills >= reqP) {
            this.politicienKills = 0;
            this.spawnSpecialItem('health');
          }

          if (enemy.stats.type === 'Glucks' && !enemy.stats.isMiniBoss) {
            this.glucksKills++;
            if (this.glucksKills >= 15) {
              this.glucksKills = 0;
              this.spawnMiniBoss('GrosGlucks', enemy.position);
            }
          } else if (enemy.stats.type === 'Poli' && !enemy.stats.isMiniBoss) {
            this.tondelierKills++;
            if (this.tondelierKills >= 15) {
              this.tondelierKills = 0;
              this.spawnMiniBoss('GrosseTondelier', enemy.position);
            }
          }
        }

        this.enemies.splice(i, 1);
      }
    }
  }

  // ==================== WEAPONS & COMBAT ====================
  private updatePowers(delta: number) {
    this.activePowers.forEach((power) => {
      power.timer -= delta;
      if (power.timer <= 0) {
        if (power.cooldown > 0) {
          if (power.onFire) power.onFire();
          power.timer = power.cooldown;
        } else {
          if (power.onFire) power.onFire();
        }
      }
    });

    for (let i = this.auras.length - 1; i >= 0; i--) {
      const aura = this.auras[i];
      aura.life -= delta;

      if (aura.type === 'shield_orb') {
        aura.angle += aura.speed * delta;
        aura.mesh.position.x = this.player.position.x + Math.cos(aura.angle) * aura.radius;
        aura.mesh.position.y = this.player.position.y + Math.sin(aura.angle) * aura.radius;

        const power = this.activePowers.find((p) => p.id === 'garantie_autonomie');
        const pLvl = power ? power.level : 1;
        const dps = (50 + pLvl * 20) * (1 + this.player.stats.level * 0.1);
        const dmg = dps * delta;

        this.enemies.forEach((enemy) => {
          if (aura.mesh.position.distanceTo(enemy.position) < 0.8) {
            enemy.stats.hp -= dmg;
            enemy.stats.lastHitBy = 'garantie_autonomie';
            enemy.orbDamageAccum = (enemy.orbDamageAccum || 0) + dmg;
            if (enemy.orbDamageAccum >= 15) {
              this.spawnDamageText(enemy.position, Math.floor(enemy.orbDamageAccum));
              enemy.orbDamageAccum = 0;
            }
          }
        });
      } else if (aura.type === 'regle_verte') {
        aura.mesh.position.copy(this.player.position);
        aura.mesh.rotation.z += delta * 2;
        const power = this.activePowers.find((p) => p.id === 'regle_verte');
        const pLvl = power ? power.level : 1;
        const dps = (20 + pLvl * 10) * (1 + this.player.stats.level * 0.1);
        const dmg = dps * delta;

        this.enemies.forEach((enemy) => {
          if (this.player.position.distanceTo(enemy.position) <= aura.radius) {
            enemy.stats.hp -= dmg;
            enemy.stats.lastHitBy = 'regle_verte';
          }
        });
      } else if (aura.type === 'retraite_slow') {
        aura.mesh.position.copy(this.player.position);
        this.enemies.forEach((enemy) => {
          if (this.player.position.distanceTo(enemy.position) <= aura.radius) {
            enemy.stats.slowTimer = 0.5;
          }
        });
      }

      if (aura.life <= 0 && aura.type !== 'shield_orb') {
        this.scene.remove(aura.mesh);
        this.auras.splice(i, 1);
      }
    }
  }

  private fireCash() {
    const target = this.getNearestEnemy();
    let dx = this.player.stats.facingRight ? 1 : -1;
    let dy = this.player.stats.facingFront ? -1 : 1;

    if (target) {
      dx = target.position.x - this.player.position.x;
      dy = target.position.y - this.player.position.y;
    }
    const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));

    const geo = new THREE.PlaneGeometry(1.0, 1.0);
    const mat = new THREE.MeshBasicMaterial({
      map: this.sprites.billet_vert || null,
      transparent: true,
      side: THREE.DoubleSide
    });
    const proj = new THREE.Mesh(geo, mat);
    proj.position.copy(this.player.position);
    proj.rotation.z = Math.atan2(dy, dx);

    this.scene.add(proj);
    this.projectiles.push({
      mesh: proj,
      type: 'cash',
      vx: (dx / dist) * 10,
      vy: (dy / dist) * 10,
      life: 2.0,
      damage: 10,
      pierce: 0
    });
    this.playSound(0, 'cash', 0.15);
  }

  private fireWaterJet() {
    const target = this.getNearestEnemy();
    let dx = this.player.stats.facingRight ? 1 : -1;
    let dy = this.player.stats.facingFront ? -1 : 1;

    if (target) {
      dx = target.position.x - this.player.position.x;
      dy = target.position.y - this.player.position.y;
    }
    const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
    dx /= dist;
    dy /= dist;

    const geo = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x3498db });
    const proj = new THREE.Mesh(geo, mat);
    proj.position.copy(this.player.position);
    proj.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;

    this.scene.add(proj);
    this.projectiles.push({
      mesh: proj,
      type: 'water',
      vx: dx * 15,
      vy: dy * 15,
      life: 1.5,
      damage: 15,
      pierce: 999
    });
    this.playSound(800, 'noise', 0.3);
  }

  private activateRegleVerte() {
    let existing = this.auras.find((a) => a.type === 'regle_verte');
    if (existing) {
      existing.life = 1.0;
      return;
    }

    const geo = new THREE.TorusGeometry(2, 0.1, 8, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0x27ae60 });
    const auraMesh = new THREE.Mesh(geo, mat);
    this.scene.add(auraMesh);

    this.auras.push({
      mesh: auraMesh,
      type: 'regle_verte',
      radius: 2,
      life: 1.0
    });
  }

  private activateRetraiteSlow() {
    let existing = this.auras.find((a) => a.type === 'retraite_slow');
    if (existing) {
      existing.life = 1.0;
      return;
    }

    const geo = new THREE.RingGeometry(2.8, 3, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x9b59b6, side: THREE.DoubleSide });
    const auraMesh = new THREE.Mesh(geo, mat);
    this.scene.add(auraMesh);

    this.auras.push({
      mesh: auraMesh,
      type: 'retraite_slow',
      radius: 3,
      life: 1.0
    });
  }

  private activateOrbShield() {
    const existingOrbs = this.auras.filter((a) => a.type === 'shield_orb');
    if (existingOrbs.length > 2) return;

    const geo = new THREE.SphereGeometry(0.3, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf39c12 });
    const orb = new THREE.Mesh(geo, mat);
    this.scene.add(orb);

    this.auras.push({
      mesh: orb,
      type: 'shield_orb',
      angle: existingOrbs.length * ((Math.PI * 2) / 3),
      speed: 3.0,
      radius: 2.0,
      life: 9999
    });
  }

  private freezeEnemies() {
    const geo = new THREE.RingGeometry(0.5, 1, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true });
    const shockwave = new THREE.Mesh(geo, mat);
    shockwave.position.copy(this.player.position);
    this.scene.add(shockwave);

    this.auras.push({
      mesh: shockwave,
      type: 'freeze_shockwave',
      life: 0.5
    });

    this.enemies.forEach((e) => {
      e.stats.frozenTimer = 3.0;
      (e.material as THREE.MeshBasicMaterial).color.setHex(0x00ffff);
      setTimeout(() => {
        if (e && e.material && e.stats) {
          (e.material as THREE.MeshBasicMaterial).color.setHex(e.stats.originalColor);
        }
      }, 3000);
    });
    this.playSound(800, 'sine', 0.3);
  }

  private fireISF() {
    const target = this.getNearestEnemy();
    if (!target) return;

    const geo = new THREE.PlaneGeometry(3, 10);
    const mat = new THREE.MeshBasicMaterial({
      map: this.sprites.isfclim || null,
      transparent: true,
      side: THREE.DoubleSide
    });
    const lightning = new THREE.Mesh(geo, mat);
    lightning.position.copy(target.position);
    lightning.position.y += 5;
    lightning.position.z = 2;
    this.scene.add(lightning);

    target.stats.hp -= 25;
    target.stats.lastHitBy = 'isf_climatique';
    this.spawnDamageText(target.position, 25);
    this.playSound(400, 'square', 0.2);

    setTimeout(() => {
      this.scene.remove(lightning);
    }, 150);
  }

  private fireRevocation() {
    if (this.enemies.length === 0) return;

    let target = this.enemies[0];
    for (let i = 1; i < this.enemies.length; i++) {
      if (this.enemies[i].stats.maxHp > target.stats.maxHp) {
        target = this.enemies[i];
      }
    }

    const power = this.activePowers.find((p) => p.id === 'revocation_elus');
    const level = power ? power.level : 1;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RÉVOQUÉ', 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.BoxGeometry(4, 1, 0.5);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const meteor = new THREE.Mesh(geo, mat);
    meteor.position.copy(target.position);
    meteor.position.z = 20;
    this.scene.add(meteor);

    this.auras.push({
      mesh: meteor,
      type: 'revocation_meteor',
      target,
      damage: 100 * level,
      life: 1.0
    });
  }

  private fireReferendum() {
    const power = this.activePowers.find((p) => p.id === 'referendum_autodetermination');
    const lvl = power ? power.level : 1;
    const radius = 3 + lvl * 0.5;
    const duration = 5 + lvl;
    const conversionChance = 0.3 + lvl * 0.05;

    const colors = [0x009a44, 0x009a44, 0x0032a0, 0xce1126];
    const rings: THREE.Mesh[] = [];
    colors.forEach((c, idx) => {
      const geo = new THREE.RingGeometry(radius * (0.5 + idx * 0.17), radius * (0.5 + idx * 0.17) + 0.15, 32);
      const mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.copy(this.player.position);
      ring.position.z = 0.1;
      this.scene.add(ring);
      rings.push(ring);
    });

    const fGeo = new THREE.CircleGeometry(radius, 32);
    const fMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const fMesh = new THREE.Mesh(fGeo, fMat);
    fMesh.position.copy(this.player.position);
    fMesh.position.z = 0.05;
    this.scene.add(fMesh);

    this.referendumZones.push({
      rings,
      fill: fMesh,
      center: this.player.position.clone(),
      radius,
      duration,
      conversionChance,
      life: duration
    });
    this.playSound(300, 'sine', 0.3);
  }

  private updateReferendumZones(delta: number) {
    for (let i = this.referendumZones.length - 1; i >= 0; i--) {
      const z = this.referendumZones[i];
      z.life -= delta;

      this.enemies.forEach((enemy) => {
        if (!enemy.stats.converted && enemy.position.distanceTo(z.center) <= z.radius) {
          if (Math.random() < z.conversionChance * delta) {
            enemy.stats.converted = true;
            (enemy.material as THREE.MeshBasicMaterial).color.setHex(0x2ecc71);
            enemy.stats.hp = 0; // instantly convince
          }
        }
      });

      if (z.life <= 0) {
        z.rings.forEach((r: THREE.Mesh) => this.scene.remove(r));
        this.scene.remove(z.fill);
        this.referendumZones.splice(i, 1);
      }
    }
  }

  private fireKranidosRush() {
    this.kranidosInvincible = true;
    let dx = this.player.stats.facingRight ? 1 : -1;
    let dy = this.player.stats.facingFront ? -1 : 1;
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;

    const chargeDuration = 0.5;
    const startPos = this.player.position.clone();
    const endPos = new THREE.Vector3(startPos.x + dx * 12, startPos.y + dy * 12, startPos.z);

    this.player.position.copy(endPos);
    this.playSound(200, 'sawtooth', 0.4);

    this.fireTrails.push({
      start: startPos,
      end: endPos,
      life: 4.0,
      damage: 8
    });

    setTimeout(() => {
      this.kranidosInvincible = false;
    }, chargeDuration * 1000);
  }

  private updateFireTrails(delta: number) {
    for (let i = this.fireTrails.length - 1; i >= 0; i--) {
      const t = this.fireTrails[i];
      t.life -= delta;

      this.enemies.forEach((enemy) => {
        const d = this.distToSegment(enemy.position, t.start, t.end);
        if (d < 1.5) {
          enemy.stats.hp -= t.damage * delta;
          enemy.stats.lastHitBy = 'kranidos_rush';
        }
      });

      if (t.life <= 0) {
        this.fireTrails.splice(i, 1);
      }
    }
  }

  private distToSegment(p: THREE.Vector3, v: THREE.Vector3, w: THREE.Vector3): number {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return p.distanceTo(v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = new THREE.Vector3(v.x + t * (w.x - v.x), v.y + t * (w.y - v.y), 0);
    return p.distanceTo(proj);
  }

  private getNearestEnemy(): (THREE.Mesh & { stats: any }) | null {
    let nearest: any = null;
    let minDist = Infinity;
    this.enemies.forEach((enemy) => {
      const d = this.player.position.distanceTo(enemy.position);
      if (d < minDist) {
        minDist = d;
        nearest = enemy;
      }
    });
    return nearest;
  }

  private updateProjectiles(delta: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (p.mesh.position.distanceTo(enemy.position) < 0.8) {
          if (enemy.stats.dodgeChance && Math.random() < enemy.stats.dodgeChance) {
            this.spawnDamageText(enemy.position, 0); // Esquive
          } else {
            enemy.stats.hp -= p.damage;
            enemy.stats.lastHitBy = p.type;
            this.spawnDamageText(enemy.position, p.damage);
          }

          if (p.pierce <= 0) {
            p.life = 0;
            break;
          } else {
            p.pierce--;
          }
        }
      }

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateEnemyProjectiles(delta: number) {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i];
      p.life -= delta;
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;

      if (p.mesh.position.distanceTo(this.player.position) < 0.8) {
        this.damagePlayer(p.damage);
        p.life = 0;
      }

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  private createTextProjectile(text: string, pos: THREE.Vector3, vx: number, vy: number, color: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = color;
    ctx.fillText(text, 10, 35);

    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(6, 0.75);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    const dx = this.player.position.x - pos.x;
    const dy = this.player.position.y - pos.y;
    const dist = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));

    this.enemyProjectiles.push({
      mesh,
      vx: (dx / dist) * vy,
      vy: (dy / dist) * vy,
      life: 5.0,
      maxLife: 5.0,
      damage: 1
    });
  }

  // ==================== LOOT & ALLIES ====================
  private dropLoot(pos: THREE.Vector3) {
    const rand = Math.random();
    let type = 'xp';
    let map = this.sprites.mail || null;

    if (rand < 0.05) {
      type = 'heal';
      map = this.sprites.laitfraise || null;
    } else if (rand < 0.08) {
      type = 'invul';
      map = this.sprites.maillotinvul || null;
    } else if (rand < 0.1) {
      type = 'colis';
      map = this.sprites.colis || null;
    }

    const geo = new THREE.PlaneGeometry(0.8, 0.8);
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide });
    const drop = new THREE.Mesh(geo, mat) as any;
    drop.position.copy(pos);
    drop.stats = { type, value: 1 };
    this.scene.add(drop);
    this.lootDrops.push(drop);
  }

  private spawnBigXP(pos: THREE.Vector3) {
    const geo = new THREE.PlaneGeometry(1.5, 1.5);
    const mat = new THREE.MeshBasicMaterial({ map: this.sprites.mail || null, transparent: true, side: THREE.DoubleSide });
    const loot = new THREE.Mesh(geo, mat) as any;
    loot.position.copy(pos);
    loot.stats = { type: 'BigXP', value: 10 };
    this.scene.add(loot);
    this.lootDrops.push(loot);
  }

  public spawnSpecialItem(type: string) {
    let map = this.sprites.aimant;
    if (type === 'health') map = this.sprites.laitfraise;

    const geo = new THREE.PlaneGeometry(1.2, 1.2);
    const mat = new THREE.MeshBasicMaterial({ map: map || null, transparent: true, side: THREE.DoubleSide });
    const item = new THREE.Mesh(geo, mat) as any;
    item.position.set(this.player.position.x + (Math.random() - 0.5) * 4, this.player.position.y + (Math.random() - 0.5) * 4, 0);
    item.stats = { type, value: 50 };
    this.scene.add(item);
    this.lootDrops.push(item);
  }

  private updateLoot(delta: number) {
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const loot = this.lootDrops[i];
      const dist = this.player.position.distanceTo(loot.position);

      if (dist < this.player.stats.pickupRadius) {
        const dx = this.player.position.x - loot.position.x;
        const dy = this.player.position.y - loot.position.y;
        loot.position.x += (dx / dist) * 12 * delta;
        loot.position.y += (dy / dist) * 12 * delta;
      }

      if (dist < 0.6) {
        if (loot.stats.type === 'xp' || loot.stats.type === 'BigXP') {
          const power = this.activePowers.find((p) => p.id === 'allocation_autonomie');
          const multiplier = 1 + (power ? power.level * 0.2 : 0);
          this.player.stats.xp += loot.stats.value * multiplier;
          this.playSound(500, 'sine', 0.05);

          if (this.player.stats.xp >= this.player.stats.maxXp) {
            this.player.stats.xp -= this.player.stats.maxXp;
            this.player.stats.level++;
            this.player.stats.maxXp = Math.floor(this.player.stats.maxXp * 1.3);
            this.triggerLevelUp();
          }
        } else if (loot.stats.type === 'heal' || loot.stats.type === 'health') {
          this.healPlayer(25);
        } else if (loot.stats.type === 'invul') {
          this.player.stats.invincible = true;
          (this.player.material as THREE.MeshBasicMaterial).color.setHex(0xf1c40f);
          setTimeout(() => {
            if (this.player && this.player.material) {
              this.player.stats.invincible = false;
              (this.player.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
            }
          }, 5000);
        } else if (loot.stats.type === 'magnet') {
          this.lootDrops.forEach((l) => {
            l.position.copy(this.player.position);
          });
          this.playSound(800, 'sine', 0.2);
        } else if (loot.stats.type === 'colis') {
          this.healPlayer(50);
          this.lootDrops.forEach((l) => {
            l.position.copy(this.player.position);
          });
        }

        this.scene.remove(loot);
        this.lootDrops.splice(i, 1);
      }
    }
  }

  private spawnRalliement(): { id: string; name: string } {
    const allyNames = [
      { id: 'rousso', name: 'Sandrine Rousseau' },
      { id: 'rima', name: 'Rima Hassan' },
      { id: 'poutou', name: 'Philippe Poutou' },
      { id: 'ruffin', name: 'François Ruffin' }
    ];
    const type = allyNames[Math.floor(Math.random() * allyNames.length)];
    const maps: Record<string, THREE.Texture> = {
      rousso: this.sprites.roussoR,
      rima: this.sprites.rimaR,
      poutou: this.sprites.poutouR,
      ruffin: this.sprites.ruffin
    };
    const allyMap = maps[type.id] || null;

    const geo = new THREE.PlaneGeometry(2.0, 2.0);
    const mat = new THREE.MeshBasicMaterial({ map: allyMap, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(this.player.position.x + 3, this.player.position.y + 3, 1);

    this.scene.add(mesh);
    this.allies.push({ mesh, life: 20.0, maxLife: 20.0, type });
    this.callbacks.onAllyDefense(true);
    return type;
  }

  private updateRalliement(delta: number) {
    let anyAllyNear = false;

    for (let i = this.allies.length - 1; i >= 0; i--) {
      const ally = this.allies[i];
      ally.life -= delta;
      if (ally.life <= 0) {
        this.scene.remove(ally.mesh);
        this.allies.splice(i, 1);
        continue;
      }

      const dx = this.player.position.x - ally.mesh.position.x;
      const dy = this.player.position.y - ally.mesh.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 3.5) anyAllyNear = true;

      if (dist > 2.5) {
        ally.mesh.position.x += (dx / dist) * 3.5 * delta;
        ally.mesh.position.y += (dy / dist) * 3.5 * delta;
      }

      // Damage nearby
      if (Math.random() < delta * 2) {
        this.enemies.forEach((enemy) => {
          if (enemy.position.distanceTo(ally.mesh.position) <= 3.0) {
            enemy.stats.hp -= 15;
            enemy.stats.lastHitBy = 'Ralliement';
            this.spawnDamageText(enemy.position, 15);
          }
        });
      }
    }

    if (anyAllyNear && this.player.stats.hp < this.player.stats.maxHp) {
      this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + delta);
    }
    this.callbacks.onAllyDefense(this.allies.length > 0);
  }

  // ==================== VISUAL EFFECTS ====================
  private spawnParticles(pos: THREE.Vector3, color: number, count = 5, speed = 2) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.PlaneGeometry(0.1, 0.1);
      const mat = new THREE.MeshBasicMaterial({ color });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos);
      const angle = Math.random() * Math.PI * 2;
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3
      });
    }
  }

  private updateParticles(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnPoof(pos: THREE.Vector3) {
    const geo = new THREE.PlaneGeometry(1.5, 1.5);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(pos);
    this.scene.add(p);
    this.poofs.push({
      mesh: p,
      life: 0.3,
      maxLife: 0.3,
      vrx: 0,
      vry: 0,
      vrz: 1
    });
  }

  private updatePoofs(delta: number) {
    for (let i = this.poofs.length - 1; i >= 0; i--) {
      const p = this.poofs[i];
      p.life -= delta;
      p.mesh.scale.setScalar(1 + (p.maxLife - p.life) * 4);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = (p.life / p.maxLife) * 0.8;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.poofs.splice(i, 1);
      }
    }
  }

  private spawnDamageText(pos: THREE.Vector3, amount: number) {
    if (!this.showDamageNumbers) return;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#ff3333';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(Math.ceil(amount).toString(), 64, 32);
    ctx.fillText(Math.ceil(amount).toString(), 64, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new THREE.PlaneGeometry(1, 0.5);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y += 0.5;
    mesh.position.z = 2;
    this.scene.add(mesh);
    this.damageTexts.push({
      mesh,
      life: 0.8,
      maxLife: 0.8,
      vy: 2.0
    });
  }

  private updateDamageTexts(delta: number) {
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const t = this.damageTexts[i];
      t.life -= delta;
      t.mesh.position.y += t.vy * delta;
      (t.mesh.material as THREE.MeshBasicMaterial).opacity = t.life / t.maxLife;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        this.damageTexts.splice(i, 1);
      }
    }
  }

  // ==================== PROCEDURAL CHUNKS & PROPS ====================
  private updateChunks() {
    const px = this.player.position.x;
    const py = this.player.position.y;

    this.groundChunks.forEach((chunk) => {
      const dx = px - chunk.position.x;
      const dy = py - chunk.position.y;
      let repositioned = false;

      if (dx > this.CHUNK_SIZE * 1.5) {
        chunk.position.x += this.CHUNK_SIZE * 3;
        repositioned = true;
      } else if (dx < -this.CHUNK_SIZE * 1.5) {
        chunk.position.x -= this.CHUNK_SIZE * 3;
        repositioned = true;
      }

      if (dy > this.CHUNK_SIZE * 1.5) {
        chunk.position.y += this.CHUNK_SIZE * 3;
        repositioned = true;
      } else if (dy < -this.CHUNK_SIZE * 1.5) {
        chunk.position.y -= this.CHUNK_SIZE * 3;
        repositioned = true;
      }

      const dist = Math.sqrt(chunk.position.x * chunk.position.x + chunk.position.y * chunk.position.y);
      let targetMap = this.concreteTex;
      if (dist > 100) targetMap = this.sandTex;
      else if (dist > 50) targetMap = this.floorTex;

      const mat = chunk.material as THREE.MeshBasicMaterial;
      if (mat.map !== targetMap) {
        mat.map = targetMap;
        mat.needsUpdate = true;
      }

      if (repositioned) {
        this.generatePropsForChunk(chunk, false);
      }
    });
  }

  private generatePropsForChunk(chunk: THREE.Mesh, isInit = false) {
    for (let i = this.environmentProps.length - 1; i >= 0; i--) {
      if (this.environmentProps[i].userData.chunk === chunk) {
        this.scene.remove(this.environmentProps[i]);
        this.environmentProps.splice(i, 1);
      }
    }

    const dist = Math.sqrt(chunk.position.x * chunk.position.x + chunk.position.y * chunk.position.y);
    if (isInit && dist < 20) return;

    if (Math.random() < 0.3) {
      const wx = chunk.position.x + (Math.random() - 0.5) * this.CHUNK_SIZE * 0.5;
      const wy = chunk.position.y + (Math.random() - 0.5) * this.CHUNK_SIZE * 0.5;
      const width = 2 + Math.random() * 8;
      const height = 2 + Math.random() * 8;
      const geo = new THREE.PlaneGeometry(width, height);
      const color = Math.floor(Math.random() * 16777215);
      const mat = new THREE.MeshBasicMaterial({ color });
      const wall = new THREE.Mesh(geo, mat);
      wall.position.set(wx, wy, 0.5);
      wall.userData = { chunk, isWall: true, width, height };
      this.scene.add(wall);
      this.environmentProps.push(wall as any);
    }
  }

  private createConcreteTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 40;
      imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + noise));
      imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + noise));
      imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    return tex;
  }

  private createFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 512; i += 4) {
      ctx.fillStyle = Math.random() > 0.5 ? '#7A4B22' : '#9C6933';
      ctx.fillRect(0, i, 512, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    return tex;
  }

  private createSandTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#E2C275';
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + noise + 10));
      imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + noise));
      imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    return tex;
  }

  // ==================== AUDIO HELPERS ====================
  public playSound(freq: number, type: OscillatorType | 'noise' | 'cash' | 'thud' = 'sine', duration = 0.1, delay = 0) {
    if (!this.audioCtx || !this.masterGainNode) return;
    this.resumeAudioContext();

    if (type === 'noise') {
      const bufferSize = this.audioCtx.sampleRate * duration;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq;
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.5, this.audioCtx.currentTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + delay + duration);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGainNode);
      noise.start(this.audioCtx.currentTime + delay);
      return;
    }

    if (type === 'cash') {
      this.playSound(2000, 'sine', 0.05, delay);
      this.playSound(3000, 'sine', 0.1, delay + 0.05);
      return;
    }

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    osc.type = type as OscillatorType;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + delay);
    gainNode.gain.setValueAtTime(0.5, this.audioCtx.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + delay + duration);

    osc.connect(gainNode);
    gainNode.connect(this.masterGainNode);
    osc.start(this.audioCtx.currentTime + delay);
    osc.stop(this.audioCtx.currentTime + delay + duration);
  }

  public playAudioBuffer(buffer: AudioBuffer, vol = 1.0) {
    if (!this.audioCtx || !buffer || !this.masterGainNode) return;
    this.resumeAudioContext();

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    if (vol !== 1.0) {
      const gain = this.audioCtx.createGain();
      gain.gain.value = vol;
      source.connect(gain);
      gain.connect(this.masterGainNode);
    } else {
      source.connect(this.masterGainNode);
    }
    source.start();
  }

  // ==================== EVENTS & INPUTS ====================
  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('resize', this.onWindowResize.bind(this));

    window.addEventListener('pointerdown', (e) => {
      this.resumeAudioContext();
      if (this.gameState !== 'PLAYING') return;
      if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('#hud')) return;
      this.pointerActive = true;
      this.updatePointerTarget(e);
    });
    window.addEventListener('pointermove', (e) => {
      if (this.pointerActive) this.updatePointerTarget(e);
    });
    window.addEventListener('pointerup', () => {
      this.pointerActive = false;
    });
    window.addEventListener('pointercancel', () => {
      this.pointerActive = false;
    });
  }

  private onKeyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();

    if (e.key === 'Escape' && (this.gameState === 'PLAYING' || this.gameState === 'PAUSED')) {
      this.togglePause();
      return;
    }

    if (e.key === 'Tab' && (this.gameState === 'PLAYING' || this.gameState === 'PAUSED_LITE')) {
      e.preventDefault();
      this.togglePauseLite();
      return;
    }

    if (e.key === ' ' && this.gameState === 'PLAYING') {
      this.triggerDash();
    }

    if (k === this.keyBinds.up || e.key === 'ArrowUp') this.keys.up = true;
    if (k === this.keyBinds.down || e.key === 'ArrowDown') this.keys.down = true;
    if (k === this.keyBinds.left || e.key === 'ArrowLeft') this.keys.left = true;
    if (k === this.keyBinds.right || e.key === 'ArrowRight') this.keys.right = true;

    // Cheats in Pause Lite
    if (this.gameState === 'PAUSED_LITE') {
      let digit = '';
      if (k === '1' || e.key === '&') digit = '1';
      else if (k === '2' || e.key === 'é') digit = '2';
      this.pauseCheatBuffer += digit || k;
      if (this.pauseCheatBuffer.length > 10) this.pauseCheatBuffer = this.pauseCheatBuffer.slice(-10);

      if (this.pauseCheatBuffer.endsWith('1212')) {
        this.pauseCheatBuffer = '';
        this.gameSpeedMultiplier = this.gameSpeedMultiplier === 2.0 ? 1.0 : 2.0;
        this.playSound(600, 'sine', 0.1);
        this.callbacks.onBreakingNews(
          this.gameSpeedMultiplier === 2.0 ? '⚡ CHEAT ACTIVÉ : VITESSE X2 ⚡' : '⚡ CHEAT DÉSACTIVÉ : VITESSE X1 ⚡',
          'custom'
        );
      } else if (this.pauseCheatBuffer.endsWith('end')) {
        this.pauseCheatBuffer = '';
        this.gameTime = 11 * 60 + 30;
        this.callbacks.onBreakingNews('⚡ CHEAT ACTIVÉ : 11m30 ⚡', 'custom');
      } else if (this.pauseCheatBuffer.endsWith('kill')) {
        this.pauseCheatBuffer = '';
        this.enemies.forEach((en) => {
          if (en.stats) en.stats.hp = 0;
        });
        this.callbacks.onBreakingNews('⚡ CHEAT ACTIVÉ : PURGE TOTALE ⚡', 'custom');
      }
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (k === this.keyBinds.up || e.key === 'ArrowUp') this.keys.up = false;
    if (k === this.keyBinds.down || e.key === 'ArrowDown') this.keys.down = false;
    if (k === this.keyBinds.left || e.key === 'ArrowLeft') this.keys.left = false;
    if (k === this.keyBinds.right || e.key === 'ArrowRight') this.keys.right = false;
  }

  private updatePointerTarget(e: PointerEvent) {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 16;
    const worldX = this.camera.position.x + x * ((frustumSize * aspect) / 2);
    const worldY = this.camera.position.y + y * (frustumSize / 2);
    this.pointerTarget.set(worldX, worldY);
  }

  public onWindowResize() {
    if (!this.camera || !this.renderer) return;
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 16;
    this.camera.left = (-frustumSize * aspect) / 2;
    this.camera.right = (frustumSize * aspect) / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private pollGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp && gp.connected) {
        if (gp.buttons[9]?.pressed) {
          if (!(gp as any)._pausePressed) {
            this.togglePause();
            (gp as any)._pausePressed = true;
          }
        } else {
          (gp as any)._pausePressed = false;
        }

        if (gp.buttons[8]?.pressed) {
          if (!(gp as any)._litePausePressed) {
            this.togglePauseLite();
            (gp as any)._litePausePressed = true;
          }
        } else {
          (gp as any)._litePausePressed = false;
        }

        if (this.gameState === 'PLAYING') {
          const ax = gp.axes[0];
          const ay = gp.axes[1];
          if (Math.abs(ax) > 0.2) this.player.position.x += ax * 0.1;
          if (Math.abs(ay) > 0.2) this.player.position.y -= ay * 0.1;

          if (gp.buttons[0]?.pressed) {
            this.triggerDash();
          }
        }
      }
    }
  }

  // ==================== SAVE / LOAD / HELPERS ====================
  public saveGame(slot: number) {
    if (this.gameState !== 'PLAYING' && this.gameState !== 'PAUSED') return;
    const data: SaveSlotData = {
      time: this.gameTime,
      level: this.player.stats.level,
      hp: this.player.stats.hp,
      maxHp: this.player.stats.maxHp,
      xp: this.player.stats.xp,
      maxXp: this.player.stats.maxXp,
      totalConvinced: this.totalConvinced,
      activePowers: this.activePowers.map((p) => ({ id: p.id, level: p.level })),
      date: new Date().toLocaleDateString('fr-FR'),
      saveTime: this.formatTime(this.gameTime)
    };
    localStorage.setItem(`tortue_save_${slot}`, JSON.stringify(data));
  }

  public loadSave(slot: number): boolean {
    const raw = localStorage.getItem(`tortue_save_${slot}`);
    if (!raw) return false;
    try {
      const data: SaveSlotData = JSON.parse(raw);
      this.gameTime = data.time;
      this.player.stats.level = data.level;
      this.player.stats.hp = data.hp;
      this.player.stats.maxHp = data.maxHp;
      this.player.stats.xp = data.xp;
      this.player.stats.maxXp = data.maxXp;
      this.totalConvinced = data.totalConvinced;

      this.activePowers = [];
      data.activePowers.forEach((saved) => {
        const found = this.availablePowers.find((p) => p.id === saved.id);
        if (found) this.activePowers.push({ ...found, level: saved.level });
      });

      this.gameState = 'PLAYING';
      this.player.visible = true;
      this.lastTime = performance.now();
      this.callbacks.onStateChange(this.gameState);
      this.callbacks.onActivePowersChange([...this.activePowers]);
      return true;
    } catch {
      return false;
    }
  }

  public deleteSave(slot: number) {
    localStorage.removeItem(`tortue_save_${slot}`);
  }

  public restart() {
    window.location.reload();
  }

  public getComboReq(base: number): number {
    const lvl = this.player?.stats?.level || 1;
    let req = base;
    for (let i = 2; i <= lvl; i++) {
      req += i > 10 ? 5 : 1;
    }
    return req;
  }

  private addToKillFeed(enemyType: string, weaponId: string) {
    const key = `${enemyType}_${weaponId}`;
    if (!this.killFeedBuffer[key]) {
      this.killFeedBuffer[key] = { count: 0, enemyType, weaponId };
    }
    this.killFeedBuffer[key].count++;
  }

  private processKillFeedBuffer() {
    const names: Record<string, string> = {
      JournalisteF: 'Journaliste',
      JournalisteH: 'Journaliste',
      Poli: 'Politicien',
      Glucks: 'Glucksman',
      Bill1: 'Milliardaire',
      Bill2: 'Milliardaire'
    };
    const wNames: Record<string, string> = {
      cash: 'Le SMIC à 1700€',
      water: "Service Public de l'Eau",
      regle_verte: 'Règle Verte',
      retraite: 'Retraite à 60 ans',
      isf_climatique: 'ISF Climatique',
      revocation_elus: 'Révocation',
      blocage_prix: 'Blocage des Prix',
      kranidos_rush: 'Rush Kranidos',
      Ralliement: 'Ralliement',
      garantie_autonomie: "Garantie d'Autonomie"
    };

    for (const key in this.killFeedBuffer) {
      const entry = this.killFeedBuffer[key];
      const eName = names[entry.enemyType] || entry.enemyType;
      const wName = wNames[entry.weaponId] || entry.weaponId;
      const countText = entry.count > 1 ? ` X${entry.count}` : '';
      this.callbacks.onKillFeed(`${eName}${countText} convaincu(e)s par ${wName}`);
    }
    this.killFeedBuffer = {};
  }

  public formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.ostAudio.pause();
    if (this.bossMusicSource) {
      try {
        this.bossMusicSource.stop();
      } catch {}
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
    }
    this.renderer.dispose();
  }
}
