// ==========================================
// GAME CONSTANTS & VARIABLES
// ==========================================
const GAME_DURATION = 12 * 60; // 12 minutes in seconds
let gameState = 'START'; // START, PLAYING, LEVELUP, GAMEOVER, VICTORY
let gameTime = 0;
let lastTime = 0;

// Three.js Core
let scene, camera, renderer;
let totalAssetsToLoad = 0;
let loadedAssets = 0;
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
    totalAssetsToLoad = itemsTotal;
    loadedAssets = itemsLoaded;
    updateLoadingScreen();
};
const textureLoader = new THREE.TextureLoader(loadingManager);

function updateLoadingScreen() {
    const progressBar = document.getElementById('loading-progress-bar');
    if (progressBar && totalAssetsToLoad > 0) {
        let percent = (loadedAssets / totalAssetsToLoad) * 100;
        progressBar.style.width = percent + '%';
        if (loadedAssets >= totalAssetsToLoad) {
            setTimeout(() => {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) loadingScreen.classList.add('hidden');
            }, 500);
        }
    }
}

function loadAudioWithProgress(url) {
    totalAssetsToLoad++;
    updateLoadingScreen();
    return fetch(url)
        .then(res => res.arrayBuffer())
        .then(buf => audioCtx.decodeAudioData(buf))
        .then(audio => {
            loadedAssets++;
            updateLoadingScreen();
            return audio;
        })
        .catch(e => {
            console.log(url + ' non trouvé', e);
            loadedAssets++;
            updateLoadingScreen();
            return null;
        });
}

// Player
let player;
const PLAYER_SPEED = 5;
const keyBinds = { up: 'z', down: 's', left: 'q', right: 'd' };
const keys = { up: false, down: false, left: false, right: false };
let waitingForKey = null;

// Player Sprites
const sprites = {
    leftback: null,
    leftfront: null,
    rightback: null,
    rightfront: null
};

// Entities Arrays
const enemies = [];
const lootDrops = [];
const projectiles = [];
const enemyProjectiles = [];
const auras = [];
const particles = [];
const mapItems = [];
const environmentProps = [];

// Game Systems
let spawnTimer = 0;
const BASE_SPAWN_RATE = 1.0;
let leaRaphTimer = 0;
let leaRaphSpawnCount = 0;
let journalisteKills = 0;
let politicienKills = 0;
let glucksKills = 0;
let tondelierKills = 0;

function getComboReq(base) {
    if (!player || !player.stats) return base;
    let lvl = player.stats.level || 1;
    let req = base;
    for (let i = 2; i <= lvl; i++) {
        req += (i > 10) ? 5 : 1;
    }
    return req;
}

let bossSpawned = false;
let overhealTimer = 0;
let milkshakeTimer = 0; // Keeping for reference if needed, but not used for spawn anymore
let magnetTimer = 0;
let threatTimer = 0;
let threatCount = 0;
let bossOstFadeStarted = false;

// Audio Context
let audioCtx;
let masterGainNode;
let abatezSound = null;
let rewardSound = null;
let isfclimTexture = null;
let faitesMieuxSound = null;

let glucksvlfSound = null;
let tondelierEtcaSound = null;
let bossSound = null;
let bossBgMusic = null;
let silenceSound = null;
let bootsSound = null;
// Effects & Boss States
let hitstopTimer = 0;
let screenShakeTimer = 0;

let breakingNewsTimer = 0;
let nextBreakingNewsTime = 30 + Math.random() * 60; // First news between 30s and 90s

let lastOstIndex = -1;
let ostTracks = [
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

// Auto-detect new OSTs (works if hosted via local directory listing server)
fetch('source/ost/')
    .then(res => res.text())
    .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'))
                           .map(a => a.getAttribute('href'))
                           .filter(name => name.toLowerCase().endsWith('.mp3') && !name.toLowerCase().includes('title theme tortue survivor.mp3'));
        if (links.length > 0) {
            ostTracks = links.map(name => {
                let cleanName = decodeURIComponent(name).replace(/^[\/\\]/, '');
                if (!cleanName.toLowerCase().startsWith('source/ost/')) {
                    // Extract just filename if path is complex
                    const parts = cleanName.split(/[\/\\]/);
                    cleanName = 'source/ost/' + parts[parts.length - 1];
                }
                return cleanName;
            });
        }
    })
    .catch(e => console.log('OST auto-detect skipped (normal for static hosting).'));
const ostAudio = new Audio();
ostAudio.loop = false; // We use the 'ended' event to play next randomly

// Biomes
const CHUNK_SIZE = 40;
let groundChunks = [];
let concreteTex, floorTex, sandTex;

// ==========================================
// AVAILABLE POWERS
// ==========================================
// Visual Effects
let shakeTimer = 0;
let flashTimer = 0;

let totalConvinced = 0;
let ralliementActive = false;
let ralliementTimer = 0;
let ralliementPos = { x: 0, y: 0 };
let ralliementSprite = null;
let lastAllyThreshold = 0; // Track ally spawn milestones
let uiScale = 1.0; // UI scale factor
let remainingRerolls = 3;

// Ally names
const allyNames = [
    { id: 'rousso', name: 'Sandrine Rousseau' },
    { id: 'rima', name: 'Rima Hassan' },
    { id: 'poutou', name: 'Philippe Poutou' },
    { id: 'ruffin', name: 'François Ruffin' }
];

const availablePowers = [
    {
        id: 'regle_verte',
        name: "La Règle Verte",
        category: "Offensif",
        desc: "Une aura constante qui blesse les ennemis au contact.",
        icon: '<i data-lucide="book"></i>',
        cooldown: 0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Augmente les dégâts de zone (Niv ${lvl+1})`,
        onFire: () => { activateRegleVerte(); }
    },
    {
        id: 'service_eau',
        name: "Le Service Public de l'Eau",
        category: "Offensif",
        desc: "Tire un jet d'eau transperçant en direction des ennemis.",
        icon: '<i data-lucide="droplet"></i>',
        cooldown: 2.0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Réduit le temps de recharge (Niv ${lvl+1})`,
        onFire: () => { fireWaterJet(); }
    },
    {
        id: 'smic_1700',
        name: "Le SMIC à 1700€ net",
        category: "Offensif",
        desc: "Tire des billets de banque à haute vitesse.",
        icon: '<i data-lucide="banknote"></i>',
        cooldown: 0.8,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Tire plus fréquemment (Niv ${lvl+1})`,
        onFire: () => { fireCash(); }
    },
    {
        id: 'retraite_60',
        name: "Retraite à 60 ans",
        category: "Défensif",
        desc: "Aura qui ralentit considérablement les ennemis proches.",
        icon: '<i data-lucide="clock"></i>',
        cooldown: 0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Augmente la zone de ralentissement (Niv ${lvl+1})`,
        onFire: () => { activateRetraiteSlow(); }
    },
    {
        id: 'garantie_autonomie',
        name: "Garantie d'Autonomie",
        category: "Offensif",
        desc: "Bouclier rotatif autour du joueur.",
        icon: '<i data-lucide="shield-half"></i>',
        cooldown: 0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `+20 Dégâts de contact (Niv ${lvl+1})`,
        onFire: () => { activateOrbShield(); }
    },
    {
        id: 'blocage_prix',
        name: "Blocage des Prix",
        category: "Défensif",
        desc: "Gèle temporairement tous les ennemis à l'écran.",
        icon: '<i data-lucide="snowflake"></i>',
        cooldown: 8.0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Gel plus fréquent (Niv ${lvl+1})`,
        onFire: () => { freezeEnemies(); }
    },
    {
        id: 'isf_climatique',
        name: "ISF Climatique",
        category: "Offensif",
        desc: "Frappe aléatoirement les ennemis avec la foudre fiscale.",
        icon: '<i data-lucide="cloud-lightning"></i>',
        cooldown: 1.5,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Foudre plus rapide et violente (Niv ${lvl+1})`,
        onFire: () => { fireISF(); }
    },
    {
        id: 'cantine_gratuite',
        name: "Cantine Bio & Locale",
        category: "Défensif",
        desc: "Restaure de la vie passivement.",
        icon: '<i data-lucide="utensils"></i>',
        cooldown: 5.0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Soin plus régulier (Niv ${lvl+1})`,
        onFire: () => { player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + 2); }
    },
    {
        id: 'revocation_elus',
        name: "Révoquer les Élus",
        category: "Offensif",
        desc: "Fait chuter un panneau RÉVOQUÉ sur l'ennemi le plus fort.",
        icon: '<i data-lucide="hammer"></i>',
        cooldown: 5.0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `+100 Dégâts du panneau (Niv ${lvl+1})`,
        onFire: () => { fireRevocation(); }
    },
    {
        id: 'taxe_zucman',
        name: "Taxe Zucman",
        category: "Utilitaire",
        desc: "Passif: Réduit l'esquive des milliardaires (-2% par niveau).",
        icon: '<i data-lucide="percent"></i>',
        cooldown: 0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `-2% d'Esquive ennemie (Niv ${lvl+1})`,
        onFire: () => { /* passive */ }
    },
    {
        id: 'allocation_autonomie',
        name: "Allocation d'Autonomie",
        category: "Utilitaire",
        desc: "Passif: Augmente l'XP reçue des bulletins de vote.",
        icon: '<i data-lucide="graduation-cap"></i>',
        cooldown: 0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `Multiplicateur d'XP accru (Niv ${lvl+1})`,
        onFire: () => { /* passive */ }
    },
    {
        id: 'referendum_autodetermination',
        name: "Référendum d'Autodétermination",
        category: "Utilitaire",
        desc: "Zone au sol : les ennemis entrant dedans ont 30% de chance d'être convertis à la cause.",
        icon: '<i data-lucide="globe"></i>',
        cooldown: 8.0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `+ Rayon, Durée et % Chance (Niv ${lvl+1})`,
        onFire: () => { fireReferendum(); }
    },
    {
        id: 'kranidos_rush',
        name: "Le Rush Kranidos",
        category: "Offensif",
        desc: "Charge ultra-rapide dans la direction actuelle. Invincible pendant la charge. Laisse du sable incandescent (DoT).",
        icon: '<i data-lucide="zap"></i>',
        cooldown: 10.0,
        timer: 0,
        level: 0,
        getNextLevelDesc: (lvl) => `+60 Dégâts, + Distance, + Durée du Feu (Niv ${lvl+1})`,
        onFire: () => { fireKranidosRush(); }
    }
];
let activePowers = [];

let killFeedBuffer = {};
let killFeedTimer = 0;

// Pointer / Touch state
let pointerActive = false;
let pointerTarget = new THREE.Vector2();

// ==========================================
// ENVIRONMENT PROPS GENERATION
// ==========================================
function generatePropsForChunk(chunk, isInit = false) {
    // Remove old props for this chunk
    for (let i = environmentProps.length - 1; i >= 0; i--) {
        if (environmentProps[i].userData.chunk === chunk) {
            scene.remove(environmentProps[i]);
            environmentProps.splice(i, 1);
        }
    }

    const distFromOrigin = Math.sqrt(chunk.position.x * chunk.position.x + chunk.position.y * chunk.position.y);
    let biome = 'concrete';
    if (distFromOrigin > 100) biome = 'sand';
    else if (distFromOrigin > 50) biome = 'floor';

    // Don't spawn props too close to center on init
    if (isInit && distFromOrigin < 20) return;

    const numProps = 2 + Math.floor(Math.random() * 4);
    for(let i = 0; i < numProps; i++) {
        // Random pos inside chunk
        const px = chunk.position.x + (Math.random() - 0.5) * CHUNK_SIZE * 0.8;
        const py = chunk.position.y + (Math.random() - 0.5) * CHUNK_SIZE * 0.8;
        
        let map, width=2, height=2, isWall = false;
        
        if (biome === 'concrete') {
            if (Math.random() < 0.2) {
                map = getLucideTexture('car-front', 'transparent', '#555555', false);
                width = 3; height = 1.5;
            } else {
                map = getLucideTexture('align-justify', 'transparent', '#ffffff', false); // Road stripes
            }
        } else if (biome === 'floor') {
            map = getLucideTexture('armchair', 'transparent', '#8e44ad', false);
        } else if (biome === 'sand') {
            map = getLucideTexture('tree-palm', 'transparent', '#2ecc71', false);
        }
        
        const geo = new THREE.PlaneGeometry(width, height);
        const mat = new THREE.MeshBasicMaterial({ map: map, transparent: true, side: THREE.DoubleSide });
        const prop = new THREE.Mesh(geo, mat);
        prop.position.set(px, py, 0.05); // Just above ground
        prop.userData = { chunk: chunk, isWall: false, width: width, height: height };
        scene.add(prop);
        environmentProps.push(prop);
    }
    
    // Generate Walls
    if (Math.random() < 0.3) { // 30% chance per chunk
        const wx = chunk.position.x + (Math.random() - 0.5) * CHUNK_SIZE * 0.5;
        const wy = chunk.position.y + (Math.random() - 0.5) * CHUNK_SIZE * 0.5;
        
        // Formes aléatoires
        const width = 2 + Math.random() * 10;
        const height = 2 + Math.random() * 10;
        
        const geo = new THREE.PlaneGeometry(width, height);
        const randomColor = Math.floor(Math.random()*16777215);
        const mat = new THREE.MeshBasicMaterial({ color: randomColor }); // Colorful random block
        const wall = new THREE.Mesh(geo, mat);
        wall.position.set(wx, wy, 0.5);
        wall.userData = { chunk: chunk, isWall: true, width: width, height: height };
        scene.add(wall);
        environmentProps.push(wall);
    }
}

let fakeNewsSound = null;
let lastFakeNewsTime = -30;

function playFakeNewsSound() {
    if (!fakeNewsSound) return;
    if (gameTime - lastFakeNewsTime >= 45.0) {
        lastFakeNewsTime = gameTime;
        playAudioBuffer(fakeNewsSound);
    }
}

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
    // 1. Setup Audio
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.value = 0.5; // Default volume 50%
    masterGainNode.connect(audioCtx.destination);

    // 2. Setup Three.js
    const container = document.getElementById('game-container');
    
    // Use OrthographicCamera for 2D feel
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 16; // Zoom in by ~20% (was 20)
    camera = new THREE.OrthographicCamera(frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    scene = new THREE.Scene();
    
    // Memory Leak Fix: Auto-dispose geometries and materials on remove
    const originalRemove = scene.remove.bind(scene);
    scene.remove = function(object) {
        originalRemove(object);
        if (object) {
            object.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        mats.forEach(m => {
                            if (m.map && (m.map.isDynamicCanvas || m.map.isCanvasTexture || (m.map.image && m.map.image instanceof HTMLCanvasElement))) {
                                m.map.dispose();
                            }
                            m.dispose();
                        });
                    }
                }
            });
        }
    };
    
    scene.background = new THREE.Color(0x111111); 

    // Procedural Biomes
    concreteTex = createConcreteTexture();
    floorTex = createFloorTexture();
    sandTex = createSandTexture();
    
    // Create 3x3 grid of chunks
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            const chunkGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
            const chunkMat = new THREE.MeshBasicMaterial({ map: concreteTex, side: THREE.DoubleSide });
            const chunk = new THREE.Mesh(chunkGeo, chunkMat);
            chunk.position.set(x * CHUNK_SIZE, y * CHUNK_SIZE, -0.1);
            chunk.userData = { gridX: x, gridY: y };
            scene.add(chunk);
            groundChunks.push(chunk);
            generatePropsForChunk(chunk, true);
        }
    }

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 3. Load Assets
    sprites.leftback = textureLoader.load('source/leftback.png');
    sprites.leftfront = textureLoader.load('source/leftfront.png');
    sprites.rightback = textureLoader.load('source/rightback2.png');
    sprites.rightfront = textureLoader.load('source/rightfront.png');
    
    sprites.journaR = textureLoader.load('source/journaR.png');
    sprites.journaRm = textureLoader.load('source/journaRm.png');

    sprites.usR = textureLoader.load('source/usright.png');

    loadAudioWithProgress('source/fakenews.mp3').then(audio => { if(audio) fakeNewsSound = audio; });

    // Attempt to play OST in menu
    ostAudio.volume = 0.2; // default
    ostAudio.src = 'source/ost/Title Theme Tortue Survivor.mp3';
    ostAudio.loop = false;
    
    const unlockAudio = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        if (ostAudio && ostAudio.paused) {
            ostAudio.play().catch(e => console.log('OST autoplay issue:', e));
        }
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });

    const bgVideo = document.getElementById('bg-video');
    if (bgVideo) {
        bgVideo.play().catch(e => console.log('Video autoplay:', e));
    }
    
    sprites.poliRI = textureLoader.load('source/poliRI.png');
    sprites.glucksR = textureLoader.load('source/glucksR.png');
    
    sprites.billet_vert = textureLoader.load('source/billet_vert.png');
    sprites.isfclim = textureLoader.load('source/isfclim.png');

    // Load custom MP3 sounds
    loadAudioWithProgress('source/reward.mp3').then(audio => { if(audio) rewardSound = audio; });
    loadAudioWithProgress('source/abatez.mp3').then(audio => { if(audio) abatezSound = audio; });
    loadAudioWithProgress('source/faites_mieux.mp3').then(audio => { if(audio) faitesMieuxSound = audio; });
    loadAudioWithProgress('source/glucksvlf.mp3').then(audio => { if(audio) glucksvlfSound = audio; });
    loadAudioWithProgress('source/tondelier_etca.mp3').then(audio => { if(audio) tondelierEtcaSound = audio; });
    loadAudioWithProgress('source/boss/boss_danslescampagnes.mp3').then(audio => { if(audio) bossSound = audio; });
    loadAudioWithProgress('source/boss/boss_Psy 4 de Mah Rime.mp3').then(audio => { if(audio) bossBgMusic = audio; });
    loadAudioWithProgress('source/silencepourlafrance.mp3').then(audio => { if(audio) silenceSound = audio; });
    loadAudioWithProgress('source/boots.mp3').then(audio => { if(audio) bootsSound = audio; });

    sprites.marineR = textureLoader.load('source/marinelpdroite.png');
    sprites.tondR = textureLoader.load('source/tondR.png');

    sprites.mail = textureLoader.load('source/mail.png');
    sprites.laitfraise = textureLoader.load('source/laitfraise.png');
    sprites.maillotinvul = textureLoader.load('source/maillotinvul.png');
    sprites.erepu6 = textureLoader.load('source/6erepu.png');
    sprites.aimant = textureLoader.load('source/aimant.png');
    sprites.colis = textureLoader.load('source/colis.png');
    sprites.roussoR = textureLoader.load('source/roussoR.png');
    sprites.rimaR = textureLoader.load('source/rimaR.png');
    sprites.poutouR = textureLoader.load('source/poutouR.png');
    sprites.ruffin = textureLoader.load('source/ruffin.png');
    sprites.renaut = textureLoader.load('source/renaut.png');
    sprites.fn = textureLoader.load('source/fn.png');
    sprites.boots = textureLoader.load('source/boots.png');

    // Make textures crisp
    Object.values(sprites).forEach(tex => {
        if(tex) {
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
        }
    });

    // 4. Create Player
    const playerGeo = new THREE.PlaneGeometry(1.8, 1.8); // Increased by 20%
    const playerMat = new THREE.MeshBasicMaterial({ map: sprites.rightfront, transparent: true, side: THREE.DoubleSide });
    player = new THREE.Mesh(playerGeo, playerMat);
    player.position.set(0, 0, 0); // Z=0 to fix distanceTo collisions with enemies (who are at Z=0)
    player.visible = false; // Hide on title screen
    scene.add(player);

    player.stats = {
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
        dashDir: {x: 0, y: 0}
    };

    // 5. Input Listeners
    window.addEventListener('keydown', (e) => { 
        if (waitingForKey) {
            e.preventDefault();
            const action = waitingForKey.dataset.action;
            keyBinds[action] = e.key.toLowerCase();
            waitingForKey.innerText = e.key.toLowerCase();
            waitingForKey.classList.remove('waiting');
            waitingForKey = null;
            return;
        }

        if (e.key === 'Escape' && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
            togglePause();
            return;
        }
        
        if (e.key === 'Tab' && (gameState === 'PLAYING' || gameState === 'PAUSED_LITE')) {
            e.preventDefault();
            togglePauseLite();
            return;
        }

        if (e.key === ' ' && gameState === 'PLAYING') {
            triggerDash();
        }

        const k = e.key.toLowerCase();
        if (k === keyBinds.up || e.key === 'ArrowUp') keys.up = true;
        if (k === keyBinds.down || e.key === 'ArrowDown') keys.down = true;
        if (k === keyBinds.left || e.key === 'ArrowLeft') keys.left = true;
        if (k === keyBinds.right || e.key === 'ArrowRight') keys.right = true;
    });

    window.addEventListener('keyup', (e) => { 
        const k = e.key.toLowerCase();
        if (k === keyBinds.up || e.key === 'ArrowUp') keys.up = false;
        if (k === keyBinds.down || e.key === 'ArrowDown') keys.down = false;
        if (k === keyBinds.left || e.key === 'ArrowLeft') keys.left = false;
        if (k === keyBinds.right || e.key === 'ArrowRight') keys.right = false;
    });
    window.addEventListener('resize', onWindowResize, false);
    
    // Pointer / Touch Controls
    const updatePointerTarget = (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 16;
        const worldX = camera.position.x + x * (frustumSize * aspect / 2);
        const worldY = camera.position.y + y * (frustumSize / 2);
        pointerTarget.set(worldX, worldY);
    };
    
    window.addEventListener('pointerdown', (e) => {
        if (gameState !== 'PLAYING') return;
        if (e.target.tagName === 'BUTTON' || e.target.closest('#hud')) return;
        pointerActive = true;
        updatePointerTarget(e);
    });
    window.addEventListener('pointermove', (e) => {
        if (pointerActive) updatePointerTarget(e);
    });
    window.addEventListener('pointerup', () => { pointerActive = false; });
    window.addEventListener('pointercancel', () => { pointerActive = false; });
    
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.getElementById('touch-dash-btn').classList.remove('hidden');
    }
    document.getElementById('touch-dash-btn').addEventListener('pointerdown', (e) => {
        if(gameState === 'PLAYING') triggerDash();
        e.preventDefault();
        e.stopPropagation();
    });

    // Default basic attack
    const offensives = availablePowers.filter(p => p.category === 'Offensif');
    const startPower = offensives[Math.floor(Math.random() * offensives.length)];
    activePowers.push({
        ...startPower,
        level: 1
    });

    updateHUD();

    const musicBtn = document.getElementById('music-toggle-btn');
    if (musicBtn) {
        musicBtn.addEventListener('click', (e) => {
            if (ostAudio.paused) {
                ostAudio.play();
                musicBtn.innerHTML = '<i data-lucide="pause" style="width:14px;height:14px;"></i>';
            } else {
                ostAudio.pause();
                musicBtn.innerHTML = '<i data-lucide="play" style="width:14px;height:14px;"></i>';
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
            e.stopPropagation();
        });
    }

    const nextMusicBtn = document.getElementById('next-music-btn');
    if (nextMusicBtn) {
        nextMusicBtn.addEventListener('click', (e) => {
            playRandomOst();
            e.stopPropagation();
        });
    }

    // Start loop
    requestAnimationFrame(animate);
}

// ==========================================
// GAME LOOP
// ==========================================
function pollGamepadMenus() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.connected) {
            // Pause toggle
            if (gp.buttons[9] && gp.buttons[9].pressed) {
                if(!gp._pausePressed) {
                    if(gameState === 'PLAYING' || gameState === 'PAUSED') togglePause();
                    gp._pausePressed = true;
                }
            } else {
                gp._pausePressed = false;
            }

            // Lite Pause toggle (Select button)
            if (gp.buttons[8] && gp.buttons[8].pressed) {
                if(!gp._litePausePressed) {
                    if(gameState === 'PLAYING' || gameState === 'PAUSED_LITE') togglePauseLite();
                    gp._litePausePressed = true;
                }
            } else {
                gp._litePausePressed = false;
            }
            
            // Menu navigation
            if (gameState !== 'PLAYING') {
                if (!gp._navDebounce) gp._navDebounce = 0;
                
                // B Button to go back or unpause
                if (gp.buttons[1] && gp.buttons[1].pressed) {
                    if (performance.now() - gp._navDebounce > 200) {
                        const visibleBackBtns = Array.from(document.querySelectorAll('.back-btn')).filter(b => b.offsetParent !== null && !b.classList.contains('hidden'));
                        
                        if (visibleBackBtns.length > 0) {
                            visibleBackBtns[0].click();
                        } else if (gameState === 'PAUSED' || gameState === 'PAUSED_LITE') {
                            if (gameState === 'PAUSED') togglePause();
                            else togglePauseLite();
                        }
                        
                        gp._navDebounce = performance.now();
                    }
                }

                if (performance.now() - gp._navDebounce < 200) continue;

                if (gp.buttons[0] && gp.buttons[0].pressed) { // A Button
                    if (document.activeElement && (document.activeElement.tagName === 'BUTTON' || document.activeElement.tagName === 'SUMMARY' || document.activeElement.classList.contains('power-card'))) {
                        document.activeElement.click();
                        gp._navDebounce = performance.now();
                        continue;
                    } else if (!document.activeElement || document.activeElement.tagName !== 'INPUT') {
                        const visibleBtns = Array.from(document.querySelectorAll('button, .power-card, summary')).filter(b => b.offsetParent !== null);
                        if (visibleBtns.length > 0) {
                            visibleBtns[0].focus();
                            visibleBtns[0].click();
                            gp._navDebounce = performance.now();
                            continue;
                        }
                    }
                }
                
                let dx = 0, dy = 0;
                if (gp.buttons[12] && gp.buttons[12].pressed) dy = -1; // up
                if (gp.buttons[13] && gp.buttons[13].pressed) dy = 1;  // down
                if (gp.buttons[14] && gp.buttons[14].pressed) dx = -1; // left
                if (gp.buttons[15] && gp.buttons[15].pressed) dx = 1;  // right
                
                if (dx !== 0 || dy !== 0) {
                    const visibleBtns = Array.from(document.querySelectorAll('button, .power-card, input[type="range"], summary')).filter(b => b.offsetParent !== null);
                    if (visibleBtns.length > 0) {
                        const currentElement = document.activeElement;
                        
                        if (!currentElement || !visibleBtns.includes(currentElement)) {
                            visibleBtns[0].focus();
                        } else {
                            const currentRect = currentElement.getBoundingClientRect();
                            const cx = currentRect.left + currentRect.width / 2;
                            const cy = currentRect.top + currentRect.height / 2;
                            
                            let bestElement = null;
                            let bestScore = Infinity;
                            
                            visibleBtns.forEach(btn => {
                                if (btn === currentElement) return;
                                const rect = btn.getBoundingClientRect();
                                const bx = rect.left + rect.width / 2;
                                const by = rect.top + rect.height / 2;
                                
                                const deltaX = bx - cx;
                                const deltaY = by - cy;
                                
                                // Check if element is in the general requested direction
                                const isRightDirection = 
                                    (dx === -1 && deltaX < -10) || 
                                    (dx === 1 && deltaX > 10) || 
                                    (dy === -1 && deltaY < -10) || 
                                    (dy === 1 && deltaY > 10);
                                    
                                if (isRightDirection) {
                                    // Euclidean distance + heavy penalty for being off-axis
                                    const primaryDist = Math.abs(dx !== 0 ? deltaX : deltaY);
                                    const secondaryDist = Math.abs(dx !== 0 ? deltaY : deltaX);
                                    
                                    const score = primaryDist + (secondaryDist * 3);
                                    
                                    if (score < bestScore) {
                                        bestScore = score;
                                        bestElement = btn;
                                    }
                                }
                            });
                            
                            if (bestElement) {
                                bestElement.focus();
                            }
                        }
                        gp._navDebounce = performance.now();
                    }
                }
            }
        }
    }
}

let gameSpeedMultiplier = 1.0;

function animate(time) {
    requestAnimationFrame(animate);

    const delta = ((time - lastTime) / 1000) * gameSpeedMultiplier;
    lastTime = time;
    
    pollGamepadMenus();

    if (gameState !== 'PLAYING') {
        renderer.render(scene, camera);
        return; // Pause logic
    }

    gameTime += delta;
    updateTimerUI();

    leaRaphTimer += delta;
    if (leaRaphTimer >= 180) { // every 3 minutes
        leaRaphTimer = 0;
        spawnLeaRaph();
    }

    killFeedTimer += delta;
    if (killFeedTimer >= 1.0) {
        processKillFeedBuffer();
        killFeedTimer = 0;
    }

    breakingNewsTimer += delta;
    if (breakingNewsTimer >= nextBreakingNewsTime) {
        showBreakingNews();
        breakingNewsTimer = 0;
        nextBreakingNewsTime = 45 + Math.random() * 60;
    }

    if (gameTime < GAME_DURATION) {
        threatTimer += delta;
        if (threatTimer >= 240) {
            threatTimer -= 240;
            threatCount++;
            let msg = "";
            if (threatCount === 1) msg = "⚠️ UNE MENACE INCONNUE APPROCHE... ⚠️";
            else if (threatCount === 2) msg = "☠️ LA MENACE SE RAPPROCHE DANGEREUSEMENT... ☠️";
            else msg = "🔥 LE CIEL S'ASSOMBRIT... IL EST LÀ ! 🔥";
            showBreakingNews('custom', msg);
        }
    }

    // Boss music fade at 11:45
    if (gameTime >= 705 && gameTime < GAME_DURATION && !bossSpawned) {
        if (!bossOstFadeStarted) {
            bossOstFadeStarted = true;
        }
        const progress = (gameTime - 705) / 15.0;
        const volSlider = document.getElementById('ost-volume-slider');
        const baseVol = volSlider ? volSlider.value / 100 : 0.2;
        ostAudio.volume = Math.max(0, baseVol * (1.0 - progress));
    }

    // Screen Shake and Flash
    if (shakeTimer > 0) {
        shakeTimer -= delta;
        camera.position.x = (Math.random() - 0.5) * 0.5;
        camera.position.y = (Math.random() - 0.5) * 0.5;
    } else {
        camera.position.x = 0;
        camera.position.y = 0;
    }

    if (flashTimer > 0) {
        flashTimer -= delta;
        const flashEl = document.getElementById('flash-overlay');
        if (flashEl) flashEl.style.opacity = Math.min(0.5, flashTimer * 2);
    } else {
        const flashEl = document.getElementById('flash-overlay');
        if (flashEl) flashEl.style.opacity = '0';
    }

    // Spawn Allies (Ralliement) every 50 convinced
    const allyMilestone = Math.floor(totalConvinced / 50);
    if (allyMilestone > lastAllyThreshold && totalConvinced > 0) {
        lastAllyThreshold = allyMilestone;
        const spawnedAlly = spawnRalliement();
        if (spawnedAlly) {
            showBreakingNews('ally', spawnedAlly.name);
        }
    }
    if (ralliementActive) {
        updateRalliement(delta);
    }

    if (gameTime >= GAME_DURATION && !bossSpawned) {
        bossSpawned = true;
        spawnMegaBoss();
    }

    updatePlayer(delta);
    updateEnemies(delta);
    updateProjectiles(delta);
    updateEnemyProjectiles(delta);
    updateParticles(delta);
    
    // Update Poofs
    for (let i = poofs.length - 1; i >= 0; i--) {
        const p = poofs[i];
        p.life -= delta;
        p.mesh.scale.setScalar(1 + (p.maxLife - p.life) * 5); // expand
        p.mesh.rotation.x += p.vrx * delta;
        p.mesh.rotation.y += p.vry * delta;
        p.mesh.rotation.z += p.vrz * delta;
        p.mesh.material.opacity = (p.life / p.maxLife) * 0.8;
        if (p.life <= 0) {
            scene.remove(p.mesh);
            poofs.splice(i, 1);
        }
    }
    
    // Update Damage Texts
    for (let i = damageTexts.length - 1; i >= 0; i--) {
        const t = damageTexts[i];
        t.life -= delta;
        t.mesh.position.y += t.vy * delta;
        t.mesh.material.opacity = t.life / t.maxLife;
        if (t.life <= 0) {
            scene.remove(t.mesh);
            damageTexts.splice(i, 1);
        }
    }
    
    updateLoot(delta);
    updateMapItems(delta);
    updatePowers(delta);
    updateReferendumZones(delta);
    updateFireTrails(delta);
    
    // Process Killfeed Buffer every 1 second
    killFeedTimer += delta;
    if (killFeedTimer >= 1.0) {
        processKillFeedBuffer();
        killFeedTimer = 0;
    }

    // Background Chunks Logic
    const px = player.position.x;
    const py = player.position.y;
    
    groundChunks.forEach(chunk => {
        const dx = px - chunk.position.x;
        const dy = py - chunk.position.y;
        
        // Reposition chunk if too far
        let repositioned = false;
        if (dx > CHUNK_SIZE * 1.5) { chunk.position.x += CHUNK_SIZE * 3; repositioned = true; }
        else if (dx < -CHUNK_SIZE * 1.5) { chunk.position.x -= CHUNK_SIZE * 3; repositioned = true; }
        
        if (dy > CHUNK_SIZE * 1.5) { chunk.position.y += CHUNK_SIZE * 3; repositioned = true; }
        else if (dy < -CHUNK_SIZE * 1.5) { chunk.position.y -= CHUNK_SIZE * 3; repositioned = true; }
        
        // Update texture based on distance from origin
        const distFromOrigin = Math.sqrt(chunk.position.x * chunk.position.x + chunk.position.y * chunk.position.y);
        
        let targetMap = concreteTex;
        if (distFromOrigin > 100) targetMap = sandTex;
        else if (distFromOrigin > 50) targetMap = floorTex;
        
        if (chunk.material.map !== targetMap) {
            chunk.material.map = targetMap;
            chunk.material.needsUpdate = true;
        }
        
        if (repositioned) {
            generatePropsForChunk(chunk, false);
        }
    });
    
    // Overheal drain logic
    if (player.stats.hp > player.stats.maxHp) {
        overhealTimer += delta;
        if (overhealTimer >= 2.0) {
            overhealTimer = 0;
            player.stats.hp -= 1;
            updateHUD();
        }
    } else {
        overhealTimer = 0;
    }

    // Camera follow player with Screen Shake
    let camOffsetX = 0;
    let camOffsetY = 0;
    if (screenShakeTimer > 0) {
        screenShakeTimer -= delta;
        const intensity = (screenShakeTimer / 0.5) * 0.5;
        camOffsetX = (Math.random() - 0.5) * intensity;
        camOffsetY = (Math.random() - 0.5) * intensity;
    }
    
    camera.position.x = player.position.x + camOffsetX;
    camera.position.y = player.position.y + camOffsetY;

    renderer.render(scene, camera);
}

// ==========================================
// PLAYER LOGIC
// ==========================================
function triggerDash() {
    if (player.stats.dashCooldown > 0 || player.stats.dashTimer > 0) return;
    
    // Determine dash direction from facing or current input
    let dx = 0, dy = 0;
    if (keys.up) dy += 1;
    if (keys.down) dy -= 1;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    
    // Fallback to facing direction
    if (dx === 0 && dy === 0) {
        if (player.stats.facingRight) dx = 1; else dx = -1;
        if (player.stats.facingFront) dy = -1; else dy = 1;
    }
    
    // Normalize
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0) {
        dx /= length;
        dy /= length;
    }
    
    player.stats.dashDir = {x: dx, y: dy};
    player.stats.dashTimer = 0.2; // 0.2 seconds dash
    player.stats.dashCooldown = 2.0; // 2 seconds cooldown
    
    playSound(300, 'sine', 0.1); // Dash sound
    
    // Visual feedback
    const btn = document.getElementById('touch-dash-btn');
    if (btn) btn.classList.add('on-cooldown');
}

function checkWallCollision(x, y, w, h) {
    for (let i = 0; i < environmentProps.length; i++) {
        const prop = environmentProps[i];
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

function updatePlayer(delta) {
    if (player.stats.dashCooldown > 0) {
        player.stats.dashCooldown -= delta;
        if (player.stats.dashCooldown <= 0) {
            const btn = document.getElementById('touch-dash-btn');
            if (btn) btn.classList.remove('on-cooldown');
        }
    }

    if (player.stats.dashTimer > 0) {
        player.stats.dashTimer -= delta;
        const moveX = player.stats.dashDir.x * PLAYER_SPEED * 3.5 * delta;
        const moveY = player.stats.dashDir.y * PLAYER_SPEED * 3.5 * delta;
        
        if (!checkWallCollision(player.position.x + moveX, player.position.y, 1.5, 1.5)) {
            player.position.x += moveX;
        }
        if (!checkWallCollision(player.position.x, player.position.y + moveY, 1.5, 1.5)) {
            player.position.y += moveY;
        }
        
        // Spawn dash particles
        if (Math.random() < 0.3) {
            spawnParticles(player.position, 0x3498db, 1, 3);
        }
        return; // Skip normal movement while dashing
    }

    let dx = 0;
    let dy = 0;

    // Keyboard
    if (keys.up) dy += 1;
    if (keys.down) dy -= 1;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;

    // Gamepad (XInput usually idx 0)
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.connected) {
            // Left stick axes[0] is X, axes[1] is Y
            const ax = gp.axes[0];
            const ay = gp.axes[1];
            if (Math.abs(ax) > 0.2) dx += ax;
            if (Math.abs(ay) > 0.2) dy -= ay; // Y inverted
            
            // D-Pad usually buttons 12(Up), 13(Down), 14(Left), 15(Right)
            if (gp.buttons[12] && gp.buttons[12].pressed) dy += 1;
            if (gp.buttons[13] && gp.buttons[13].pressed) dy -= 1;
            if (gp.buttons[14] && gp.buttons[14].pressed) dx -= 1;
            if (gp.buttons[15] && gp.buttons[15].pressed) dx += 1;
            
            // A button (index 0) to dash, if not in menu
            if (gp.buttons[0] && gp.buttons[0].pressed && !gp._dashPressed) {
                gp._dashPressed = true;
                triggerDash();
            } else if (!gp.buttons[0] || !gp.buttons[0].pressed) {
                gp._dashPressed = false;
            }
        }
    }
    
    // Pointer / Touch
    if (pointerActive) {
        const pdx = pointerTarget.x - player.position.x;
        const pdy = pointerTarget.y - player.position.y;
        const dist = Math.sqrt(pdx*pdx + pdy*pdy);
        if (dist > 0.5) { // Deadzone
            dx += pdx / dist;
            dy += pdy / dist;
        }
    }

    // Mobile Virtual Joystick
    if (typeof joystickActive !== 'undefined' && joystickActive) {
        dx += joystickDx;
        dy += joystickDy;
    }

    // Normalize
    if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
    }

    const moveX = dx * PLAYER_SPEED * delta;
    const moveY = dy * PLAYER_SPEED * delta;
    
    if (!checkWallCollision(player.position.x + moveX, player.position.y, 1.5, 1.5)) {
        player.position.x += moveX;
    }
    if (!checkWallCollision(player.position.x, player.position.y + moveY, 1.5, 1.5)) {
        player.position.y += moveY;
    }

    // Sprite update
    if (dx > 0) player.stats.facingRight = true;
    if (dx < 0) player.stats.facingRight = false;
    if (dy > 0) player.stats.facingFront = false;
    if (dy < 0) player.stats.facingFront = true;

    if (player.stats.facingRight && player.stats.facingFront) player.material.map = sprites.rightfront;
    else if (player.stats.facingRight && !player.stats.facingFront) player.material.map = sprites.rightback;
    else if (!player.stats.facingRight && player.stats.facingFront) player.material.map = sprites.leftfront;
    else if (!player.stats.facingRight && !player.stats.facingFront) player.material.map = sprites.leftback;
}

function healPlayer(amount) {
    player.stats.hp = Math.min(115, player.stats.hp + amount); // Overheal max 115
    updateHUD();
    playSound(400, 'sine', 0.1);
}

function damagePlayer(amount) {
    if (player.stats.invincible || kranidosInvincible || player.stats.dashTimer > 0) return; // No damage during rush or dash
    
    // Allies aura defense
    if (ralliementActive) {
        amount *= 0.5;
    }
    
    player.stats.hp -= amount;
    updateHUD();
    playSound(150, 'sawtooth', 0.1);

    
    // Flash + shake on damage
    player.material.color.setHex(0xff0000);
    shakeTimer = 0.1;
    flashTimer = 0.15;
    setTimeout(() => { if (player && player.material) player.material.color.setHex(0xffffff); }, 100);

    if (player.stats.hp <= 0) {
        gameState = 'GAMEOVER';
        document.getElementById('survival-time').innerText = `Temps survécu : ${formatTime(gameTime)}`;
        document.getElementById('game-over-screen').classList.remove('hidden');
        // Stop OST
        ostAudio.pause();
        // Resume audioCtx then play defeat sound
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                if (faitesMieuxSound) playAudioBuffer(faitesMieuxSound);
            });
        } else {
            if (faitesMieuxSound) playAudioBuffer(faitesMieuxSound);
        }
    }
}

// ==========================================
// ENEMY LOGIC
// ==========================================
function spawnLeaRaph() {
    // Spawn at the edge of the visible screen, cross to the opposite side
    const frustumH = camera ? (camera.top - camera.bottom) : 20;
    const frustumW = camera ? (camera.right - camera.left) : 20;
    const halfW = (frustumW / 2) + 2;
    const halfH = (frustumH / 2) + 2;
    const cx = player.position.x;
    const cy = player.position.y;

    const side = Math.floor(Math.random() * 4);
    let startX, startY, endX, endY;
    if (side === 0) {
        startX = cx - halfW; startY = cy + (Math.random() - 0.5) * frustumH;
        endX   = cx + halfW; endY   = cy + (Math.random() - 0.5) * frustumH;
    } else if (side === 1) {
        startX = cx + halfW; startY = cy + (Math.random() - 0.5) * frustumH;
        endX   = cx - halfW; endY   = cy + (Math.random() - 0.5) * frustumH;
    } else if (side === 2) {
        startX = cx + (Math.random() - 0.5) * frustumW; startY = cy + halfH;
        endX   = cx + (Math.random() - 0.5) * frustumW; endY   = cy - halfH;
    } else {
        startX = cx + (Math.random() - 0.5) * frustumW; startY = cy - halfH;
        endX   = cx + (Math.random() - 0.5) * frustumW; endY   = cy + halfH;
    }
    const dvx = endX - startX;
    const dvy = endY - startY;
    const dlen = Math.sqrt(dvx*dvx + dvy*dvy);

    // Preserve sprite ratio
    let geoW = 3.0, geoH = 3.0;
    if (sprites.renaut && sprites.renaut.image) {
        const ratio = sprites.renaut.image.width / sprites.renaut.image.height;
        geoW = ratio >= 1 ? 3.0 : 3.0 * ratio;
        geoH = ratio >= 1 ? 3.0 / ratio : 3.0;
    }
    
    let geo = new THREE.PlaneGeometry(geoW, geoH);
    let mat = new THREE.MeshBasicMaterial({ map: sprites.renaut, transparent: true, side: THREE.DoubleSide });
    let mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(startX, startY, 1.2);
    
    mesh.stats = {
        type: 'LeaRaph',
        hp: 100 * (1 + (player.stats.level || 1) * 0.5) + (leaRaphSpawnCount * 100),
        maxHp: 100 * (1 + (player.stats.level || 1) * 0.5) + (leaRaphSpawnCount * 100),
        baseColor: 0x9b59b6,
        speed: 4.0,
        vx: dvx / dlen,
        vy: dvy / dlen,
        spawnTween: 0.0,
        originalColor: 0xffffff,
        isMiniBoss: true
    };
    
    scene.add(mesh);
    enemies.push(mesh);
    leaRaphSpawnCount++;

    if (!localStorage.getItem('seen_learaph')) {
        localStorage.setItem('seen_learaph', 'true');
        const entry = document.getElementById('bestiary-learaph');
        if (entry) entry.classList.remove('hidden');
    }

    showBreakingNews('custom', '\uD83D\uDEA8 LEA ET RAPH DEBARQUENT ! ILS TRAVERSENT LA CARTE !');
}
function spawnEnemy(forcedType = null) {
    // Determine spawn position just outside camera view
    const angle = Math.random() * Math.PI * 2;
    const distance = 15; // outside frustum
    const x = player.position.x + Math.cos(angle) * distance;
    const y = player.position.y + Math.sin(angle) * distance;

    const types = ['Journaliste', 'Politique', 'Milliardaire'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let subType = forcedType;
    if (!subType) {
        if (type === 'Journaliste') subType = Math.random() < 0.5 ? 'JournalisteF' : 'JournalisteH';
        if (type === 'Politique') subType = Math.random() < 0.5 ? 'Poli' : 'Glucks';
        if (type === 'Milliardaire') subType = Math.random() < 0.5 ? 'Bill1' : 'Bill2';
    }
    
    let geo = new THREE.PlaneGeometry(1.44, 1.44); // Increased by 20%
    let mat, hp, speed, color = 0xffffff;
    let map = null;
    let dodgeChance = 0;
    let attackTimer = 0;
    let isMiniBoss = false;

    switch(subType) {
        case 'JournalisteF':
            map = sprites.journaR;
            hp = 10; speed = 2.0; break;
        case 'JournalisteH':
            map = sprites.journaRm;
            hp = 10; speed = 2.0; break;
        case 'Poli':
            map = sprites.poliRI;
            hp = 20; speed = 1.5; break;
        case 'Glucks':
            map = sprites.glucksR;
            hp = 20; speed = 1.5; attackTimer = 2.0; break;
        case 'Bill1':
        case 'Bill2':
            map = sprites.usR;
            hp = 30; speed = 2.5;
            dodgeChance = 0.25;
            color = 0xffffff;
            playFakeNewsSound();
            break;
    }

    mat = new THREE.MeshBasicMaterial({ color: color, map: map, transparent: true, side: THREE.DoubleSide });
    const enemy = new THREE.Mesh(geo, mat);
    enemy.position.set(x, y, 0);
    
    // Time scaling: +15% per minute
    const timeScale = 1 + (gameTime / 60) * 0.15;
    hp = Math.floor(hp * timeScale);

    // Elastic spawn effect (Funky)
    enemy.scale.set(0.1, 0.1, 0.1);
    enemy.stats = { hp: hp, maxHp: hp, speed: speed, type: subType, originalColor: color, frozenTimer: 0, slowTimer: 0, dodgeChance: dodgeChance, attackTimer: attackTimer, isMiniBoss: isMiniBoss, spawnTween: 0, dmgScale: timeScale };
    
    scene.add(enemy);
    enemies.push(enemy);
}

function spawnMiniBoss(type, pos) {
    let geo = new THREE.PlaneGeometry(5, 5); // Huge size
    let mat, hp, speed, color = 0xffffff;
    let map = null;
    let name = '';

    const timeScale = 1 + (gameTime / 60) * 0.15;
    if (type === 'GrosGlucks') {
        map = sprites.glucksR;
        hp = Math.floor(300 * timeScale); speed = 1.2; 
        name = "MEGA GLUCKSMANN";
        if (glucksvlfSound) playAudioBuffer(glucksvlfSound);
    } else if (type === 'GrosseTondelier') {
        map = sprites.tondR;
        hp = Math.floor(600 * timeScale); speed = 1.2;
        name = "MEGA TONDELIER";
        if (tondelierEtcaSound) playAudioBuffer(tondelierEtcaSound);
    }
    
    showBreakingNews('custom', `🚨 ⚠️ ${name} APPARAIT ! ⚠️ 🚨`);

    mat = new THREE.MeshBasicMaterial({ color: color, map: map, transparent: true, side: THREE.DoubleSide });
    const enemy = new THREE.Mesh(geo, mat);
    enemy.position.copy(pos);
    
    enemy.stats = { hp: hp, maxHp: hp, speed: speed, type: type === 'GrosGlucks' ? 'Glucks' : 'Tondelier', originalColor: color, frozenTimer: 0, slowTimer: 0, dodgeChance: 0.005, attackTimer: 0, isMiniBoss: true, spawnTween: 0 };
    
    scene.add(enemy);
    enemies.push(enemy);
}

function spawnMegaBoss() {
    // 1. Darken screen & shake
    const vignette = document.getElementById('low-hp-vignette');
    if (vignette) {
        vignette.style.boxShadow = 'inset 0 0 200px rgba(0, 0, 0, 0.9)';
        vignette.style.opacity = '1';
        vignette.style.animation = 'none';
    }
    screenShakeTimer = 2.0;

    // 2. Play boss sound
    if (bossSound) playAudioBuffer(bossSound);
    
    // 3. Switch OST
    ostAudio.loop = false;
    ostAudio.pause();
    if (bossBgMusic) {
        bossBgMusic.loop = true;
        const source = audioCtx.createBufferSource();
        source.buffer = bossBgMusic;
        source.loop = true;
        source.connect(masterGainNode);
        source.start();
        window.bossMusicSource = source;
    }
    
    // Update Now Playing UI for boss
    const npTrack = document.getElementById('music-title');
    if (npTrack) {
        npTrack.innerText = "🎵 Boss Final";
    }

    // 4. Desintegrate all current units
    for (let i = enemies.length - 1; i >= 0; i--) {
        spawnParticles(enemies[i].position, enemies[i].stats.originalColor || 0xffffff, 10);
        scene.remove(enemies[i]);
    }
    enemies.length = 0;

    // 5. Gather all uncollected XP into a big chest (health pack instead)
    let totalXpToGive = lootDrops.filter(l => l.stats.type === 'xp').length;
    for (let i = lootDrops.length - 1; i >= 0; i--) {
        scene.remove(lootDrops[i]);
    }
    lootDrops.length = 0;
    if (totalXpToGive > 0) {
        spawnSpecialItem('chest', 'package');
    }

    // 6. Spawn Mega Boss
    let geo = new THREE.PlaneGeometry(8, 8);
    const rightSide = (player.position.x > 0);
    
    let mat = new THREE.MeshBasicMaterial({ map: sprites.marineR, transparent: true, side: THREE.DoubleSide });
    const boss = new THREE.Mesh(geo, mat);
    boss.position.set(player.position.x + (rightSide ? -15 : 15), player.position.y, 0);
    
    boss.stats = { hp: 7500, maxHp: 7500, speed: 1.5, type: 'MegaBoss', originalColor: 0xffffff, frozenTimer: 0, slowTimer: 0, dodgeChance: 0, isMegaBoss: true, spawnTween: 0, attackTimer: 3.0 };
    
    scene.add(boss);
    enemies.push(boss);
}

function updateEnemies(delta) {
    // Spawning
    spawnTimer += delta;
    // Increase spawn rate over time
    const currentSpawnRate = BASE_SPAWN_RATE / (1 + gameTime / 120); 
    if (spawnTimer >= currentSpawnRate && !bossSpawned) {
        spawnTimer = 0;
        spawnEnemy();
    }

    // Movement and Collision
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Spawn Scale Tween
        if (enemy.stats.spawnTween !== undefined && enemy.stats.spawnTween < 1.0) {
            enemy.stats.spawnTween += delta * 2;
            const s = Math.min(1.0, enemy.stats.spawnTween);
            enemy.scale.set(s, s, s);
        }
        
        // Status effects
        if (enemy.stats.frozenTimer > 0) {
            enemy.stats.frozenTimer -= delta;
            continue; // Skip movement
        }
        
        let currentSpeed = enemy.stats.speed;
        if (enemy.stats.slowTimer > 0) {
            currentSpeed *= 0.5; // 50% slow
            enemy.stats.slowTimer -= delta;
        }

        // Move towards player
        const dx = player.position.x - enemy.position.x;
        const dy = player.position.y - enemy.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        let moveX = 0, moveY = 0;
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
            let movedX = false;
            let movedY = false;
            
            if (enemy.stats.wallStuckTimer > 10.0 || enemy.stats.type === 'LeaRaph') {
                // Noclip mode
                enemy.position.x += moveX;
                enemy.position.y += moveY;
                movedX = true; movedY = true;
            } else {
                if (!checkWallCollision(enemy.position.x + moveX, enemy.position.y, 1.4, 1.4)) {
                    enemy.position.x += moveX;
                    movedX = true;
                }
                if (!checkWallCollision(enemy.position.x, enemy.position.y + moveY, 1.4, 1.4)) {
                    enemy.position.y += moveY;
                    movedY = true;
                }
                
                if (!movedX && !movedY) {
                    enemy.stats.wallStuckTimer = (enemy.stats.wallStuckTimer || 0) + delta;
                } else {
                    enemy.stats.wallStuckTimer = 0;
                }
            }
            
            // Sprite flipping
            const absX = Math.abs(enemy.scale.x);
            enemy.scale.x = faceRight ? absX : -absX;
        }
        
        // Special text attacks
        if (enemy.stats.attackTimer !== undefined && enemy.stats.attackTimer > 0) {
            enemy.stats.attackTimer -= delta;
            if (enemy.stats.attackTimer <= 0) {
                if (enemy.stats.type === 'Glucks') {
                    createTextProjectile("et surtout... vive, la fraaaaaaaaaaaaaance", enemy.position, 0, 5, '#e74c3c');
                    enemy.stats.attackTimer = 3.0 + Math.random() * 2;
                } else if (enemy.stats.type === 'MegaBoss') {
                    // Marine Le Pen Attack: Flamme Tricolore (Logo FN)
                    if (sprites.fn && sprites.fn.image) {
                        const geoW = 1.2;
                        const geoH = 2.1; // aspect ratio 120/210
                        
                        // Fire 4 directions towards player
                        for(let a = -1; a <= 1; a+=0.6) {
                            let geo = new THREE.PlaneGeometry(geoW, geoH);
                            let mat = new THREE.MeshBasicMaterial({ map: sprites.fn, transparent: true, side: THREE.DoubleSide });
                            let mesh = new THREE.Mesh(geo, mat);
                            mesh.position.copy(enemy.position);
                            
                            const dx = player.position.x - enemy.position.x;
                            const dy = player.position.y - enemy.position.y;
                            const dist = Math.max(0.1, Math.sqrt(dx*dx + dy*dy));
                            
                            const baseAngle = Math.atan2(dy, dx);
                            const angle = baseAngle + a;
                            
                            // Rotate mesh so the round part faces player, tail behind
                            mesh.rotation.z = angle - Math.PI / 2;
                            
                            scene.add(mesh);
                            enemyProjectiles.push({
                                mesh: mesh,
                                vx: Math.cos(angle) * 6,
                                vy: Math.sin(angle) * 6,
                                life: 6.0,
                                maxLife: 6.0,
                                damage: 15,
                                isImage: true
                            });
                        }
                        
                        // Play random silencepourlafrance sound (divided by 3 -> approx > 0.86)
                        if (Math.random() > 0.86 && silenceSound) {
                            playAudioBuffer(silenceSound);
                        }
                    }
                    enemy.stats.attackTimer = 2.5; // attacks every 2.5 seconds
                }
            }
        }

        // Additional independent MegaBoss attacks
        if (enemy.stats.type === 'MegaBoss') {
            if (enemy.stats.bootsAttackTimer === undefined) enemy.stats.bootsAttackTimer = 2.0;
            if (enemy.stats.bootsAttackTimer > 0) {
                enemy.stats.bootsAttackTimer -= delta;
                if (enemy.stats.bootsAttackTimer <= 0) {
                    if (sprites.boots && sprites.boots.image) {
                        let geo = new THREE.PlaneGeometry(1.8, 1.5);
                        let mat = new THREE.MeshBasicMaterial({ map: sprites.boots, transparent: true, side: THREE.DoubleSide });
                        let mesh = new THREE.Mesh(geo, mat);
                        mesh.position.copy(enemy.position);
                        const dx = player.position.x - enemy.position.x;
                        const dy = player.position.y - enemy.position.y;
                        const dist = Math.max(0.1, Math.sqrt(dx*dx + dy*dy));
                        
                        scene.add(mesh);
                        enemyProjectiles.push({
                            mesh: mesh,
                            vx: (dx/dist) * 8,
                            vy: (dy/dist) * 8,
                            life: 8.0,
                            maxLife: 8.0,
                            damage: 15,
                            isImage: true,
                            isBoots: true
                        });
                    }
                    if (bootsSound && (gameTime - (window.lastBootsSoundTime || 0) > 5)) {
                        playAudioBuffer(bootsSound, 1.2);
                        window.lastBootsSoundTime = gameTime;
                    }
                    enemy.stats.bootsAttackTimer = 5.0 + Math.random() * 2;
                }
            }
        }

        // Player Collision
        if (dist < 1.0) {
            let dmg = 5 * (enemy.stats.dmgScale || 1);
            damagePlayer(dmg);
            // push back enemy
            enemy.position.x -= dx * 0.5;
            enemy.position.y -= dy * 0.5;
        }

        if (enemy.stats.isDyingSequence) {
            enemy.stats.dyingTimer -= delta;
            
            // Violent shake and particles
            enemy.position.x += (Math.random() - 0.5) * 4;
            enemy.position.y += (Math.random() - 0.5) * 4;
            if (Math.random() < 0.3) {
                spawnPoof(enemy.position);
                spawnParticles(enemy.position, 0xff0000, 5);
                playSound(100 + Math.random()*200, 'square', 0.2);
            }
            
            if (enemy.stats.dyingTimer <= 0) {
                scene.remove(enemy);
                enemies.splice(i, 1);
                checkVictory();
            }
            continue; // Skip the rest of enemy logic
        }

        // Check if dead
        if (enemy.stats.hp <= 0) {
            if (enemy.stats.isMegaBoss) {
                enemy.stats.isDyingSequence = true;
                enemy.stats.dyingTimer = 5.0;
                enemy.stats.hp = 999999;
                
                if (window.bossMusicSource) {
                    window.bossMusicSource.stop();
                    window.bossMusicSource = null;
                }
                
                let fade = document.getElementById('fade-to-black');
                if (fade) {
                    fade.classList.remove('hidden');
                    fade.style.opacity = '0';
                    void fade.offsetWidth; // trigger reflow
                    fade.style.opacity = '1';
                }
                continue;
            }

            scene.remove(enemy);
            
            // Screen shake + Flash on kill
            shakeTimer = 0.05;
            flashTimer = 0.05;
            
            // Death Particles and Poof
            spawnParticles(enemy.position, enemy.stats.originalColor || 0xffffff, 10);
            spawnPoof(enemy.position);
            
            totalConvinced++;
            const tCounter = document.getElementById('convinced-counter');
            if (tCounter) tCounter.innerHTML = `Convaincus : ${totalConvinced}`;
            
            // Loot & Death Logic
            if (!enemy.stats.noLoot) {
                if (enemy.stats.type === 'LeaRaph') spawnBigXP(enemy.position);
                else dropLoot(enemy.position);
            }
            
            // Kill Feed
            if (enemy.stats.lastHitBy) {
                addToKillFeed(enemy.stats.type, enemy.stats.lastHitBy);
            }
                
                if (enemy.stats.type === 'JournalisteF' || enemy.stats.type === 'JournalisteH') {
                    journalisteKills++;
                    let reqJ = getComboReq(30);
                    if (journalisteKills >= reqJ) {
                        journalisteKills = 0;
                        spawnSpecialItem('magnet', 'scroll');
                    }
                    document.getElementById('combo-bar').style.width = `${(journalisteKills / reqJ) * 100}%`;
                    const comboText = document.getElementById('combo-text');
                    if (comboText) comboText.innerHTML = `${journalisteKills}/${reqJ} <i data-lucide="camera" style="width:16px;height:16px;display:inline-block;vertical-align:middle;"></i>`;
                }

                // Combo Politiciens (Milkshake)
                if (['Poli', 'Glucks'].includes(enemy.stats.type)) {
                    politicienKills++;
                    let reqP = getComboReq(15);
                    if (politicienKills >= reqP) {
                        politicienKills = 0;
                        spawnSpecialItem('health', '🥤');
                    }
                    const pBar = document.getElementById('combo-poli-bar');
                    if (pBar) pBar.style.width = `${(politicienKills / reqP) * 100}%`;
                    const comboPoliText = document.getElementById('combo-poli-text');
                    if (comboPoliText) comboPoliText.innerHTML = `${politicienKills}/${reqP} <i data-lucide="briefcase" style="width:16px;height:16px;display:inline-block;vertical-align:middle;"></i> Politiciens`;

                    if (enemy.stats.type === 'Glucks' && !enemy.stats.isMiniBoss) {
                        glucksKills++;
                        if (glucksKills >= 15) {
                            glucksKills = 0;
                            spawnMiniBoss('GrosGlucks', enemy.position);
                        }
                    } else if (enemy.stats.type === 'Poli' && !enemy.stats.isMiniBoss) {
                        tondelierKills++;
                        if (tondelierKills >= 15) {
                            tondelierKills = 0;
                            spawnMiniBoss('GrosseTondelier', enemy.position);
                        }
                    }
                }
                
                if (enemy.stats.isMegaBoss) {
                    checkVictory();
                    if (window.bossMusicSource) {
                        window.bossMusicSource.stop();
                    }
                }
            
            enemies.splice(i, 1);
        }
    }
}

function spawnFireworks() {
    const fwColors = ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6'];
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const fx = document.createElement('div');
            fx.style.position = 'absolute';
            fx.style.left = (20 + Math.random() * 60) + '%';
            fx.style.top = (20 + Math.random() * 60) + '%';
            fx.style.width = '10px';
            fx.style.height = '10px';
            fx.style.borderRadius = '50%';
            fx.style.backgroundColor = fwColors[Math.floor(Math.random() * fwColors.length)];
            fx.style.boxShadow = `0 0 20px 10px ${fx.style.backgroundColor}`;
            fx.style.zIndex = '9999';
            fx.style.animation = 'explode 1s ease-out forwards';
            document.body.appendChild(fx);
            setTimeout(() => document.body.removeChild(fx), 1000);
            playSound(300 + Math.random()*200, 'sine', 0.1);
        }, Math.random() * 3000);
    }
    
    if (!document.getElementById('fireworks-style')) {
        const style = document.createElement('style');
        style.id = 'fireworks-style';
        style.innerHTML = `
            @keyframes explode {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(15); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

function checkVictory() {
    let bossExists = enemies.some(e => e.stats && e.stats.isMegaBoss && e.stats.hp > 0);
    if (!bossExists && bossSpawned && gameState === 'PLAYING') {
        gameState = 'VICTORY_ANIMATION';
        
        if (window.bossMusicSource) {
            window.bossMusicSource.stop();
            window.bossMusicSource = null;
        }
        
        const video = document.getElementById('victory-video');
        if (video) {
            video.classList.remove('hidden');
            let playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error("Video play failed", e);
                    video.classList.add('hidden');
                    triggerVictoryScreen();
                });
            }
            video.onended = () => {
                video.classList.add('hidden');
                triggerVictoryScreen();
            };
        } else {
            triggerVictoryScreen();
        }
    }
}

function triggerVictoryScreen() {
    gameState = 'VICTORY';
    
    // Play normal ost
    ostAudio.play().catch(e => console.log(e));

    // Hide the black fade overlay so the victory menu is visible
    const fade = document.getElementById('fade-to-black');
    if (fade) fade.classList.add('hidden');

    let unlocksText = "Déverrouillages :<br>";
    let wins = parseInt(localStorage.getItem('timesFinished') || '0');
    
    if (localStorage.getItem('bossDefeated') !== 'true') {
        localStorage.setItem('bossDefeated', 'true');
        unlocksText += "- Bestiaire: Boss Final révélé !<br>";
    }
    wins++;
    localStorage.setItem('timesFinished', wins.toString());
    
    if (wins === 1) unlocksText += "- Nouveau mode: Turbo (Vitesse x2) disponible dans les Bonus !<br>";
    if (wins >= 2) unlocksText += "- Nouveau mode: Ultra Turbo (Vitesse x4) disponible dans les Bonus !<br>";
    
    const unlocksDiv = document.getElementById('victory-unlocks');
    if (unlocksDiv) {
        unlocksDiv.innerHTML = unlocksText;
    }
    
    const prestigeBtn = document.getElementById('prestige-btn');
    if (prestigeBtn) {
        if (wins >= 2) prestigeBtn.classList.remove('hidden');
        else prestigeBtn.classList.add('hidden');
    }

    document.getElementById('victory-screen').classList.remove('hidden');
    spawnFireworks();
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// ==========================================
// LOOT SYSTEM
// ==========================================
const iconTextureCache = {};

function getLucideTexture(iconName, bgColor = 'rgba(0,0,0,0.5)', iconColor = '#ffffff', drawRing = true) {
    const key = `${iconName}_${bgColor}_${iconColor}_${drawRing}`;
    if (iconTextureCache[key]) return iconTextureCache[key];

    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    if (drawRing) {
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        if (bgColor !== 'transparent') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, 64, 64);
        }
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    
    if (typeof lucide !== 'undefined' && lucide.icons[iconName]) {
        const svgString = lucide.icons[iconName].toSvg({ width: 48, height: 48, color: iconColor });
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 8, 8);
            tex.needsUpdate = true;
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    }
    
    iconTextureCache[key] = tex;
    return tex;
}

function spawnBigXP(pos) {
    const geo = new THREE.PlaneGeometry(1.5, 1.5);
    const mat = new THREE.MeshBasicMaterial({ map: sprites.mail, transparent: true, side: THREE.DoubleSide });
    const loot = new THREE.Mesh(geo, mat);
    loot.position.copy(pos);
    loot.position.z = 0.1;
    loot.stats = { type: 'BigXP', life: 5.0 };
    scene.add(loot);
    lootDrops.push(loot);
}

function dropLoot(pos) {
    const rand = Math.random();
    let type = 'xp';
    let size = 0.26; // 0.8 / 3
    let tex;

    if (rand < 0.001) { // 0.1% chance for Nuke
        spawnSpecialItem('6erep', '⚖️');
    }

    if (rand < 0.002) {
        type = 'invuln'; // Maillot foot
        size = 1.0;
        tex = sprites.maillotinvul;
    } else if (rand < 0.012) {
        type = 'health'; // Lait fraise
        size = 1.0;
        tex = sprites.laitfraise;
    } else {
        tex = sprites.mail;
    }

    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    
    const loot = new THREE.Mesh(geo, mat);
    loot.position.copy(pos);
    loot.position.z = 0.1;
    loot.stats = { type: type };
    
    scene.add(loot);
    lootDrops.push(loot);
}

function updateLoot(delta) {
    for (let i = lootDrops.length - 1; i >= 0; i--) {
        const loot = lootDrops[i];
        const dx = player.position.x - loot.position.x;
        const dy = player.position.y - loot.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Magnetic effect if within pickup radius or globally magnetized
        if (dist < player.stats.pickupRadius || loot.stats.magnetized) {
            const speed = loot.stats.magnetized ? 25.0 : 8.0;
            loot.position.x += (dx / dist) * speed * delta;
            loot.position.y += (dy / dist) * speed * delta;
        }

        if (loot.stats.type === 'BigXP') {
            loot.stats.life -= delta;
            if (loot.stats.life <= 0) {
                scene.remove(loot);
                lootDrops.splice(i, 1);
                continue;
            }
            const blinkSpeed = 20 + Math.max(0, (5.0 - loot.stats.life)) * 10;
            loot.material.opacity = (Math.sin(gameTime * blinkSpeed) + 1.5) / 2.5;
        }

        // Collection
        if (dist < 0.8) {
            if (loot.stats.type === 'xp') {
                let xpGain = 1;
                const autonomie = activePowers.find(p => p.id === 'allocation_autonomie');
                if (autonomie) {
                    xpGain *= (1 + autonomie.level * 0.2);
                }
                gainXp(xpGain);
                playSound(800, 'sine', 0.05);
            } else if (loot.stats.type === 'health') {
                healPlayer(20);
            } else if (loot.stats.type === 'invuln') {
                // Not fully implemented invuln logic, just heal for now
                healPlayer(50);
            } else if (loot.stats.type === 'BigXP') {
                gainXp(500);
                playSound(1000, 'sine', 0.1);
            }

            scene.remove(loot);
            lootDrops.splice(i, 1);
        }
    }
}

function spawnSpecialItem(type, iconName) {
    // No duplicate: don't spawn if this type is already on the map
    const alreadyExists = mapItems.some(item => item.type === type);
    if (alreadyExists) return;

    // Random position around player but somewhat far
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 20;
    const x = player.position.x + Math.cos(angle) * dist;
    const y = player.position.y + Math.sin(angle) * dist;
    
    const group = new THREE.Group();
    group.position.set(x, y, 1.5);
    
    const bgTex = getLucideTexture('', 'rgba(0,0,0,0.5)', '#ffffff', true);
    const bgGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, transparent: true, side: THREE.DoubleSide });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    group.add(bgMesh);
    
    let iconTex;
    let aspectRatio = 1;
    if (type === '6erep') iconTex = sprites.erepu6;
    else if (type === 'magnet') iconTex = sprites.aimant;
    else if (type === 'health') iconTex = sprites.laitfraise;
    else if (type === 'chest') iconTex = sprites.colis;
    else iconTex = getLucideTexture(iconName, 'transparent', '#ffffff', false);

    if (iconTex && iconTex.image) {
        aspectRatio = iconTex.image.width / iconTex.image.height;
    }
    const iconWidth = 1.4 * Math.min(1, aspectRatio);
    const iconHeight = 1.4 * Math.min(1, 1/aspectRatio);
    
    const iconGeo = new THREE.PlaneGeometry(iconWidth, iconHeight);
    const iconMat = new THREE.MeshBasicMaterial({ map: iconTex, transparent: true, side: THREE.DoubleSide });
    const iconMesh = new THREE.Mesh(iconGeo, iconMat);
    group.add(iconMesh);
    
    scene.add(group);
    mapItems.push({ mesh: group, bgMesh: bgMesh, type: type });
}

function updateMapItems(delta) {
    magnetTimer += delta;
    
    if (magnetTimer >= 90) {
        magnetTimer = 0;
        spawnSpecialItem('magnet', 'scroll'); // XP Magnet
    }
    
    // UI Pointer logic for 6e Rep and Health
    const pointer = document.getElementById('item-pointer');
    let closestItem = null;
    let closestDist = Infinity;

    for (let i = mapItems.length - 1; i >= 0; i--) {
        const item = mapItems[i];
        if (item.conquerProgress === undefined) item.conquerProgress = 0;
        
        // Find closest 6erep or health or chest for pointer
        if (item.type === '6erep' || item.type === 'health' || item.type === 'chest') {
            const dist = player.position.distanceTo(item.mesh.position);
            if (dist < closestDist) {
                closestDist = dist;
                closestItem = item;
            }
        }
        
        // Bounce animation
        item.mesh.position.y += Math.sin(gameTime * 5) * 0.02;
        
        const dxItem = player.position.x - item.mesh.position.x;
        const dyItem = player.position.y - item.mesh.position.y;
        if (Math.sqrt(dxItem*dxItem + dyItem*dyItem) < 2.5) {
            // Conquer mechanic
            item.conquerProgress += delta;
            if (item.bgMesh) item.bgMesh.scale.setScalar(1.0 + (item.conquerProgress / 1.5) * 0.5);
            else item.mesh.scale.setScalar(1.0 + (item.conquerProgress / 1.5) * 0.5);
            
            // Channeling audio effect
            if (Math.random() < 0.2) {
                playSound(300 + item.conquerProgress * 200, 'sine', 0.05);
            }
            
            if (item.conquerProgress >= 1.5) {
                // Collect
                if (item.type === '6erep') {
                    // NUKE effect
                    enemies.forEach(e => {
                        e.stats.hp -= 999999;
                        e.stats.lastHitBy = '6ème République';
                    });
                    shakeTimer = 0.5;
                    flashTimer = 0.5;
                    playSound(200, 'sawtooth', 0.5);
                    updateHUD();
                } else if (item.type === 'health') {
                    healPlayer(25);
                } else if (item.type === 'chest') {
                    healPlayer(100);
                } else if (item.type === 'magnet') {
                    for (let j = lootDrops.length - 1; j >= 0; j--) {
                        if (lootDrops[j].stats.type === 'xp') {
                            lootDrops[j].stats.magnetized = true;
                        }
                    }
                    playSound(1200, 'sine', 0.2); 
                }
                
                scene.remove(item.mesh);
                mapItems.splice(i, 1);
            }
        } else {
            if (item.conquerProgress > 0) {
                item.conquerProgress -= delta;
                if (item.bgMesh) item.bgMesh.scale.setScalar(1.0 + (item.conquerProgress / 1.5) * 0.5);
                else item.mesh.scale.setScalar(1.0 + (item.conquerProgress / 1.5) * 0.5);
            }
        }
    }
    
    // Update Arrow UI
    if (closestItem) {
        pointer.innerText = closestItem.type === '6erep' ? '⚖️' : (closestItem.type === 'chest' ? '📦' : '🥤');
        const dx = closestItem.mesh.position.x - player.position.x;
        const dy = closestItem.mesh.position.y - player.position.y;
        
        if (closestDist > 10) { 
            pointer.classList.remove('hidden');
            const angle = Math.atan2(-dy, dx); 
            const deg = angle * (180 / Math.PI);
            
            pointer.style.transform = `rotate(${deg}deg)`;
            
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            const r = Math.min(cx, cy) - 50;
            
            pointer.style.left = `${cx + Math.cos(angle) * r - 20}px`;
            pointer.style.top = `${cy + Math.sin(angle) * r - 20}px`;
        } else {
            pointer.classList.add('hidden');
        }
    } else {
        pointer.classList.add('hidden');
    }
}

// ==========================================
// PROGRESSION
// ==========================================
function gainXp(amount) {
    player.stats.xp += amount;
    if (player.stats.xp >= player.stats.maxXp) {
        player.stats.xp -= player.stats.maxXp;
        player.stats.level++;
        player.stats.maxXp = Math.floor(player.stats.maxXp * 1.5);
        triggerLevelUp();
    }
    updateHUD();
}

function playAudioBuffer(buffer, vol = 1.0) {
    if (!audioCtx || !buffer) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            playAudioBuffer(buffer, vol);
        }).catch(() => {});
        return;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    
    if (vol !== 1.0) {
        const gain = audioCtx.createGain();
        gain.gain.value = vol;
        source.connect(gain);
        gain.connect(masterGainNode);
    } else {
        source.connect(masterGainNode);
    }
    
    source.start();
}

function generatePowerChoices(container) {
    container.innerHTML = ''; // clear

    const choices = [];
    const availablePool = [...availablePowers];
    
    for (let i = 0; i < 3; i++) {
        if (availablePool.length === 0) break;
        const idx = Math.floor(Math.random() * availablePool.length);
        choices.push(availablePool[idx]);
        availablePool.splice(idx, 1);
    }

    choices.forEach((power, index) => {
        const card = document.createElement('div');
        
        const isGolden = Math.random() < 0.002; // 0.2% chance
        const bonusLevels = isGolden ? Math.floor(Math.random() * 2) + 2 : 1; // 2 or 3 if golden
        
        card.className = isGolden ? 'power-card golden-ticket' : 'power-card aurora-border';
        card.tabIndex = 0; // Make focusable for keyboard / gamepad
        
        const existingPower = activePowers.find(p => p.id === power.id);
        const currentLevel = existingPower ? existingPower.level : 0;
        const nextLevel = currentLevel + bonusLevels;
        
        const levelGainText = isGolden ? `+${bonusLevels} Niveaux d'un coup !` : (power.getNextLevelDesc ? power.getNextLevelDesc(currentLevel) : `Niveau ${nextLevel}`);

        card.innerHTML = `
            <div class="key-badge">Touche [ ${index + 1} ]</div>
            <h3 style="${isGolden ? 'color: #f1c40f; text-shadow: 0 0 5px #f1c40f;' : ''}">${power.name} (Lvl ${nextLevel})</h3>
            <div style="font-size: 13px; font-weight: bold; color: ${power.category==='Offensif'?'#e74c3c':(power.category==='Défensif'?'#3498db':'#2ecc71')}; margin-top: -10px; margin-bottom: 5px;">${power.category}</div>
            <div class="power-icon" style="margin: 10px auto; ${isGolden ? 'filter: drop-shadow(0 0 10px #f1c40f);' : ''}">${power.icon}</div>
            <p class="desc">${power.desc}</p>
            <p style="font-size: 12px; color: ${isGolden ? '#f1c40f' : '#2ecc71'}; font-weight: bold; margin-top: 10px;">${levelGainText}</p>
        `;
        
        if (isGolden && rewardSound) {
            playAudioBuffer(rewardSound);
        }
        
        card.onclick = () => {
            selectPower(power, bonusLevels);
        };

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectPower(power, bonusLevels);
            }
        });
        
        container.appendChild(card);
    });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons({ root: container });
    }

    setTimeout(() => {
        const firstCard = container.querySelector('.power-card');
        if (firstCard) firstCard.focus();
    }, 50);
}

function triggerLevelUp() {
    gameState = 'LEVELUP';
    if (abatezSound) playAudioBuffer(abatezSound);
    else {
        playSound(600, 'square', 0.2);
        playSound(800, 'square', 0.2, 0.1);
    }
    
    const container = document.getElementById('power-choices');
    generatePowerChoices(container);
    
    document.getElementById('level-up-screen').classList.remove('hidden');
}

function selectPower(powerData, bonusLevels = 1) {
    const existing = activePowers.find(p => p.id === powerData.id);
    if (existing) {
        existing.level += bonusLevels;
        // Enhance power based on level (reduce cooldown, increase damage, etc)
        existing.cooldown *= Math.pow(0.8, bonusLevels); 
    } else {
        activePowers.push({
            ...powerData,
            level: bonusLevels
        });
    }

    document.getElementById('level-up-screen').classList.add('hidden');
    gameState = 'PLAYING';
    updateHUD();
}

// ==========================================
// COMBAT & POWERS
// ==========================================
function updatePowers(delta) {
    activePowers.forEach(power => {
        power.timer -= delta;
        if (power.timer <= 0) {
            if (power.cooldown > 0) {
                power.onFire();
                power.timer = power.cooldown;
            } else {
                // Continuous powers
                power.onFire();
            }
        }
    });

    // Update continuous effects (auras, orbiting shields)
    for (let i = auras.length - 1; i >= 0; i--) {
        const aura = auras[i];
        aura.life -= delta;
        
        if (aura.type === 'shield_orb') {
            aura.angle += aura.speed * delta;
            aura.mesh.position.x = player.position.x + Math.cos(aura.angle) * aura.radius;
            aura.mesh.position.y = player.position.y + Math.sin(aura.angle) * aura.radius;
            spawnParticles(aura.mesh.position, 0xf39c12, 1, 1); // trail
            
            // Damage enemies on contact
            const power = activePowers.find(p => p.id === 'garantie_autonomie');
            const powerLvl = power ? power.level : 1;
            const pLvl = player.stats.level || 1;
            // Dps: 50 base + 20 per power level. Multiplied by player level bonus
            const dps = (50 + powerLvl * 20) * (1 + (pLvl * 0.1));
            const dmgThisFrame = dps * delta;

            enemies.forEach(enemy => {
                const dist = aura.mesh.position.distanceTo(enemy.position);
                if(dist < 0.8) {
                    enemy.stats.hp -= dmgThisFrame;
                    enemy.stats.lastHitBy = 'garantie_autonomie';
                    
                    // Show damage text occasionally to avoid spam
                    enemy.orbDamageAccum = (enemy.orbDamageAccum || 0) + dmgThisFrame;
                    if (enemy.orbDamageAccum >= 15) {
                        spawnDamageText(enemy.position, Math.floor(enemy.orbDamageAccum));
                        enemy.orbDamageAccum = 0;
                    }
                }
            });

            // Also push Ruffin
            allies.forEach(ally => {
                if (ally.type && ally.type.id === 'ruffin') {
                    if (aura.mesh.position.distanceTo(ally.mesh.position) < 1.0) {
                        const dx = ally.mesh.position.x - aura.mesh.position.x;
                        const dy = ally.mesh.position.y - aura.mesh.position.y;
                        const len = Math.sqrt(dx*dx + dy*dy) || 1;
                        ally.bounceVx = (dx/len) * 15;
                        ally.bounceVy = (dy/len) * 15;
                    }
                }
            });
        }
        else if (aura.type === 'regle_verte') {
            aura.mesh.position.copy(player.position);
            aura.mesh.rotation.z += delta * 2; // spin
            aura.mesh.scale.setScalar(1 + Math.sin(gameTime * 8) * 0.1); // pulse
            if(Math.random() < 0.2) spawnParticles(player.position, 0x27ae60, 1, 2); // leaves
            
            // Damage nearby
            const power = activePowers.find(p => p.id === 'regle_verte');
            const pLvl = power ? power.level : 1;
            const playerLvl = player.stats.level || 1;
            const dps = (20 + pLvl * 10) * (1 + (playerLvl * 0.1));
            const dmgThisFrame = dps * delta;

            enemies.forEach(enemy => {
                if (player.position.distanceTo(enemy.position) < aura.radius) {
                    enemy.stats.hp -= dmgThisFrame; // continuous damage
                    enemy.stats.lastHitBy = 'regle_verte';
                    
                    enemy.orbDamageAccum = (enemy.orbDamageAccum || 0) + dmgThisFrame;
                    if (enemy.orbDamageAccum >= 15) {
                        spawnDamageText(enemy.position, Math.floor(enemy.orbDamageAccum));
                        enemy.orbDamageAccum = 0;
                    }
                }
            });

            allies.forEach(ally => {
                if (ally.type && ally.type.id === 'ruffin') {
                    if (aura.mesh.position.distanceTo(ally.mesh.position) < aura.radius) {
                        const dx = ally.mesh.position.x - aura.mesh.position.x;
                        const dy = ally.mesh.position.y - aura.mesh.position.y;
                        const len = Math.sqrt(dx*dx + dy*dy) || 1;
                        ally.bounceVx = (dx/len) * 15;
                        ally.bounceVy = (dy/len) * 15;
                    }
                }
            });
        }
        else if (aura.type === 'retraite_slow') {
            aura.mesh.position.copy(player.position);
            aura.mesh.rotation.z -= delta * 1.5; // spin opposite
            aura.mesh.scale.setScalar(1 + Math.cos(gameTime * 5) * 0.05); // pulse
            
            enemies.forEach(enemy => {
                if (player.position.distanceTo(enemy.position) < aura.radius) {
                    enemy.stats.slowTimer = 0.5; // refresh slow
                }
            });
        }
        else if (aura.type === 'urne_aoe') {
            if (!aura.hasHit) {
                aura.mesh.position.z -= 30 * delta; // fall down
                if (aura.mesh.position.z <= 0) {
                    aura.mesh.position.z = 0;
                    aura.hasHit = true;
                    // Apply burst damage on impact
                    enemies.forEach(enemy => {
                        if (aura.mesh.position.distanceTo(enemy.position) < aura.radius) {
                            enemy.stats.hp -= 40;
                            spawnDamageText(enemy.position, 40);
                        }
                    });
                    playSound(0, 'thud', 0.5);
                    spawnParticles(aura.mesh.position, 0x95a5a6, 20, 8); // impact dust
                }
            } else {
                aura.mesh.material.opacity = (aura.life / 1.0) * 0.5; // fade out
            }
        }
        else if (aura.type === 'freeze_shockwave') {
            aura.mesh.scale.addScalar(50 * delta); // rapidly expand
            aura.mesh.material.opacity = Math.max(0, aura.life / 0.5);
        }
        else if (aura.type === 'revocation_meteor') {
            if (!aura.hasHit) {
                aura.mesh.position.z -= 40 * delta; // fall fast
                if (aura.mesh.position.z <= 0) {
                    aura.mesh.position.z = 0;
                    aura.hasHit = true;
                    // Apply huge damage
                    if (aura.target && aura.target.stats) {
                        aura.target.stats.hp -= aura.damage;
                        aura.target.stats.lastHitBy = 'revocation_elus';
                        spawnDamageText(aura.target.position, aura.damage, '#c0392b');
                    }
                    playSound(0, 'thud', 0.8);
                    spawnParticles(aura.mesh.position, 0xc0392b, 30, 10);
                }
            } else {
                aura.mesh.material.opacity = aura.life / 1.0;
            }
        }

        if (aura.life <= 0) {
            scene.remove(aura.mesh);
            auras.splice(i, 1);
        }
    }
}

// Power Implementations
function getNearestEnemy() {
    if (enemies.length === 0) return null;
    let nearest = enemies[0];
    let minDist = player.position.distanceTo(nearest.position);
    for (let i = 1; i < enemies.length; i++) {
        const dist = player.position.distanceTo(enemies[i].position);
        if (dist < minDist) {
            minDist = dist;
            nearest = enemies[i];
        }
    }
    return nearest;
}

function fireCash() {
    // SMIC 1700 - rapid projectile
    const target = getNearestEnemy();
    let dx = player.stats.facingRight ? 1 : -1;
    let dy = player.stats.facingFront ? -1 : 1;
    
    if (target) {
        dx = target.position.x - player.position.x;
        dy = target.position.y - player.position.y;
    }
    const dist = Math.max(0.001, Math.sqrt(dx*dx + dy*dy));
    
    const geo = new THREE.PlaneGeometry(1.0, 1.0);
    const mat = new THREE.MeshBasicMaterial({ map: sprites.billet_vert, transparent: true, side: THREE.DoubleSide });
    const proj = new THREE.Mesh(geo, mat);
    proj.position.copy(player.position);
    
    // Rotate to face trajectory
    proj.rotation.z = Math.atan2(dy, dx);
    
    scene.add(proj);
    projectiles.push({
        mesh: proj,
        type: 'cash',
        vx: (dx/dist) * 10,
        vy: (dy/dist) * 10,
        life: 2.0,
        damage: 10,
        pierce: 0
    });
    playSound(0, 'cash', 0.15);
}

function fireWaterJet() {
    // Service Public de l'Eau - piercing projectile
    const target = getNearestEnemy();
    let dx = player.stats.facingRight ? 1 : -1;
    let dy = player.stats.facingFront ? -1 : 1;
    
    if (target) {
        dx = target.position.x - player.position.x;
        dy = target.position.y - player.position.y;
    }
    const dist = Math.max(0.001, Math.sqrt(dx*dx + dy*dy));
    dx /= dist; dy /= dist;

    const geo = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x3498db }); // Blue water
    const proj = new THREE.Mesh(geo, mat);
    proj.position.copy(player.position);
    
    // Align cylinder to direction
    proj.rotation.z = Math.atan2(dy, dx) + Math.PI/2;

    scene.add(proj);
    projectiles.push({
        mesh: proj,
        type: 'water',
        vx: dx * 15,
        vy: dy * 15,
        life: 1.5,
        damage: 15,
        pierce: 999 // hits multiple
    });
    playSound(800, 'noise', 0.3); 
}

function spawnUrneAoE() {
    // La 6ème République
    const target = getNearestEnemy();
    const spawnPos = target ? target.position.clone() : new THREE.Vector3(
        player.position.x + (player.stats.facingRight ? 3 : -3),
        player.position.y + (player.stats.facingFront ? -3 : 3),
        0
    );
    
    // Spawn an AoE urn on the target or in front of player
    const geo = new THREE.PlaneGeometry(3, 3);
    const mat = new THREE.MeshBasicMaterial({ map: sprites.erepu6, transparent: true, side: THREE.DoubleSide });
    const urne = new THREE.Mesh(geo, mat);
    urne.position.copy(spawnPos);
    urne.position.z = 15; // Start high up
    
    scene.add(urne);
    auras.push({
        mesh: urne,
        type: 'urne_aoe',
        radius: 2.5,
        life: 1.5,
        hasHit: false
    });
}

function activateRegleVerte() {
    // Check if already active
    let existing = auras.find(a => a.type === 'regle_verte');
    if (existing) {
        existing.life = 1.0; // Refresh
        return;
    }
    
    const geo = new THREE.TorusGeometry(2, 0.1, 8, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0x27ae60 });
    const auraMesh = new THREE.Mesh(geo, mat);
    scene.add(auraMesh);
    
    auras.push({
        mesh: auraMesh,
        type: 'regle_verte',
        radius: 2,
        life: 1.0
    });
}

function fireISF() {
    const target = getNearestEnemy();
    if (!target) return;
    
    // Lightning visual with isfclim texture
    const geo = new THREE.PlaneGeometry(3, 10); // Adjust size as needed
    const mat = new THREE.MeshBasicMaterial({ map: sprites.isfclim, transparent: true, side: THREE.DoubleSide });
    const lightning = new THREE.Mesh(geo, mat);
    lightning.position.copy(target.position);
    lightning.position.y += 5; // Starts above
    lightning.position.z = 2; // Above other elements
    scene.add(lightning);
    
    // Damage
    target.stats.hp -= 25;
    target.stats.lastHitBy = 'isf_climatique';
    spawnDamageText(target.position, 25);
    
    playSound(400, 'square', 0.2);
    
    // Fade out lightning
    setTimeout(() => {
        scene.remove(lightning);
    }, 150);
}

function fireRevocation() {
    if (enemies.length === 0) return;
    
    // Find enemy with highest maxHp
    let target = enemies[0];
    for (let i = 1; i < enemies.length; i++) {
        if (enemies[i].stats.maxHp > target.stats.maxHp) {
            target = enemies[i];
        }
    }
    
    const power = activePowers.find(p => p.id === 'revocation_elus');
    const level = power ? power.level : 1;
    
    // Create text texture for RÉVOQUÉ
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
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
    meteor.position.z = 20; // Fall from sky
    scene.add(meteor);
    
    auras.push({
        mesh: meteor,
        type: 'revocation_meteor',
        target: target,
        damage: 100 * level,
        life: 1.0,
        hasHit: false
    });
}

function activateRetraiteSlow() {
    let existing = auras.find(a => a.type === 'retraite_slow');
    if (existing) {
        existing.life = 1.0; 
        return;
    }
    
    const geo = new THREE.RingGeometry(2.8, 3, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x9b59b6, side: THREE.DoubleSide });
    const auraMesh = new THREE.Mesh(geo, mat);
    scene.add(auraMesh);
    
    auras.push({
        mesh: auraMesh,
        type: 'retraite_slow',
        radius: 3,
        life: 1.0
    });
}

function activateOrbShield() {
    // Adds a rotating orb
    const existingOrbs = auras.filter(a => a.type === 'shield_orb');
    
    // Max 3 orbs for performance/balance for now
    if (existingOrbs.length > 2) return; 

    const geo = new THREE.SphereGeometry(0.3, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf39c12 });
    const orb = new THREE.Mesh(geo, mat);
    scene.add(orb);
    
    auras.push({
        mesh: orb,
        type: 'shield_orb',
        angle: existingOrbs.length * (Math.PI * 2 / 3),
        speed: 3.0,
        radius: 2.0,
        life: 9999 // permanent until game over
    });
}

function freezeEnemies() {
    // Visual shockwave
    const geo = new THREE.RingGeometry(0.5, 1, 32);
    const mat = new THREE.MeshBasicMaterial({color: 0x00ffff, side: THREE.DoubleSide, transparent: true});
    const shockwave = new THREE.Mesh(geo, mat);
    shockwave.position.copy(player.position);
    scene.add(shockwave);
    
    auras.push({
        mesh: shockwave,
        type: 'freeze_shockwave',
        life: 0.5
    });

    enemies.forEach(e => {
        e.stats.frozenTimer = 3.0; // Freeze for 3 seconds
        e.material.color.setHex(0x00ffff); // Ice color
        setTimeout(() => {
            if (e && e.material && e.stats && e.stats.originalColor !== undefined) {
                e.material.color.setHex(e.stats.originalColor);
            }
        }, 3000);
    });
    playSound(800, 'sine', 0.3); // High pitch freeze sound
}

// ==========================================
// RÉFÉRENDUM D'AUTODÉTERMINATION
// ==========================================
const referendumZones = [];
function fireReferendum() {
    const power = activePowers.find(p => p.id === 'referendum_autodetermination');
    const lvl = power ? power.level : 1;
    const radius = 3 + lvl * 0.5;
    const duration = 5 + lvl;
    const conversionChance = 0.30 + lvl * 0.05;

    // Visual zone – tri-color Kanak flag rings
    const colors = [0x009a44, 0x009a44, 0x0032a0, 0xce1126];
    const rings = [];
    colors.forEach((c, idx) => {
        const geo = new THREE.RingGeometry(radius * (0.5 + idx * 0.17), radius * (0.5 + idx * 0.17) + 0.15, 48);
        const mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(geo, mat);
        ring.position.copy(player.position);
        ring.position.z = 0.1;
        scene.add(ring);
        rings.push(ring);
    });

    // Filled zone (semi-transparent)
    const fGeo = new THREE.CircleGeometry(radius, 48);
    const fMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const fMesh = new THREE.Mesh(fGeo, fMat);
    fMesh.position.copy(player.position);
    fMesh.position.z = 0.05;
    scene.add(fMesh);

    const zone = { rings, fill: fMesh, center: player.position.clone(), radius, duration, conversionChance, life: duration };
    referendumZones.push(zone);
    
    playSound(300, 'sine', 0.3);
    playSound(450, 'sine', 0.3, 0.15);
    playSound(600, 'sine', 0.3, 0.3);
}

function updateReferendumZones(delta) {
    for (let i = referendumZones.length - 1; i >= 0; i--) {
        const z = referendumZones[i];
        z.life -= delta;
        if (z.life <= 0) {
            z.rings.forEach(r => scene.remove(r));
            scene.remove(z.fill);
            referendumZones.splice(i, 1);
            continue;
        }
        const fade = z.life / z.duration;
        z.rings.forEach(r => r.material.opacity = 0.6 * fade);
        z.fill.material.opacity = 0.12 * fade;

        // Pulse rings
        const pulse = 1 + Math.sin(gameTime * 4) * 0.05;
        z.rings.forEach(r => r.scale.setScalar(pulse));

        // Conversion check
        enemies.forEach(enemy => {
            if (!enemy.stats || enemy.stats.converted) return;
            const dx = enemy.position.x - z.fill.position.x;
            const dy = enemy.position.y - z.fill.position.y;
            if (Math.sqrt(dx*dx + dy*dy) < z.radius) {
                if (Math.random() < z.conversionChance * delta) {
                    // Convert enemy!
                    enemy.stats.converted = true;
                    enemy.stats.convertedTimer = 8.0 + z.life; // fight for us
                    enemy.material.color.setHex(0x2ecc71);
                    spawnParticles(enemy.position, 0x2ecc71, 8, 4);
                }
            }
        });
    }
    
    // Update converted enemies behaviour (fight other enemies)
    enemies.forEach(converted => {
        if (!converted.stats || !converted.stats.converted) return;
        converted.stats.convertedTimer -= delta;
        if (converted.stats.convertedTimer <= 0) {
            converted.stats.converted = false;
            if (converted.stats.originalColor !== undefined)
                converted.material.color.setHex(converted.stats.originalColor);
            return;
        }
        converted.material.color.setHex(0x2ecc71); // stay green
        // Attack nearest non-converted enemy
        let nearest = null, minD = Infinity;
        enemies.forEach(other => {
            if (other === converted || other.stats.converted) return;
            const d = converted.position.distanceTo(other.position);
            if (d < minD) { minD = d; nearest = other; }
        });
        if (nearest && minD < 1.0) {
            nearest.stats.hp -= 20 * delta;
            nearest.stats.lastHitBy = 'referendum';
        } else if (nearest) {
            const dx = nearest.position.x - converted.position.x;
            const dy = nearest.position.y - converted.position.y;
            const d = Math.sqrt(dx*dx + dy*dy);
            converted.position.x += (dx/d) * 2 * delta;
            converted.position.y += (dy/d) * 2 * delta;
        }
    });
}

// ==========================================
// KRANIDOS RUSH
// ==========================================
let kranidosInvincible = false;
const fireTrails = []; // DoT fire patches on ground

function fireKranidosRush() {
    if (kranidosInvincible) return;
    
    const power = activePowers.find(p => p.id === 'kranidos_rush');
    const lvl = power ? power.level : 1;
    const damage = 60 * lvl;
    const distance = 10 + lvl * 2;
    const trailDuration = 3 + lvl * 0.5;
    
    // Determine direction from sprite
    let dx = 0, dy = 0;
    if (player.stats.facingRight && player.stats.facingFront)  { dx = 1; dy = -1; }
    else if (player.stats.facingRight && !player.stats.facingFront) { dx = 1; dy = 1; }
    else if (!player.stats.facingRight && player.stats.facingFront)  { dx = -1; dy = -1; }
    else { dx = -1; dy = 1; }
    
    // Simplify to cardinal if no diagonal
    if (Math.abs(dx) + Math.abs(dy) === 2) { dy = 0; } // prefer horizontal
    const len = Math.sqrt(dx*dx + dy*dy);
    dx /= len; dy /= len;
    
    kranidosInvincible = true;
    player.stats.invincible = true;
    
    // Visual rush trail on the path
    const steps = 12;
    for (let s = 0; s < steps; s++) {
        const tx = player.position.x + dx * (distance * s / steps);
        const ty = player.position.y + dy * (distance * s / steps);
        
        // Fire patch geometry
        const fg = new THREE.PlaneGeometry(1.2, 1.2);
        const fm = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.7 });
        const patch = new THREE.Mesh(fg, fm);
        patch.position.set(tx, ty, 0.05);
        scene.add(patch);
        fireTrails.push({ mesh: patch, life: trailDuration + Math.random() * 0.5, maxLife: trailDuration });
    }
    
    // Rush movement over 0.35s
    const startPos = player.position.clone();
    const endPos = { x: player.position.x + dx * distance, y: player.position.y + dy * distance };
    const rushDuration = 0.35;
    let elapsed = 0;
    
    // Orange particle trail
    spawnParticles(player.position, 0xff8800, 15, 8);
    playSound(200, 'sawtooth', 0.1);
    playSound(400, 'sawtooth', 0.2, 0.05);

    const rushInterval = setInterval(() => {
        elapsed += 0.016;
        const t = Math.min(1, elapsed / rushDuration);
        player.position.x = startPos.x + dx * distance * t;
        player.position.y = startPos.y + dy * distance * t;
        
        // Damage enemies along the path
        enemies.forEach(enemy => {
            if (enemy.stats.converted) return;
            const dist = player.position.distanceTo(enemy.position);
            if (dist < 1.5) {
                enemy.stats.hp -= damage * 0.016 / rushDuration;
                enemy.stats.lastHitBy = 'kranidos_rush';
                // Knockback
                const kx = enemy.position.x - player.position.x;
                const ky = enemy.position.y - player.position.y;
                const kd = Math.max(0.1, Math.sqrt(kx*kx + ky*ky));
                enemy.position.x += (kx/kd) * 3 * 0.016;
                enemy.position.y += (ky/kd) * 3 * 0.016;
                spawnParticles(enemy.position, 0xff4400, 3, 5);
            }
        });
        
        if (t >= 1) {
            clearInterval(rushInterval);
            kranidosInvincible = false;
            player.stats.invincible = false;
        }
    }, 16);
}

function updateFireTrails(delta) {
    for (let i = fireTrails.length - 1; i >= 0; i--) {
        const ft = fireTrails[i];
        ft.life -= delta;
        if (ft.life <= 0) {
            scene.remove(ft.mesh);
            fireTrails.splice(i, 1);
            continue;
        }
        const t = ft.life / ft.maxLife;
        ft.mesh.material.opacity = 0.7 * t;
        ft.mesh.material.color.setHex(t > 0.5 ? 0xff6600 : 0xff2200);
        ft.mesh.scale.setScalar(1 + Math.sin(gameTime * 8 + i) * 0.1);
        
        // DoT damage to enemies walking on trail
        if (Math.random() < delta * 3) {
            enemies.forEach(enemy => {
                if (enemy.stats.converted) return;
                const dx = enemy.position.x - ft.mesh.position.x;
                const dy = enemy.position.y - ft.mesh.position.y;
                if (Math.sqrt(dx*dx + dy*dy) < 0.8) {
                    enemy.stats.hp -= 8 * delta;
                    enemy.stats.lastHitBy = 'kranidos_rush';
                }
            });
        }
    }
}

function updateProjectiles(delta) {

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.life -= delta;
        
        // Effects based on type
        if (p.type === 'cash') {
            p.mesh.rotation.z += 15 * delta;
        } else if (p.type === 'water') {
            const scale = Math.max(0.2, p.life);
            p.mesh.scale.setScalar(scale);
        }

        // Collision with enemies
        let hit = false;
        for (let j = 0; j < enemies.length; j++) {
            const enemy = enemies[j];
            if (p.mesh.position.distanceTo(enemy.position) < 0.8) {
                let currentDodge = enemy.stats.dodgeChance || 0;
                if (currentDodge > 0) {
                    const zucman = activePowers.find(pow => pow.id === 'taxe_zucman');
                    if (zucman) {
                        currentDodge = Math.max(0, currentDodge - (zucman.level * 0.02));
                    }
                }
                
                if (currentDodge > 0 && Math.random() < currentDodge) {
                    createTextProjectile("Esquive!", enemy.position, 0, 3, '#f1c40f');
                    hit = true; // Consumes the projectile
                } else {
                    enemy.stats.hp -= p.damage;
                    enemy.stats.lastHitBy = p.type;
                    spawnDamageText(enemy.position, p.damage);
                    hit = true;
                    // Spawn hit particles
                    if (p.type === 'cash') spawnParticles(p.mesh.position, 0x2ecc71, 3, 3);
                    if (p.type === 'water') spawnParticles(p.mesh.position, 0x3498db, 5, 4);
                }
                break; // single target per frame check
            }
        }

        // Collision with Ruffin (poet)
        if (!hit) {
            for (let k = 0; k < allies.length; k++) {
                const ally = allies[k];
                if (ally.type && ally.type.id === 'ruffin') {
                    if (p.mesh.position.distanceTo(ally.mesh.position) < 0.8) {
                        const plen = Math.sqrt(p.vx*p.vx + p.vy*p.vy) || 1;
                        ally.bounceVx = (p.vx / plen) * 15;
                        ally.bounceVy = (p.vy / plen) * 15;
                        hit = true;
                        ally.mesh.material.color.setHex(0xe74c3c);
                        setTimeout(() => { if(ally && ally.mesh && ally.mesh.material) ally.mesh.material.color.setHex(0xffffff); }, 100);
                        break;
                    }
                }
            }
        }

        if (hit && p.pierce > 0) {
            p.pierce--;
            hit = false; // allow piercing
        }

        if (p.life <= 0 || (hit && p.pierce <= 0)) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
        }
    }
}

// Enemy Projectiles
function createTextProjectile(text, startPos, damage, speed, color = '#ffffff', isGiant = false) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    ctx.font = 'bold 40px Arial';
    const textWidth = Math.ceil(ctx.measureText(text).width);
    canvas.width = textWidth + 20;
    canvas.height = 64;
    
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
    ctx.strokeText(text, canvas.width/2, canvas.height/2);
    ctx.fillText(text, canvas.width/2, canvas.height/2);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.isDynamicCanvas = true;
    
    const scaleFactor = isGiant ? 30 : 80;
    const width = canvas.width / scaleFactor;
    const height = canvas.height / scaleFactor;
    const geo = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(startPos);
    
    mesh.scale.setScalar(0.1); // Start small for shout animation
    
    const dx = player.position.x - startPos.x;
    const dy = player.position.y - startPos.y;
    const dist = Math.max(0.1, Math.sqrt(dx*dx + dy*dy));
    
    const spread = (Math.random() - 0.5) * 0.2;
    scene.add(mesh);
    
    enemyProjectiles.push({
        mesh: mesh,
        vx: (dx/dist + spread) * speed,
        vy: (dy/dist + spread) * speed,
        life: 5.0,
        maxLife: 5.0,
        damage: damage
    });
}

function updateEnemyProjectiles(delta) {
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const p = enemyProjectiles[i];
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.life -= delta;
        
        // Shout animation (only for text projectiles)
        if (!p.isImage) {
            const elapsed = p.maxLife - p.life;
            if (elapsed < 0.15) {
                p.mesh.scale.setScalar(0.1 + (elapsed / 0.15) * 1.4);
            } else if (elapsed < 0.3) {
                p.mesh.scale.setScalar(1.5 - ((elapsed - 0.15) / 0.15) * 0.5);
            } else {
                p.mesh.scale.setScalar(1.0);
            }
        } else if (p.isBoots) {
            // Oscillate rotation between -10 and +10 degrees
            p.mesh.rotation.z = Math.sin(p.life * 15) * (10 * Math.PI / 180);
        }

        // Collision with player
        if (p.mesh.position.distanceTo(player.position) < 1.0) {
            if (p.damage > 0) damagePlayer(p.damage);
            scene.remove(p.mesh);
            enemyProjectiles.splice(i, 1);
            continue;
        }

        if (p.life <= 0) {
            scene.remove(p.mesh);
            enemyProjectiles.splice(i, 1);
        }
    }
}

// Particle System
function spawnParticles(pos, color, count, speed=5) {
    for(let i=0; i<count; i++) {
        const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const mat = new THREE.MeshBasicMaterial({color: color, transparent: true});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.position.z = Math.random() * 0.5; // slight Z variation
        const angle = Math.random() * Math.PI * 2;
        scene.add(mesh);
        particles.push({
            mesh: mesh,
            vx: Math.cos(angle) * speed * Math.random(),
            vy: Math.sin(angle) * speed * Math.random(),
            vrx: (Math.random() - 0.5) * 10,
            vry: (Math.random() - 0.5) * 10,
            vrz: (Math.random() - 0.5) * 10,
            life: 0.3 + Math.random() * 0.4,
            maxLife: 0.7
        });
    }
}

function updateParticles(delta) {
    for(let i=particles.length-1; i>=0; i--) {
        const p = particles[i];
        p.life -= delta;
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.mesh.rotation.x += p.vrx * delta;
        p.mesh.rotation.y += p.vry * delta;
        p.mesh.rotation.z += p.vrz * delta;
        p.mesh.material.opacity = p.life / p.maxLife;
        
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
}

let poofs = [];
function spawnPoof(pos) {
    // 2D Skull Poof
    const tex = getLucideTexture('skull', 'transparent', '#cccccc', false);
    const geo = new THREE.PlaneGeometry(1.2, 1.2);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(mesh);
    poofs.push({
        mesh: mesh,
        vrx: (Math.random() - 0.5) * 5,
        vry: (Math.random() - 0.5) * 5,
        vrz: (Math.random() - 0.5) * 5,
        life: 0.5,
        maxLife: 0.5
    });
}

// Damage Texts
let damageTexts = [];
function spawnDamageText(pos, amount) {
    const checkbox = document.getElementById('show-damage-numbers');
    if (checkbox && !checkbox.checked) return;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 36px "Bebas Neue", sans-serif';
    ctx.fillStyle = '#ff3333';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(Math.ceil(amount), 64, 32);
    ctx.fillText(Math.ceil(amount), 64, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.isDynamicCanvas = true;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new THREE.PlaneGeometry(1, 0.5);
    const mesh = new THREE.Mesh(geo, mat);
    
    mesh.position.copy(pos);
    mesh.position.y += 0.5; // Slightly above
    mesh.position.z = 2; // Above enemies
    
    scene.add(mesh);
    damageTexts.push({
        mesh: mesh,
        life: 0.8,
        maxLife: 0.8,
        vy: 2.0
    });
}

// Allies array
let allies = [];

// Ralliement (Ally NPC)
function spawnRalliement() {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 3;
    const ax = player.position.x + Math.cos(angle) * spawnDist;
    const ay = player.position.y + Math.sin(angle) * spawnDist;

    const type = allyNames[Math.floor(Math.random() * allyNames.length)];
    const maps = { 'rousso': sprites.roussoR, 'rima': sprites.rimaR, 'poutou': sprites.poutouR, 'ruffin': sprites.ruffin };
    const allyMap = maps[type.id];
    const typeObj = { id: type.id, map: allyMap, name: type.name };
    
    // Create ally mesh
    const geo = new THREE.PlaneGeometry(2.0, 2.0);
    const mat = new THREE.MeshBasicMaterial({ map: allyMap, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(ax, ay, 1);

    // Aura ring (only for normal allies)
    if (type.id !== 'ruffin') {
        const auraGeo = new THREE.RingGeometry(2.5, 2.8, 32);
        const auraMat = new THREE.MeshBasicMaterial({ color: 0x27ae60, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        const auraMesh = new THREE.Mesh(auraGeo, auraMat);
        mesh.add(auraMesh);
    }

    scene.add(mesh);
    allies.push({ mesh, life: 20.0, maxLife: 20.0, type: typeObj });

    // Legacy single-ally compat
    ralliementActive = true;
    ralliementSprite = mesh;
    return typeObj;
}

function updateRalliement(delta) {
    let anyAllyNearPlayer = false;

    // Update all allies
    for (let i = allies.length - 1; i >= 0; i--) {
        const ally = allies[i];
        ally.life -= delta;
        if (ally.life <= 0) {
            scene.remove(ally.mesh);
            allies.splice(i, 1);
            continue;
        }
        
        // Fade near end of life
        ally.mesh.material.opacity = Math.min(1, ally.life / 2);
        
        const isRuffin = (ally.type && ally.type.id === 'ruffin');

        if (isRuffin) {
            // RUFFIN: Fonce vers le joueur
            if (ally.bounceVx || ally.bounceVy) {
                ally.mesh.position.x += ally.bounceVx * delta;
                ally.mesh.position.y += ally.bounceVy * delta;
                
                ally.bounceVx *= 0.9;
                ally.bounceVy *= 0.9;
                
                if (Math.abs(ally.bounceVx) < 0.5 && Math.abs(ally.bounceVy) < 0.5) {
                    ally.bounceVx = 0;
                    ally.bounceVy = 0;
                }
                
                enemies.forEach(enemy => {
                    if (enemy.stats && !enemy.stats.converted) {
                        const edx = enemy.position.x - ally.mesh.position.x;
                        const edy = enemy.position.y - ally.mesh.position.y;
                        if (Math.sqrt(edx*edx + edy*edy) <= 2.0) {
                            const dmg = (player.stats.level * 10) * (enemy.stats.hp / enemy.stats.maxHp);
                            enemy.stats.hp -= dmg;
                            enemy.stats.lastHitBy = 'Ruffin (Poète)';
                            spawnDamageText(enemy.position, Math.floor(dmg));
                            enemy.material.color.setHex(0xe74c3c);
                            setTimeout(() => { if (enemy && enemy.material && enemy.stats) enemy.material.color.setHex(enemy.stats.originalColor || 0xffffff); }, 100);
                            
                            ally.bounceVx = 0;
                            ally.bounceVy = 0;
                        }
                    }
                });

                if (ally.bounceVx !== 0) ally.mesh.scale.x = ally.bounceVx > 0 ? 1 : -1;
                ally.mesh.rotation.z += 15 * delta;
            } else {
                ally.mesh.rotation.z = 0;
                const pdx = player.position.x - ally.mesh.position.x;
                const pdy = player.position.y - ally.mesh.position.y;
                const pdist = Math.sqrt(pdx*pdx + pdy*pdy);
                
                if (pdist > 0.5) {
                    ally.mesh.position.x += (pdx/pdist) * 4.0 * delta;
                    ally.mesh.position.y += (pdy/pdist) * 4.0 * delta;
                } else {
                    player.stats.hp -= 0.01;
                    ally.bounceVx = -(pdx/pdist) * 15.0; 
                    ally.bounceVy = -(pdy/pdist) * 15.0;
                    screenShakeTimer = 0.2; 
                }

                if (pdx !== 0) ally.mesh.scale.x = pdx > 0 ? 1 : -1;
            }


        } else {
            // Standard Allies (Sandrine, Rima, Poutou): Aura + Follow Player + Area Damage + Player Regen + Defense Boost
            const dx = player.position.x - ally.mesh.position.x;
            const dy = player.position.y - ally.mesh.position.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist <= 3.5) {
                anyAllyNearPlayer = true;
            }

            if (dist > 2.5) {
                ally.mesh.position.x += (dx/dist) * 3.5 * delta;
                ally.mesh.position.y += (dy/dist) * 3.5 * delta;
            }

            // Flip sprite based on dx
            if (ally.type) {
                const absX = Math.abs(ally.mesh.scale.x);
                ally.mesh.scale.x = dx > 0 ? absX : -absX;
            }

            ally.mesh.rotation.z = Math.sin(gameTime * 5 + i) * 0.1;

            // Damage nearby enemies
            if (Math.random() < delta * 2) {
                enemies.forEach(enemy => {
                    const edx = enemy.position.x - ally.mesh.position.x;
                    const edy = enemy.position.y - ally.mesh.position.y;
                    if (Math.sqrt(edx*edx + edy*edy) <= 3.0) {
                        enemy.stats.hp -= 15;
                        enemy.stats.lastHitBy = 'Ralliement';
                        spawnDamageText(enemy.position, 15);
                        enemy.material.color.setHex(0x2ecc71);
                        setTimeout(() => { if(enemy && enemy.material && enemy.stats) enemy.material.color.setHex(enemy.stats.originalColor || 0xffffff); }, 100);
                    }
                });
            }
        }
    }

    // Light HP regen for player inside Ally Zone
    if (anyAllyNearPlayer && player.stats.hp < player.stats.maxHp) {
        player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + 1.0 * delta);
        updateHUD();
    }

    const indicator = document.getElementById('ally-defense-indicator');
    if (allies.length === 0) {
        ralliementActive = false;
        if (indicator) indicator.classList.add('hidden');
    } else { 
        ralliementActive = true; 
        ralliementSprite = allies[0].mesh; 
        if (indicator) indicator.classList.remove('hidden');
    }
}

// ==========================================
// AUDIO SYSTEM
// ==========================================
function playSound(freq, type = 'sine', duration = 0.1, delay = 0) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    
    // Custom handling for specific types
    if (type === 'noise') {
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = freq;
        
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(masterGainNode);
        
        noise.start(audioCtx.currentTime + delay);
        return;
    }
    
    if (type === 'cash') {
        playSound(2000, 'sine', 0.05, delay);
        playSound(3000, 'sine', 0.1, delay + 0.05);
        return;
    }
    
    if (type === 'thud') {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime + delay);
        playSound(100, 'square', 0.1, delay);
        playSound(50, 'sine', 0.1, delay + 0.05);
        return;
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
    
    // Envelope to avoid clicking
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
    
    osc.connect(gainNode);
    gainNode.connect(masterGainNode);
    
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration);
}

function addToKillFeed(enemyType, weaponId) {
    const key = `${enemyType}_${weaponId}`;
    if (!killFeedBuffer[key]) {
        killFeedBuffer[key] = { count: 0, enemyType: enemyType, weaponId: weaponId };
    }
    killFeedBuffer[key].count++;
}

function processKillFeedBuffer() {
    const feed = document.getElementById('kill-feed');
    
    for (const key in killFeedBuffer) {
        const entry = killFeedBuffer[key];
        
        const names = {
            'JournalisteF': 'Journaliste', 'JournalisteH': 'Journaliste',
            'Poli': 'Politicien', 'Glucks': 'Glucksman',
            'Bill1': 'Milliardaire', 'Bill2': 'Milliardaire'
        };
        const eName = names[entry.enemyType] || entry.enemyType;
        
        const wNames = {
            'cash': 'Le SMIC à 1700€',
            'water': 'Service Public de l\'Eau',
            'regle_verte': 'Règle Verte',
            'retraite': 'Retraite à 60 ans',
            'urne_aoe': 'Urne 6e Rép',
            'isf_climatique': 'ISF Climatique',
            'revocation_elus': 'Révocation',
            'blocage_prix': 'Blocage des Prix',
            'kranidos_rush': 'Rush Kranidos',
            'referendum': 'Référendum',
            '6ème République': '6ème République',
            'Ruffin (Poète)': 'Ruffin (Poète)',
            'garantie_autonomie': 'Garantie d\'Autonomie'
        };
        const wName = wNames[entry.weaponId] || entry.weaponId;
        
        const countText = entry.count > 1 ? ` X${entry.count}` : '';
        const text = `${eName}${countText} convaincu(e)s par ${wName}`;
        
        const div = document.createElement('div');
        div.className = 'kill-feed-item';
        div.innerText = text;
        feed.appendChild(div);
        
        setTimeout(() => {
            if (div.parentNode) div.parentNode.removeChild(div);
        }, 3000);
    }
    
    killFeedBuffer = {}; // Reset buffer
}

// ==========================================
// UI / HUD / EVENTS
// ==========================================
function updateHUD() {
    document.getElementById('xp-bar').style.width = `${(player.stats.xp / player.stats.maxXp) * 100}%`;
    
    // Update Health Globe
    const hpPercent = Math.min(100, (player.stats.hp / player.stats.maxHp) * 100);
    const healthGlobe = document.getElementById('health-globe');
    healthGlobe.style.height = `${hpPercent}%`;
    document.getElementById('health-globe-text').innerText = Math.ceil(player.stats.hp);
    
    // Overheal color
    if (player.stats.hp > player.stats.maxHp) {
        healthGlobe.style.background = 'radial-gradient(circle at 30% 30%, #f1c40f, #f39c12, #e67e22)';
    } else {
        healthGlobe.style.background = 'radial-gradient(circle at 30% 30%, #ff5252, #d32f2f, #7f0000)';
    }

    // 25% HP Vignette (only when not flashing)
    const vignette = document.getElementById('low-hp-vignette');
    if (hpPercent <= 25 && player.stats.hp > 0 && flashTimer <= 0) {
        vignette.style.opacity = '1';
    } else {
        vignette.style.opacity = '0';
    }

    document.getElementById('level').innerText = `Lvl ${player.stats.level}`;
    
    // Update Powers HUD
    const powersHud = document.getElementById('powers-hud');
    powersHud.innerHTML = '';
    activePowers.forEach(p => {
        const div = document.createElement('div');
        div.className = 'power-icon';
        div.innerHTML = p.icon;
        div.title = `${p.name} Lvl ${p.level}\n${p.desc}`;
        powersHud.appendChild(div);
    });
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons({ root: powersHud });
    }
}

function updateTimerUI() {
    let minutes = Math.floor(gameTime / 60);
    let seconds = Math.floor(gameTime % 60);
    document.getElementById('timer').innerText = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

let breakingNewsTimeout = null;
function showBreakingNews(type = 'score', allyName = '') {
    const banner = document.getElementById('breaking-news-banner');
    if (!banner) return;
    
    if (breakingNewsTimeout) clearTimeout(breakingNewsTimeout);
    
    const textElement = banner.querySelector('.breaking-news-text');
    
    if (type === 'custom') {
        textElement.innerText = allyName; // used as text
        banner.style.background = 'linear-gradient(90deg, #8B0000, #ff0000, #8B0000)';
    } else if (type === 'ally') {
        textElement.innerText = `🤝 FLASH INFO 🤝 SOUTIEN ! ${allyName} rejoint la lutte aux côtés de MÉLENCHON !`;
        banner.style.background = 'linear-gradient(90deg, #1a472a, #27ae60, #1a472a)';
    } else {
        textElement.innerText = `🚨 FLASH INFO 🚨 MELENCHON: Déjà au deuxième tour ? ${totalConvinced} convaincus !`;
        banner.style.background = '';
    }
    
    banner.classList.remove('hidden');
    
    playSound(400, 'square', 0.2);
    setTimeout(() => playSound(600, 'square', 0.3), 200);
    
    breakingNewsTimeout = setTimeout(() => {
        banner.classList.add('hidden');
        banner.style.background = '';
    }, 10000);
}


function formatTime(totalSeconds) {
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

let currentResolutionSetting = 'auto';

function updateGameScale(userInitiated = false) {
    const container = document.getElementById('game-container');
    const select = document.getElementById('resolution-select');
    if (select) currentResolutionSetting = select.value;

    let targetW = window.innerWidth;
    let targetH = window.innerHeight;

    if (currentResolutionSetting !== 'auto') {
        const parts = currentResolutionSetting.split('x');
        if (parts.length === 2) {
            targetW = parseInt(parts[0]);
            targetH = parseInt(parts[1]);

            if (userInitiated) {
                try {
                    if (typeof require !== 'undefined') {
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('resize-window', { width: targetW, height: targetH });
                    } else if (window.ipcRenderer) {
                        window.ipcRenderer.send('resize-window', { width: targetW, height: targetH });
                    } else if (window.resizeTo) {
                        window.resizeTo(targetW, targetH);
                    }
                } catch(e){}
            }
        }
    }

    const scaleX = window.innerWidth / targetW;
    const scaleY = window.innerHeight / targetH;
    const scale = Math.min(scaleX, scaleY);

    if (currentResolutionSetting === 'auto') {
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.position = 'relative';
        container.style.left = '0';
        container.style.top = '0';
        container.style.transform = 'none';
    } else {
        container.style.width = targetW + 'px';
        container.style.height = targetH + 'px';
        container.style.position = 'absolute';
        container.style.left = '50%';
        container.style.top = '50%';
        container.style.transform = `translate(-50%, -50%) scale(${scale})`;
        container.style.transformOrigin = 'center center';
    }

    const aspect = targetW / targetH;
    const frustumSize = 16;
    if (camera) {
        camera.left = -frustumSize * aspect / 2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = -frustumSize / 2;
        camera.updateProjectionMatrix();
    }
    if (renderer) {
        renderer.setSize(targetW, targetH);
    }

    // Auto-scale UI proportionally with window size
    const baseScale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    const userScaleVal = parseFloat(document.getElementById('ui-scale-slider')?.value || 100) / 100;
    const finalUiScale = Math.max(0.5, Math.min(2.5, baseScale * userScaleVal));
    
    const uiElements = document.querySelectorAll('#hud, #kill-feed, #breaking-news-banner, #item-pointer');
    uiElements.forEach(el => {
        if (el) el.style.zoom = finalUiScale;
    });

    // Scale overlay contents directly
    document.querySelectorAll('.overlay').forEach(overlay => {
        Array.from(overlay.children).forEach(child => {
            if (child.tagName.toLowerCase() !== 'video') {
                child.style.zoom = finalUiScale;
            }
        });
    });
}

function onWindowResize() {
    updateGameScale();
}

// Event Listeners for UI
// Build a shuffled queue of all tracks, refill when empty
let ostQueue = [];
let lastPlayedOstTrack = null;

function buildOstQueue() {
    ostQueue = [...ostTracks];
    // Fisher-Yates shuffle
    for (let i = ostQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ostQueue[i], ostQueue[j]] = [ostQueue[j], ostQueue[i]];
    }
    // Strict guarantee: first track in new queue must NOT be equal to lastPlayedOstTrack
    if (ostQueue.length > 1 && ostQueue[0] === lastPlayedOstTrack) {
        const swapIdx = ostQueue.length - 1;
        [ostQueue[0], ostQueue[swapIdx]] = [ostQueue[swapIdx], ostQueue[0]];
    }
}

function playRandomOst() {
    if (ostTracks.length === 0) return;
    if (ostQueue.length === 0) buildOstQueue();
    
    let track = ostQueue.shift();
    // Double check: if somehow track is equal to lastPlayedOstTrack, swap with next
    if (track === lastPlayedOstTrack && ostQueue.length > 0) {
        const nextTrack = ostQueue.shift();
        ostQueue.push(track);
        track = nextTrack;
    }

    lastPlayedOstTrack = track;
    lastOstIndex = ostTracks.indexOf(track);
    
    ostAudio.src = track;
    const vol = document.getElementById('ost-volume-slider');
    ostAudio.volume = vol ? vol.value / 100 : 0.2;
    ostAudio.play().catch(e => console.log('OST autoplay issue:', e));
    
    // Update Now Playing UI
    const npTrack = document.getElementById('music-title');
    if (npTrack) {
        npTrack.innerText = track.split('/').pop().replace('.mp3', '');
    }
}

document.body.addEventListener('click', () => {
    if (ostAudio.paused && gameState === 'MENU') {
        ostAudio.src = 'source/ost/Title Theme Tortue Survivor.mp3';
        ostAudio.play().catch(e=>console.log(e));
    }
}, {once: true});

ostAudio.addEventListener('ended', () => {
    if (gameState === 'MENU') {
        setTimeout(() => {
            if (gameState === 'MENU') {
                ostAudio.src = 'source/ost/Title Theme Tortue Survivor.mp3';
                ostAudio.play().catch(e => console.log('Autoplay issue:', e));
            }
        }, 30000); // 30 seconds delay between loops
    } else {
        playRandomOst();
    }
});
ostAudio.addEventListener('error', () => { setTimeout(playRandomOst, 1000); }); // fallback on error

document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');
    
    // Reset Rerolls
    remainingRerolls = 3;
    const countSpan = document.getElementById('reroll-count');
    if (countSpan) countSpan.innerText = `(3)`;
    if (rerollBtn) {
        rerollBtn.disabled = false;
        rerollBtn.style.filter = 'none';
        rerollBtn.style.cursor = 'pointer';
    }

    gameSpeedMultiplier = 1.0;
    const turbo = document.getElementById('turbo-toggle');
    const ultra = document.getElementById('ultraturbo-toggle');
    if (ultra && ultra.checked) gameSpeedMultiplier = 4.0;
    else if (turbo && turbo.checked) gameSpeedMultiplier = 2.0;
    
    // Need user gesture to resume AudioContext
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Magic start sound (sweep up)
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(masterGainNode);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
    
    // Ensure OST plays (cut Title Theme and start Random OST)
    ostAudio.volume = document.getElementById('ost-volume-slider').value / 100;
    playRandomOst();
    
    // Fade in HUD & show player
    document.getElementById('hud').style.opacity = '1';
    if (player) player.visible = true;
    
    lastTime = performance.now();
    gameState = 'PLAYING';
});

// Menus logic
const menus = ['options-menu', 'enemies-menu', 'attacks-menu', 'help-menu', 'about-menu', 'bonus-menu'];
const hideAllMenus = () => {
    menus.forEach(m => document.getElementById(m).classList.add('hidden'));
    const np = document.getElementById('now-playing');
    if(np && gameState === 'PLAYING') np.style.opacity = '0';
};
const showMenu = (id) => {
    hideAllMenus();
    document.getElementById(id).classList.remove('hidden');
    const np = document.getElementById('now-playing');
    if(np && !ostAudio.paused) np.style.opacity = '1';
};

['nav-options-btn', 'pause-options-btn'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => { showMenu('options-menu'); refreshSaveSlots(); });
});
['nav-enemies-btn', 'pause-enemies-btn'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => { 
        showMenu('enemies-menu'); 
        if(localStorage.getItem('seen_learaph') === 'true') {
            const img = document.getElementById('learaph-bestiary-img');
            if (img) {
                img.classList.remove('boss-silhouette');
                img.onclick = () => openLightbox(img.src);
            }
            const name = document.getElementById('learaph-bestiary-name');
            if (name) name.innerText = "Léa & Raph";
            const desc = document.getElementById('learaph-bestiary-desc');
            if (desc) desc.innerText = "Le duo infernal du service public. Leurs attaques combinées sont redoutables !";
        }
        if(localStorage.getItem('bossDefeated') === 'true') {
            const img = document.getElementById('boss-bestiary-img');
            if (img) {
                img.classList.remove('boss-silhouette');
                img.onclick = () => openLightbox(img.src);
            }
            const name = document.getElementById('boss-bestiary-name');
            if (name) name.innerText = "Marine (Mega Boss)";
            const desc = document.getElementById('boss-bestiary-desc');
            if (desc) desc.innerText = "L'ultime adversaire de la 5ème République. Extrêmement résistante et destructrice !";
        }
    });
});
const bonusBtn = document.getElementById('bonus-btn');
if (bonusBtn) {
    bonusBtn.addEventListener('click', () => { 
        showMenu('bonus-menu'); 
        let wins = parseInt(localStorage.getItem('timesFinished') || '0');
        if (localStorage.getItem('bossDefeated') === 'true' && wins === 0) wins = 1;
        
        if (wins >= 1) document.getElementById('bonus-turbo-container').classList.remove('hidden');
        if (wins >= 2) document.getElementById('bonus-ultraturbo-container').classList.remove('hidden');
    });
}
['nav-attacks-btn', 'pause-attacks-btn'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => { showMenu('attacks-menu'); });
});
['nav-help-btn', 'pause-help-btn'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => { showMenu('help-menu'); });
});
['nav-about-btn', 'pause-about-btn'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => { showMenu('about-menu'); });
});

document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', hideAllMenus);
});

document.getElementById('volume-slider').addEventListener('input', (e) => {
    if (masterGainNode) {
        masterGainNode.gain.value = e.target.value / 100;
    }
});

document.getElementById('ost-volume-slider').addEventListener('input', (e) => {
    ostAudio.volume = e.target.value / 100;
});

// UI Scale Slider
document.getElementById('ui-scale-slider').addEventListener('input', (e) => {
    document.getElementById('ui-scale-label').innerText = `${e.target.value}%`;
    updateGameScale();
});

// Quit App Button listeners
const quitAppBtn = document.getElementById('quit-app-btn');
if (quitAppBtn) {
    quitAppBtn.addEventListener('click', () => {
        if (window.confirm("Voulez-vous vraiment quitter le jeu ?")) {
            window.close();
            // If in electron
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                if (ipcRenderer) ipcRenderer.send('window-close');
            }
        }
    });
}

// Resolution & Fullscreen Options
document.getElementById('resolution-select')?.addEventListener('change', () => {
    updateGameScale(true);
});

document.getElementById('fullscreen-toggle')?.addEventListener('change', (e) => {
    if (e.target.checked) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
        try {
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('set-fullscreen', true);
            }
        } catch(e){}
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        try {
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('set-fullscreen', false);
            }
        } catch(e){}
    }
});

// Sync fullscreen checkbox if user presses F11 or Esc
document.addEventListener('fullscreenchange', () => {
    const toggle = document.getElementById('fullscreen-toggle');
    if (toggle) toggle.checked = !!document.fullscreenElement;
});

// ==========================================
// PAUSE LÉGÈRE CHEAT CODE (1212 => SPEED X2)
// ==========================================
let pauseCheatBuffer = '';
window.addEventListener('keydown', (e) => {
    if (gameState === 'PAUSED_LITE') {
        let key = e.key.toLowerCase();
        
        let digit = '';
        if (key === '1' || e.key === '&' || e.key === 'Numpad1') digit = '1';
        else if (key === '2' || e.key === 'é' || e.key === 'Numpad2') digit = '2';
        
        pauseCheatBuffer += (digit || key);
        if (pauseCheatBuffer.length > 10) pauseCheatBuffer = pauseCheatBuffer.slice(-10);

        if (pauseCheatBuffer.endsWith('1212')) {
            pauseCheatBuffer = '';
            gameSpeedMultiplier = (gameSpeedMultiplier === 2.0 ? 1.0 : 2.0);

            playSound(600, 'sine', 0.1);
            playSound(1200, 'sine', 0.2, 0.1);

            showBreakingNews('custom', gameSpeedMultiplier === 2.0 ? "⚡ CHEAT ACTIVÉ : VITESSE X2 ⚡" : "⚡ CHEAT DÉSACTIVÉ : VITESSE X1 ⚡");
        }
        else if (pauseCheatBuffer.endsWith('end')) {
            pauseCheatBuffer = '';
            gameTime = 11 * 60 + 30; // 11m30
            if (activePowers.length > 0) {
                activePowers[0].level += 20;
            }
            
            playSound(600, 'sine', 0.1);
            playSound(1200, 'sine', 0.2, 0.1);

            showBreakingNews('custom', "⚡ CHEAT ACTIVÉ : 11m30 & POWER +20 ⚡");
        }
        else if (pauseCheatBuffer.endsWith('kill')) {
            pauseCheatBuffer = '';
            enemies.forEach(e => {
                if (e.stats) e.stats.hp = 0;
            });
            playSound(600, 'sine', 0.1);
            playSound(1200, 'sine', 0.2, 0.1);
            showBreakingNews('custom', "⚡ CHEAT ACTIVÉ : PURGE TOTALE ⚡");
        }
    }
});

// ==========================================
// LEVEL UP KEYBOARD SHORTCUTS (1, 2, 3)
// ==========================================
window.addEventListener('keydown', (e) => {
    if (gameState === 'LEVELUP') {
        const choices = document.querySelectorAll('#power-choices .power-card');
        if (e.key === '1' || e.key === '&' || e.key === 'Numpad1') {
            if (choices[0]) choices[0].click();
        } else if (e.key === '2' || e.key === 'é' || e.key === 'Numpad2') {
            if (choices[1]) choices[1].click();
        } else if (e.key === '3' || e.key === '"' || e.key === 'Numpad3') {
            if (choices[2]) choices[2].click();
        }
    }
});

// ==========================================
// MOBILE VIRTUAL JOYSTICK (DYNAMIC & REPOSITIONABLE)
// ==========================================
let joystickActive = false;
let joystickTouchId = null;
let joystickOrigin = { x: 0, y: 0 };
let joystickDx = 0;
let joystickDy = 0;

const joystickContainer = document.getElementById('joystick-container');
const joystickKnob = document.getElementById('joystick-knob');
const maxJoystickRadius = 50;

window.addEventListener('touchstart', (e) => {
    // Show dash button on touch screens
    const dashBtn = document.getElementById('touch-dash-btn');
    if (dashBtn) dashBtn.classList.remove('hidden');

    // Unlock audio context on first touch
    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (gameState !== 'PLAYING') return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Ignore if touch is on interactive UI elements or buttons
        if (target && (target.tagName === 'BUTTON' || target.closest('.overlay') || target.closest('#music-ui') || target.closest('#touch-dash-btn') || target.closest('.option-row'))) {
            continue;
        }

        if (!joystickActive) {
            joystickActive = true;
            joystickTouchId = touch.identifier;
            joystickOrigin = { x: touch.clientX, y: touch.clientY };

            if (joystickContainer) {
                joystickContainer.style.left = `${touch.clientX}px`;
                joystickContainer.style.top = `${touch.clientY}px`;
                joystickContainer.classList.remove('hidden');
                joystickContainer.style.opacity = '0.75';
            }
            if (joystickKnob) {
                joystickKnob.style.transform = 'translate(-50%, -50%)';
            }
            joystickDx = 0;
            joystickDy = 0;
            break;
        }
    }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) {
            const rawDx = touch.clientX - joystickOrigin.x;
            const rawDy = touch.clientY - joystickOrigin.y;
            const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

            const clampedDist = Math.min(dist, maxJoystickRadius);
            const angle = Math.atan2(rawDy, rawDx);

            const knobX = Math.cos(angle) * clampedDist;
            const knobY = Math.sin(angle) * clampedDist;

            if (joystickKnob) {
                joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
            }

            if (dist > 5) {
                joystickDx = knobX / maxJoystickRadius;
                joystickDy = -knobY / maxJoystickRadius; // Inverted Y for 3D coordinates
            } else {
                joystickDx = 0;
                joystickDy = 0;
            }
            break;
        }
    }
}, { passive: true });

function resetJoystick() {
    joystickActive = false;
    joystickTouchId = null;
    joystickDx = 0;
    joystickDy = 0;
    if (joystickContainer) {
        joystickContainer.classList.add('hidden');
    }
    if (joystickKnob) {
        joystickKnob.style.transform = 'translate(-50%, -50%)';
    }
}

window.addEventListener('touchend', (e) => {
    if (!joystickActive) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
            resetJoystick();
            break;
        }
    }
});

window.addEventListener('touchcancel', resetJoystick);

// ==========================================
// SAVE SYSTEM (3 slots)
// ==========================================
function getSaveData(slot) {
    try { return JSON.parse(localStorage.getItem(`tortue_save_${slot}`)) || null; }
    catch(e) { return null; }
}

function saveGame(slot) {
    if (gameState !== 'PLAYING' && gameState !== 'PAUSED') {
        alert('Aucune partie en cours à sauvegarder.');
        return;
    }
    const data = {
        time: gameTime,
        level: player.stats.level,
        hp: player.stats.hp,
        maxHp: player.stats.maxHp,
        xp: player.stats.xp,
        maxXp: player.stats.maxXp,
        totalConvinced: totalConvinced,
        activePowers: activePowers.map(p => ({ id: p.id, level: p.level })),
        date: new Date().toLocaleDateString('fr-FR'),
        saveTime: formatTime(gameTime)
    };
    localStorage.setItem(`tortue_save_${slot}`, JSON.stringify(data));
    refreshSaveSlots();
    alert(`Sauvegardé dans le Slot ${slot + 1} !`);
}

function loadSave(slot) {
    const data = getSaveData(slot);
    if (!data) { alert('Slot vide.'); return; }
    if (gameState === 'PLAYING' || gameState === 'PAUSED') {
        if (!confirm(`Charger le Slot ${slot + 1} ? La partie actuelle sera perdue.`)) return;
    }
    
    // Restart the game state then apply save
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    hideAllMenus();
    
    // Re-init
    if (typeof initGame === 'function') initGame();
    
    // Apply saved state
    setTimeout(() => {
        gameTime = data.time;
        player.stats.level = data.level;
        player.stats.hp = data.hp;
        player.stats.maxHp = data.maxHp;
        player.stats.xp = data.xp;
        player.stats.maxXp = data.maxXp;
        totalConvinced = data.totalConvinced;
        
        // Restore powers
        activePowers.length = 0;
        data.activePowers.forEach(saved => {
            const power = availablePowers.find(p => p.id === saved.id);
            if (power) activePowers.push({ ...power, level: saved.level });
        });
        
        updateHUD();
        gameState = 'PLAYING';
    }, 100);
}

function deleteSave(slot) {
    if (!confirm(`Supprimer la sauvegarde du Slot ${slot + 1} ?`)) return;
    localStorage.removeItem(`tortue_save_${slot}`);
    refreshSaveSlots();
}

function refreshSaveSlots() {
    for (let i = 0; i < 3; i++) {
        const data = getSaveData(i);
        const infoEl = document.getElementById(`save-info-${i}`);
        if (!infoEl) continue;
        if (data) {
            infoEl.innerHTML = `Lvl ${data.level} | ${data.saveTime}<br><small style="color:#aaa">${data.date}</small>`;
            document.getElementById(`save-slot-${i}`).style.borderColor = '#27ae60';
        } else {
            infoEl.innerHTML = '<em style="color:#666">Vide</em>';
            document.getElementById(`save-slot-${i}`).style.borderColor = '#444';
        }
    }
}


document.getElementById('quit-btn').addEventListener('click', () => {
    // Return to main menu without confirming (or confirm if we want to change this later)
    location.reload();
});

const pauseQuitBtn = document.getElementById('pause-quit-btn');
if (pauseQuitBtn) {
    pauseQuitBtn.addEventListener('click', () => {
        document.getElementById('quit-prompt-modal').classList.remove('hidden');
    });
}

document.getElementById('quit-confirm-btn').addEventListener('click', () => {
    window.close();
    if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        if (ipcRenderer) ipcRenderer.send('window-close');
    }
});

document.getElementById('quit-cancel-btn').addEventListener('click', () => {
    document.getElementById('quit-prompt-modal').classList.add('hidden');
});

// Lightbox logic
function openLightbox(src) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    img.src = src;
    modal.classList.remove('hidden');
}

document.getElementById('lightbox-modal').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox-modal') {
        document.getElementById('lightbox-modal').classList.add('hidden');
    }
});

const rerollBtn = document.getElementById('reroll-btn');
if(rerollBtn) {
    rerollBtn.addEventListener('click', () => {
        if (remainingRerolls > 0) {
            remainingRerolls--;
            const countSpan = document.getElementById('reroll-count');
            if (countSpan) countSpan.innerText = `(${remainingRerolls})`;
            
            const container = document.getElementById('power-choices');
            generatePowerChoices(container);
            
            if (remainingRerolls === 0) {
                rerollBtn.disabled = true;
                rerollBtn.style.filter = 'grayscale(100%) brightness(0.5)';
                rerollBtn.style.cursor = 'not-allowed';
            }
        }
    });
}

// Parallax effect for Menu and Level Up screens
document.addEventListener('mousemove', (e) => {
    if (gameState === 'START' || gameState === 'LEVELUP') {
        const x = (e.clientX / window.innerWidth - 0.5) * 20; // max 20px offset
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        
        if (gameState === 'START') {
            const logo = document.getElementById('main-logo');
            const bg = document.querySelector('#start-screen video');
            if (logo) logo.style.transform = `translate(${x}px, ${y}px)`;
            if (bg) bg.style.transform = `translate(${-x}px, ${-y}px) scale(1.05)`;
        } else if (gameState === 'LEVELUP') {
            const choices = document.getElementById('power-choices');
            if (choices) choices.style.transform = `translate(${x}px, ${y}px)`;
        }
    }
});

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        document.getElementById('pause-screen').classList.remove('hidden');
        if (!ostAudio.paused) ostAudio.pause();
        const banner = document.getElementById('breaking-news-banner');
        if (banner) banner.classList.add('paused');
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        document.getElementById('pause-screen').classList.add('hidden');
        if (ostAudio.paused && !document.getElementById('music-toggle-btn').innerHTML.includes('play')) ostAudio.play().catch(e=>console.log(e));
        const banner = document.getElementById('breaking-news-banner');
        if (banner) banner.classList.remove('paused');
    }
}

function togglePauseLite() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED_LITE';
        document.getElementById('pause-lite-screen').classList.remove('hidden');
        const banner = document.getElementById('breaking-news-banner');
        if (banner) banner.classList.add('paused');
    } else if (gameState === 'PAUSED_LITE') {
        gameState = 'PLAYING';
        document.getElementById('pause-lite-screen').classList.add('hidden');
        const banner = document.getElementById('breaking-news-banner');
        if (banner) banner.classList.remove('paused');
    }
}

document.getElementById('resume-btn')?.addEventListener('click', togglePause);

const hudPauseBtn = document.getElementById('hud-pause-btn');
if (hudPauseBtn) hudPauseBtn.addEventListener('click', () => { if(gameState === 'PLAYING') togglePause(); });

const pauseRestartBtn = document.getElementById('pause-restart-btn');
if (pauseRestartBtn) pauseRestartBtn.addEventListener('click', () => {
    togglePause();
    const btn = document.getElementById('restart-btn');
    if (btn) btn.click();
});

const pauseSoundBtn = document.getElementById('pause-sound-btn');
if (pauseSoundBtn) pauseSoundBtn.addEventListener('click', () => {
    if (masterGainNode.gain.value > 0) {
        masterGainNode.gain.value = 0;
        pauseSoundBtn.innerText = "Son: Désactivé";
    } else {
        masterGainNode.gain.value = 0.5;
        pauseSoundBtn.innerText = "Son: Activé";
    }
});

// Mobile controls hint update
window.addEventListener('DOMContentLoaded', () => {
    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const controlsHintText = document.getElementById('controls-hint-text');
    if (controlsHintText) {
        if (isMobile) {
            controlsHintText.innerHTML = '<i data-lucide="hand" style="width:16px;height:16px;display:inline-block;vertical-align:middle;"></i> Touchez pour commencer';
            const desktopOnly = document.querySelectorAll('.desktop-only');
            desktopOnly.forEach(el => el.classList.add('hidden-on-mobile'));
        } else {
            controlsHintText.innerHTML = '<i data-lucide="gamepad-2" style="width:16px;height:16px;display:inline-block;vertical-align:middle;"></i> D-Pad / ZQSD pour naviguer';
        }
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

document.querySelectorAll('.keybind-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if(waitingForKey) waitingForKey.classList.remove('waiting');
        waitingForKey = e.target;
        waitingForKey.classList.add('waiting');
        waitingForKey.innerText = '...';
    });
});

document.getElementById('restart-btn').addEventListener('click', () => {
    location.reload();
});

document.getElementById('victory-restart-btn')?.addEventListener('click', () => {
    location.reload();
});

document.getElementById('victory-menu-btn')?.addEventListener('click', () => {
    location.reload();
});

document.getElementById('prestige-btn')?.addEventListener('click', () => {
    if (confirm("Voulez-vous vraiment passer au Mode Prestige ? Votre progression sera réinitialisée.")) {
        localStorage.removeItem('bossDefeated');
        localStorage.removeItem('timesFinished');
        localStorage.removeItem('seen_learaph');
        alert("Progression réinitialisée. Félicitations pour votre Prestige !");
        location.reload();
    }
});

// Procedural texture for background
function createConcreteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    context.fillStyle = '#444444';
    context.fillRect(0, 0, 512, 512);
    
    // Add noise
    const imgData = context.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 50;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
        data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
    }
    context.putImageData(imgData, 0, 0);
    
    // Add darker cracks/spots
    for(let i=0; i<300; i++) {
        context.fillStyle = `rgba(0,0,0,${Math.random()*0.15})`;
        context.beginPath();
        context.arc(Math.random()*512, Math.random()*512, Math.random()*8, 0, Math.PI*2);
        context.fill();
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10); // Tile it over 40x40 chunk
    return tex;
}

function createFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    context.fillStyle = '#8B5A2B'; // Base wood color
    context.fillRect(0, 0, 512, 512);
    
    // Wood grain lines
    for (let i = 0; i < 512; i += 4) {
        context.fillStyle = Math.random() > 0.5 ? '#7A4B22' : '#9C6933';
        context.fillRect(0, i, 512, 2);
    }
    
    // Planks separations
    context.fillStyle = '#3e2723';
    for (let i = 0; i < 512; i += 64) {
        context.fillRect(0, i - 1, 512, 2); // Horizontal lines
        
        // Random vertical stagger
        for (let j = 0; j < 512; j += 128) {
            const offset = (Math.random() * 64) | 0;
            context.fillRect(j + offset, i, 2, 64);
        }
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    return tex;
}

function createSandTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    context.fillStyle = '#E2C275'; // Base sand color
    context.fillRect(0, 0, 512, 512);
    
    // Add noise
    const imgData = context.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 30;
        data[i] = Math.max(0, Math.min(255, data[i] + noise + 20));
        data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
        data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
    }
    context.putImageData(imgData, 0, 0);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    return tex;
}

// Init on load
window.onload = init;
