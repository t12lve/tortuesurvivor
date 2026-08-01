# Tortue Survivor

Jeu survivor Android / desktop.

- **Package Android** : `com.t12lve.tortuesurvivor`
- **Version** : `0.1.1` (versionCode 2)
- **Politique de confidentialité** : https://t12lve.github.io/tortuesurvivor/privacy-policy.html

## Structure

| Dossier | Rôle |
|---------|------|
| `www/` | Fork Capacitor (HTML/JS/CSS Android) |
| `source/` | Assets du jeu |
| `android/` | Projet Gradle / Capacitor |
| `tools/` | Scripts sync / build |

`www/source/` n’est pas versionné (doublon de `source/`).  
Les secrets Android (`*.jks`, `keystore.properties`) et le dossier local `docs/` (matériel Play Store) ne sont **jamais** commités.

## Android

```bash
npm install
npm run android:sync
npm run android:open
npm run android:keystore   # local uniquement — ne pas committer
npm run android:bundle     # → TortueSurvivor-release.aab
```

## Desktop

```bash
npm start
```
