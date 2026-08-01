/**
 * Rebuild www/main.js from clean Electron root + Android portrait patches.
 * UTF-8 no BOM.
 */
const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, 'main.js');
const outPath = path.join(__dirname, 'www', 'main.js');

let s = fs.readFileSync(rootPath, 'utf8');
if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);

// 1) OST case for Android assets
s = s.split('source/OST/').join('source/ost/');

// 2) Pixel texture helpers after textureLoader
s = s.replace(
  'const textureLoader = new THREE.TextureLoader(loadingManager);',
  `const textureLoader = new THREE.TextureLoader(loadingManager);

function makePixelTexture(tex) {
    if (!tex) return tex;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
}

function loadPixelTexture(url) {
    return textureLoader.load(url, (tex) => makePixelTexture(tex));
}`
);

// Only replace textureLoader.load( that are NOT inside loadPixelTexture definition
s = s.replace(/([^=])textureLoader\.load\(/g, '$1loadPixelTexture(');
s = s.replace(
  'return loadPixelTexture(url, (tex) => makePixelTexture(tex));',
  'return textureLoader.load(url, (tex) => makePixelTexture(tex));'
);

s = s.replace(
  `    // Make textures crisp
    Object.values(sprites).forEach(tex => {
        if(tex) {
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
        }
    });`,
  `    // Make textures crisp (pixel art)
    Object.values(sprites).forEach(tex => makePixelTexture(tex));`
);

s = s.replace(
  /const tex = new THREE\.CanvasTexture\(canvas\);\r?\n    tex\.magFilter = THREE\.NearestFilter;/g,
  'const tex = new THREE.CanvasTexture(canvas);\n    makePixelTexture(tex);'
);

// 3) Camera
s = s.replace(
  `    // Use OrthographicCamera for 2D feel
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 16; // Zoom in by ~20% (was 20)
    camera = new THREE.OrthographicCamera(frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 0.1, 100);`,
  `    // Portrait cam: readable sprites
    const aspect = window.innerWidth / window.innerHeight;
    const bounds = getPortraitFrustum(aspect);
    camera = new THREE.OrthographicCamera(bounds.left, bounds.right, bounds.top, bounds.bottom, 0.1, 100);`
);

s = s.replace(
  'const playerGeo = new THREE.PlaneGeometry(1.8, 1.8); // Increased by 20%',
  'const playerGeo = new THREE.PlaneGeometry(2.1, 2.1); // Portrait readability'
);

s = s.replace(
  `    const updatePointerTarget = (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 16;
        const worldX = camera.position.x + x * (frustumSize * aspect / 2);
        const worldY = camera.position.y + y * (frustumSize / 2);
        pointerTarget.set(worldX, worldY);
    };`,
  `    const updatePointerTarget = (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        const halfW = camera ? Math.abs(camera.right) : 10;
        const halfH = camera ? Math.abs(camera.top) : 10;
        const worldX = camera.position.x + x * halfW;
        const worldY = camera.position.y + y * halfH;
        pointerTarget.set(worldX, worldY);
    };`
);

s = s.replace(
  `    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.getElementById('touch-dash-btn').classList.remove('hidden');
    }
    document.getElementById('touch-dash-btn').addEventListener('pointerdown', (e) => {`,
  `    document.getElementById('touch-dash-btn')?.classList.remove('hidden');
    document.getElementById('touch-dash-btn').addEventListener('pointerdown', (e) => {`
);

s = s.replace(
  `    const unlockAudio = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        if (ostAudio && ostAudio.paused) {
            ostAudio.play().catch(e => console.log('OST autoplay issue:', e));
        }
    };`,
  `    const unlockAudio = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        if (ostAudio && ostAudio.paused && (gameState === 'START' || gameState === 'PLAYING' || gameState === 'PAUSED')) {
            ostAudio.play().catch(e => console.log('OST unlock:', e));
        }
    };`
);

// 4) Replace updateGameScale block
const ugStart = s.indexOf("let currentResolutionSetting = 'auto';");
const ugEnd = s.indexOf('function onWindowResize()');
if (ugStart < 0 || ugEnd < 0) throw new Error('updateGameScale anchors not found');
s =
  s.slice(0, ugStart) +
  `let currentResolutionSetting = 'auto';

/** Portrait frustum: ~30% zoom vs landscape-equivalent width */
function getPortraitFrustum(aspect) {
    const landscapeHalfW = (16 * (16 / 9)) / 2;
    const halfW = landscapeHalfW * 0.7;
    const halfH = halfW / Math.max(aspect, 0.01);
    return { left: -halfW, right: halfW, top: halfH, bottom: -halfH };
}

function updateGameScale(userInitiated = false) {
    const container = document.getElementById('game-container');
    currentResolutionSetting = 'auto';
    const targetW = window.innerWidth;
    const targetH = window.innerHeight;
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    container.style.left = '0';
    container.style.top = '0';
    container.style.transform = 'none';
    const aspect = targetW / Math.max(targetH, 1);
    const bounds = getPortraitFrustum(aspect);
    if (camera) {
        camera.left = bounds.left;
        camera.right = bounds.right;
        camera.top = bounds.top;
        camera.bottom = bounds.bottom;
        camera.updateProjectionMatrix();
    }
    if (renderer) {
        renderer.setSize(targetW, targetH);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
}

` +
  s.slice(ugEnd);

// MENU -> START for title theme handlers
s = s.replace(/gameState === 'MENU'/g, "gameState === 'START'");

// 5) Music helpers before playRandomOst
if (!s.includes('function updateNowPlayingTitle')) {
  s = s.replace(
    'function playRandomOst() {',
    `function updateNowPlayingTitle(title) {
    const label = title || 'Lecture...';
    const hudTitle = document.getElementById('music-title');
    const menuTitle = document.getElementById('menu-music-title');
    if (hudTitle) hudTitle.innerText = label;
    if (menuTitle) menuTitle.innerText = label;
}

function setMusicToggleIcons(paused) {
    const icon = paused
        ? '<i data-lucide="play" style="width:14px;height:14px;"></i>'
        : '<i data-lucide="pause" style="width:14px;height:14px;"></i>';
    const menuIcon = paused
        ? '<i data-lucide="play" style="width:16px;height:16px;"></i>'
        : '<i data-lucide="pause" style="width:16px;height:16px;"></i>';
    const musicBtn = document.getElementById('music-toggle-btn');
    const menuBtn = document.getElementById('menu-music-toggle-btn');
    if (musicBtn) musicBtn.innerHTML = icon;
    if (menuBtn) menuBtn.innerHTML = menuIcon;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleOstPlayback() {
    if (ostAudio.paused) {
        ostAudio.play().catch(e => console.log(e));
        setMusicToggleIcons(false);
    } else {
        ostAudio.pause();
        setMusicToggleIcons(true);
    }
}

function playRandomOst() {`
  );
}

s = s.replace(
  `    ostAudio.play().catch(e => console.log('OST autoplay issue:', e));
    
    // Update Now Playing UI
    const npTrack = document.getElementById('music-title');
    if (npTrack) {
        npTrack.innerText = track.split('/').pop().replace('.mp3', '');
    }
}`,
  `    ostAudio.play().catch(e => console.log('OST autoplay issue:', e));
    setMusicToggleIcons(false);
    updateNowPlayingTitle(track.split('/').pop().replace('.mp3', ''));
}`
);

// Music button handlers in init — replace desktop-only music toggle
s = s.replace(
  `    const musicBtn = document.getElementById('music-toggle-btn');
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
    }`,
  `    const musicBtn = document.getElementById('music-toggle-btn');
    if (musicBtn) {
        musicBtn.addEventListener('click', (e) => {
            toggleOstPlayback();
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
    document.getElementById('menu-music-toggle-btn')?.addEventListener('click', (e) => {
        toggleOstPlayback();
        e.stopPropagation();
    });
    document.getElementById('menu-music-next-btn')?.addEventListener('click', (e) => {
        playRandomOst();
        e.stopPropagation();
    });`
);

// 6) Replace cheat section: PAUSED + speed/end/kill, no UI buttons
const cheatStart = s.indexOf('// PAUSE LÉGÈRE CHEAT CODE');
const cheatEnd = s.indexOf('// LEVEL UP KEYBOARD SHORTCUTS');
if (cheatStart < 0 || cheatEnd < 0) throw new Error('cheat anchors not found: ' + cheatStart + ' ' + cheatEnd);
s =
  s.slice(0, cheatStart) +
  `// PAUSE CHEATS (hidden — type speed / end / kill while paused)
// ==========================================
function activateCheat(name) {
    if (gameState !== 'PAUSED') return;
    if (name === 'speed') {
        gameSpeedMultiplier = (gameSpeedMultiplier === 2.0 ? 1.0 : 2.0);
        playSound(600, 'sine', 0.1);
        playSound(1200, 'sine', 0.2, 0.1);
        showBreakingNews('custom', gameSpeedMultiplier === 2.0 ? 'CHEAT: VITESSE X2' : 'CHEAT: VITESSE X1');
    } else if (name === 'end') {
        gameTime = 11 * 60 + 30;
        if (activePowers.length > 0) activePowers[0].level += 20;
        playSound(600, 'sine', 0.1);
        playSound(1200, 'sine', 0.2, 0.1);
        showBreakingNews('custom', 'CHEAT: 11m30 & POWER +20');
    } else if (name === 'kill') {
        enemies.forEach(e => { if (e.stats) e.stats.hp = 0; });
        playSound(600, 'sine', 0.1);
        playSound(1200, 'sine', 0.2, 0.1);
        showBreakingNews('custom', 'CHEAT: PURGE TOTALE');
    }
}

let pauseCheatBuffer = '';
window.addEventListener('keydown', (e) => {
    if (gameState !== 'PAUSED') return;
    const key = e.key.toLowerCase();
    if (key.length !== 1) return;
    pauseCheatBuffer += key;
    if (pauseCheatBuffer.length > 16) pauseCheatBuffer = pauseCheatBuffer.slice(-16);
    if (pauseCheatBuffer.endsWith('speed')) { pauseCheatBuffer = ''; activateCheat('speed'); }
    else if (pauseCheatBuffer.endsWith('end')) { pauseCheatBuffer = ''; activateCheat('end'); }
    else if (pauseCheatBuffer.endsWith('kill')) { pauseCheatBuffer = ''; activateCheat('kill'); }
});

// ==========================================
` +
  s.slice(cheatEnd);

// 7) Mobile DOMContentLoaded — always Android fork
s = s.replace(
  /\/\/ Mobile controls hint update\nwindow\.addEventListener\('DOMContentLoaded', \(\) => \{[\s\S]*?\}\);/,
  `// Android fork UI boot
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.desktop-only').forEach(el => el.classList.add('hidden-on-mobile'));
    const controlsHintText = document.getElementById('controls-hint-text');
    if (controlsHintText) {
        controlsHintText.innerHTML = '<i data-lucide="hand" style="width:16px;height:16px;display:inline-block;vertical-align:middle;"></i> Joystick · Dash à droite · Pause en haut';
    }
    document.getElementById('touch-dash-btn')?.classList.remove('hidden');
    loadUserSettings();
    refreshAllSaveSlots();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    tryRestoreSession();
});`
);

// 8) Append persistence helpers at end of file
const extras = `

// ==========================================
// ANDROID: USER SETTINGS + SESSION PERSISTENCE
// ==========================================
const SETTINGS_KEY = 'tortue_settings';
const SESSION_KEY = 'tortue_session_v1';

function loadUserSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return;
        const cfg = JSON.parse(raw);
        const vol = document.getElementById('volume-slider');
        const ost = document.getElementById('ost-volume-slider');
        const dmg = document.getElementById('show-damage-numbers');
        const turbo = document.getElementById('turbo-toggle');
        const ultra = document.getElementById('ultraturbo-toggle');
        if (vol && cfg.volume != null) {
            vol.value = cfg.volume;
            if (masterGainNode) masterGainNode.gain.value = cfg.volume / 100;
        }
        if (ost && cfg.ostVolume != null) {
            ost.value = cfg.ostVolume;
            ostAudio.volume = cfg.ostVolume / 100;
        }
        if (dmg && cfg.showDamage != null) dmg.checked = !!cfg.showDamage;
        if (turbo && cfg.turbo != null) turbo.checked = !!cfg.turbo;
        if (ultra && cfg.ultra != null) ultra.checked = !!cfg.ultra;
        if (turbo?.checked) gameSpeedMultiplier = 2.0;
        if (ultra?.checked) gameSpeedMultiplier = 4.0;
    } catch (e) { console.log('settings load', e); }
}

function saveUserSettings() {
    try {
        const cfg = {
            volume: parseInt(document.getElementById('volume-slider')?.value || '50', 10),
            ostVolume: parseInt(document.getElementById('ost-volume-slider')?.value || '20', 10),
            showDamage: !!document.getElementById('show-damage-numbers')?.checked,
            turbo: !!document.getElementById('turbo-toggle')?.checked,
            ultra: !!document.getElementById('ultraturbo-toggle')?.checked
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg));
    } catch (e) { console.log('settings save', e); }
}

function refreshAllSaveSlots() {
    for (let i = 0; i < 3; i++) {
        try {
            const info = document.getElementById('save-info-' + i);
            if (!info) continue;
            const data = JSON.parse(localStorage.getItem('tortue_save_' + i) || 'null');
            if (!data) { info.innerText = 'Vide'; continue; }
            const t = data.gameTime != null ? Math.floor(data.gameTime) : 0;
            const m = Math.floor(t / 60).toString().padStart(2, '0');
            const sec = Math.floor(t % 60).toString().padStart(2, '0');
            info.innerText = 'Niv ' + (data.level || '?') + ' · ' + m + ':' + sec;
        } catch (e) {
            const info = document.getElementById('save-info-' + i);
            if (info) info.innerText = 'Vide';
        }
    }
}

function snapshotSession() {
    if (!player || (gameState !== 'PLAYING' && gameState !== 'PAUSED')) return;
    try {
        const data = {
            ts: Date.now(),
            gameState: gameState === 'PAUSED' ? 'PAUSED' : 'PLAYING',
            gameTime,
            gameSpeedMultiplier,
            player: {
                hp: player.stats.hp,
                maxHp: player.stats.maxHp,
                xp: player.stats.xp,
                maxXp: player.stats.maxXp,
                level: player.stats.level,
                pickupRadius: player.stats.pickupRadius,
                x: player.position.x,
                y: player.position.y
            },
            activePowers: activePowers.map(p => ({ id: p.id, level: p.level, name: p.name, category: p.category })),
            convincedJournalists: typeof convincedJournalists !== 'undefined' ? convincedJournalists : 0,
            convincedPoliticians: typeof convincedPoliticians !== 'undefined' ? convincedPoliticians : 0,
            totalConvinced: typeof totalConvinced !== 'undefined' ? totalConvinced : 0
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch (e) { console.log('session save', e); }
}

function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
}

function tryRestoreSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data || !data.ts || Date.now() - data.ts > 6 * 60 * 60 * 1000) {
            clearSession();
            return;
        }
        // Defer until assets/player ready
        const tryApply = () => {
            if (!player || !player.stats) {
                setTimeout(tryApply, 200);
                return;
            }
            document.getElementById('start-screen')?.classList.add('hidden');
            document.getElementById('loading-screen')?.classList.add('hidden');
            gameTime = data.gameTime || 0;
            gameSpeedMultiplier = data.gameSpeedMultiplier || 1;
            player.stats.hp = data.player.hp;
            player.stats.maxHp = data.player.maxHp;
            player.stats.xp = data.player.xp;
            player.stats.maxXp = data.player.maxXp;
            player.stats.level = data.player.level;
            if (data.player.pickupRadius) player.stats.pickupRadius = data.player.pickupRadius;
            player.position.set(data.player.x || 0, data.player.y || 0, 0);
            player.visible = true;
            if (Array.isArray(data.activePowers) && data.activePowers.length) {
                activePowers.length = 0;
                data.activePowers.forEach(saved => {
                    const base = availablePowers.find(p => p.id === saved.id || p.name === saved.name);
                    if (base) activePowers.push({ ...base, level: saved.level || 1 });
                });
            }
            if (typeof convincedJournalists !== 'undefined') convincedJournalists = data.convincedJournalists || 0;
            if (typeof convincedPoliticians !== 'undefined') convincedPoliticians = data.convincedPoliticians || 0;
            if (typeof totalConvinced !== 'undefined') totalConvinced = data.totalConvinced || 0;
            const hud = document.getElementById('hud');
            if (hud) hud.style.opacity = '1';
            gameState = data.gameState === 'PAUSED' ? 'PAUSED' : 'PLAYING';
            if (gameState === 'PAUSED') {
                document.getElementById('pause-screen')?.classList.remove('hidden');
            }
            updateHUD?.();
            console.log('Session restored');
        };
        setTimeout(tryApply, 600);
    } catch (e) {
        console.log('session restore', e);
        clearSession();
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        snapshotSession();
        saveUserSettings();
    }
});
window.addEventListener('pagehide', () => {
    snapshotSession();
    saveUserSettings();
});

['volume-slider', 'ost-volume-slider', 'show-damage-numbers', 'turbo-toggle', 'ultraturbo-toggle'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', saveUserSettings);
    el.addEventListener('input', saveUserSettings);
});

// Clear mid-run session on explicit game over / menu quit paths when restarting
const _origRestart = document.getElementById('restart-btn');
_origRestart?.addEventListener('click', () => clearSession());
document.getElementById('pause-restart-btn')?.addEventListener('click', () => clearSession());
document.getElementById('quit-btn')?.addEventListener('click', () => clearSession());
`;

s = s.trimEnd() + '\n' + extras + '\n';

fs.writeFileSync(outPath, s, { encoding: 'utf8' });

const check = fs.readFileSync(outPath, 'utf8');
const report = {
  bytes: Buffer.byteLength(check, 'utf8'),
  survive: check.includes('survécu'),
  mojibake: check.includes('survÃ©cu'),
  getPortrait: check.includes('getPortraitFrustum'),
  makePixel: check.includes('makePixelTexture'),
  loadPixel: check.includes('loadPixelTexture('),
  activateCheat: check.includes("endsWith('speed')"),
  settings: check.includes('tortue_settings'),
  session: check.includes('tortue_session_v1'),
  ostLower: (check.match(/source\/ost\//g) || []).length,
  ostUpper: (check.match(/source\/OST\//g) || []).length,
  zoom: (check.match(/style\.zoom/g) || []).length,
};
console.log(JSON.stringify(report, null, 2));
if (!report.survive || report.mojibake || report.ostUpper || report.zoom) {
  console.error('VALIDATION FAILED');
  process.exit(1);
}
