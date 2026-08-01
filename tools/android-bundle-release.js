/**
 * Build a signed Play Store AAB (release).
 * Requires android/keystore.properties + tortuesurvivor-release.jks
 */
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'android');
const propsPath = path.join(androidDir, 'keystore.properties');
const jksPath = path.join(androidDir, 'tortuesurvivor-release.jks');
const aabOut = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const aabCopy = path.join(root, 'TortueSurvivor-release.aab');

if (!fs.existsSync(propsPath) || !fs.existsSync(jksPath)) {
  console.error('[bundle] Missing keystore. Run: npm run android:keystore');
  process.exit(1);
}

console.log('[bundle] Safe-sync assets...');
execSync('node tools/android-safe-sync.js', { cwd: root, stdio: 'inherit' });

const pubSource = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'source');
const logo = path.join(pubSource, 'logo_splash.png');
const theme = path.join(pubSource, 'ost', 'Title Theme Tortue Survivor.mp3');
if (!fs.existsSync(logo) || !fs.existsSync(theme)) {
  console.error('[bundle] Asset sanity FAILED (logo / title theme missing). Abort.');
  process.exit(1);
}

console.log('[bundle] Gradle bundleRelease...');
const gradle = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
const r = spawnSync(gradle, ['bundleRelease'], { cwd: androidDir, stdio: 'inherit', shell: true });
if (r.status !== 0) {
  console.error('[bundle] Gradle failed');
  process.exit(r.status || 1);
}

if (!fs.existsSync(aabOut)) {
  console.error('[bundle] AAB not found at', aabOut);
  process.exit(1);
}

fs.copyFileSync(aabOut, aabCopy);
const sizeMb = (fs.statSync(aabCopy).size / (1024 * 1024)).toFixed(1);
console.log(`[bundle] OK → TortueSurvivor-release.aab (${sizeMb} MB)`);
console.log('[bundle] Upload this file in Play Console (test interne then production).');
