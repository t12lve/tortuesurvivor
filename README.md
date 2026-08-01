# Tortue Survivor

Jeu survivor Android / desktop.

- **Package Android** : `com.t12lve.TortueSurvivor`
- **Politique de confidentialité** : https://t12lve.github.io/tortuesurvivor/privacy-policy.html

## Structure

| Dossier | Rôle |
|---------|------|
| `www/` | Fork Capacitor (HTML/JS/CSS Android) |
| `source/` | Assets du jeu |
| `android/` | Projet Gradle / Capacitor |
| `tools/` | Scripts sync / build |

`www/source/` n’est pas versionné (doublon de `source/`).  
Les secrets Android (`*.jks`, `keystore.properties`) ne sont **jamais** commités.

## Android

```bash
npm install
npm run android:sync
npm run android:open
npm run android:keystore   # local uniquement — ne pas committer
npm run android:bundle
```

## Desktop

```bash
npm start
```
