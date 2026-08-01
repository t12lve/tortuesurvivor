/**
 * Safe Android asset sync for Dropbox-locked folders.
 * Capacitor `cap sync` tries to rmdir public/source and often fails with EBUSY,
 * leaving an EMPTY source/ in the APK (broken logo, silence, missing sprites).
 *
 * This script copies without deleting the destination tree first.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
const pub = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public');
const rootSource = path.join(root, 'source');
const wwwSource = path.join(www, 'source');
const pubSource = path.join(pub, 'source');
// Prefer www/source if present locally; otherwise canonical /source (GitHub omits the duplicate).
const assetSource = fs.existsSync(wwwSource) ? wwwSource : rootSource;

function mustExist(p, label) {
  if (!fs.existsSync(p)) {
    console.error(`[android-safe-sync] MISSING ${label}: ${p}`);
    process.exit(1);
  }
}

mustExist(www, 'www');
mustExist(assetSource, 'source assets');
fs.mkdirSync(pub, { recursive: true });

for (const f of ['index.html', 'main.js', 'style.css']) {
  fs.copyFileSync(path.join(www, f), path.join(pub, f));
  console.log(`[android-safe-sync] copied ${f}`);
}

// Robocopy /E mirrors without removing dest first when using /XO?
// /E copies subdirs including empty; /IS /IT ensure overwrites.
const cmd = `robocopy "${assetSource}" "${pubSource}" /E /IS /IT /NFL /NDL /NJH /NJS /nc /ns /np`;
const code = (() => {
  try {
    execSync(cmd, { stdio: 'inherit', windowsHide: true });
    return 0;
  } catch (e) {
    // robocopy exit codes 0-7 are success
    return typeof e.status === 'number' ? e.status : 1;
  }
})();
if (code >= 8) {
  console.error(`[android-safe-sync] robocopy failed code=${code}`);
  process.exit(1);
}

const count = (dir) => {
  let n = 0;
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else n++;
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return n;
};

const n = count(pubSource);
const logo = fs.existsSync(path.join(pubSource, 'logo_splash.png'));
const theme = fs.existsSync(path.join(pubSource, 'ost', 'Title Theme Tortue Survivor.mp3'));
console.log(`[android-safe-sync] public/source files=${n} logo=${logo} titleTheme=${theme}`);
if (n < 10 || !logo || !theme) {
  console.error('[android-safe-sync] Asset sanity check FAILED — aborting before APK build');
  process.exit(1);
}
console.log('[android-safe-sync] OK');
