/**
 * Create a Play Store release keystore + android/keystore.properties
 *
 * Usage:
 *   node tools/create-release-keystore.js
 *   set STORE_PASSWORD / KEY_PASSWORD env vars to avoid prompts (optional)
 *
 * IMPORTANT: back up the .jks + passwords OUTSIDE Dropbox. Losing them
 * means you can never update the same Play Store listing.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const readline = require('readline');

const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'android');
const jksPath = path.join(androidDir, 'tortuesurvivor-release.jks');
const propsPath = path.join(androidDir, 'keystore.properties');
const alias = 'tortuesurvivor';

function findKeytool() {
  const fromPath = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['keytool'], { encoding: 'utf8' });
  if (fromPath.status === 0) {
    const line = fromPath.stdout.split(/\r?\n/).map(s => s.trim()).find(Boolean);
    if (line) return line;
  }
  const candidates = [
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.12.8-hotspot\\bin\\keytool.exe',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.8-hotspot\\bin\\keytool.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  if (fs.existsSync(jksPath) || fs.existsSync(propsPath)) {
    console.error('[keystore] Already exists. Delete android/tortuesurvivor-release.jks and keystore.properties first if you really want to recreate.');
    console.error('[keystore] WARNING: recreating breaks Play Store updates for the same app id.');
    process.exit(1);
  }

  const keytool = findKeytool();
  if (!keytool) {
    console.error('[keystore] keytool not found. Install a JDK and retry.');
    process.exit(1);
  }

  let storePassword = process.env.STORE_PASSWORD || '';
  let keyPassword = process.env.KEY_PASSWORD || '';
  if (!storePassword) storePassword = await ask('Store password (min 6 chars): ');
  if (!keyPassword) keyPassword = await ask('Key password (min 6 chars, can match store): ');
  if (!storePassword || storePassword.length < 6 || !keyPassword || keyPassword.length < 6) {
    console.error('[keystore] Passwords must be at least 6 characters.');
    process.exit(1);
  }

  const dname = 'CN=Tortue Survivor, OU=Mobile, O=t12lve, L=Paris, ST=IDF, C=FR';
  console.log('[keystore] Generating', jksPath);
  execFileSync(keytool, [
    '-genkeypair',
    '-v',
    '-keystore', jksPath,
    '-alias', alias,
    '-keyalg', 'RSA',
    '-keysize', '2048',
    '-validity', '10000',
    '-storepass', storePassword,
    '-keypass', keyPassword,
    '-dname', dname,
  ], { stdio: 'inherit' });

  const props = [
    `storePassword=${storePassword}`,
    `keyPassword=${keyPassword}`,
    `keyAlias=${alias}`,
    `storeFile=tortuesurvivor-release.jks`,
    '',
  ].join('\n');
  fs.writeFileSync(propsPath, props, 'utf8');

  console.log('');
  console.log('[keystore] OK');
  console.log('  -', jksPath);
  console.log('  -', propsPath);
  console.log('');
  console.log('BACKUP NOW: copy the .jks + passwords to a password manager / offline drive.');
  console.log('Do NOT commit these files. Do NOT rely on Dropbox alone.');
  console.log('Next: npm run android:bundle');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
