# Tortue Survivor

Survivor-like satirique en portrait : tu incarnes une tortue et tu dois tenir **12 minutes** face à journalistes, politiciens et milliardaires — en les **convainquant**, pas en les détruisant.

| | |
|---|---|
| **Plateformes** | Android (Capacitor) · Desktop Windows (Electron) |
| **Package Play Store** | `com.t12lve.tortuesurvivor` |
| **Version Android** | `0.1.1` (versionCode `2`) — alpha |
| **Confidentialité** | [Politique (GitHub Pages)](https://t12lve.github.io/tortuesurvivor/privacy-policy.html) |
| **Dépôt** | [github.com/t12lve/tortuesurvivor](https://github.com/t12lve/tortuesurvivor) |

> Alpha publique : bugs et équilibrages encore possibles. Pas de pubs, pas de compte obligatoire. Sauvegardes locales sur l’appareil.

---

## Contenu du jeu

- Partie solo ~12 minutes, progression par niveaux / pouvoirs
- Attaques et bonus « politiques » (SMIC, ISF climatique, 6ᵉ République, etc.)
- Contrôles Android : joystick virtuel, dash, pause
- OST originale, sprites pixel, écran de victoire animé
- Satire politique / médiatique — déconseillé aux très jeunes enfants

---

## Architecture du dépôt

Deux surfaces de jeu distinctes (ne pas les mélanger) :

| Chemin | Rôle |
|--------|------|
| `www/` | **Fork Android** — HTML / JS / CSS Capacitor (`webDir`) |
| `index.html`, `main.js`, `style.css`, `electron_main.js` | **Desktop Electron** |
| `source/` | Assets canoniques (sprites, OST, vidéos) |
| `android/` | Projet Gradle / Capacitor |
| `tools/` | Scripts : sync Dropbox-safe, keystore, AAB, icônes |
| `privacy-policy.html` | Page servie par GitHub Pages |

**Non versionné (volontairement)** :

- `www/source/` — doublon de `source/` (recréé au sync)
- `docs/` — textes / graphiques Play Store (local uniquement)
- `*.jks`, `keystore.properties` — secrets de signature
- `node_modules/`, builds Gradle, APK / AAB, PSD, junk éditeur

Sur Dropbox, préférer `npm run android:sync` / `android:bundle` plutôt que `npx cap sync` (risque `EBUSY` qui vide les assets).

---

## Prérequis

- Node.js + npm  
- JDK 17+ (Android)  
- Android Studio / SDK (pour ouvrir le projet ou builder)  
- Windows recommandé pour les scripts Gradle / robocopy du sync

```bash
npm install
```

---

## Android

```bash
# Copier www + source → assets Android (sans détruire le dossier source)
npm run android:sync

# Ouvrir dans Android Studio
npm run android:open

# APK debug → TortueSurvivor.apk
npm run android:build

# Keystore release (une seule fois, hors git — sauvegarder hors Dropbox)
npm run android:keystore

# AAB signé Play Store → TortueSurvivor-release.aab
npm run android:bundle
```

| Identifiant | Valeur |
|-------------|--------|
| applicationId | `com.t12lve.tortuesurvivor` |
| versionName | `0.1.1` |
| versionCode | `2` |

Chaque upload Play Store exige `versionCode` incrémenté. Toujours le **même** keystore que la première publication.

---

## Desktop (Electron)

```bash
npm start
```

Builds Windows (packager / installer) : voir scripts `build*` dans `package.json`.

---

## Play Store (rappel)

Matériel local (non commit) : `docs/play-store/listing-fr.md`, graphiques, guide PDF.  
URL privacy à coller dans la Console :

https://t12lve.github.io/tortuesurvivor/privacy-policy.html

---

## Licence / contact

Projet personnel / alpha. Retours : [Issues GitHub](https://github.com/t12lve/tortuesurvivor/issues).
