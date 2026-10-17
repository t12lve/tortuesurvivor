# Tortue Survivor

Survivor-like satirique : vous incarnez une tortue et devez tenir **12 minutes** face aux journalistes, politiciens et milliardaires — en les **convainquant**, pas en les détruisant !

Cette application a été réécrite en tant qu'application **React + TypeScript + Vite** moderne avec rendu 2D/3D propulsé par Three.js.

## Fonctionnalités

- **Gameplay survie complet (12 minutes)** : Vagues d'ennemis dynamiques, mise à l'échelle de la difficulté dans le temps.
- **Arsenal satirique et pouvoirs politiques** :
  - *Le SMIC à 1700€ net* : Rafale de billets verts à haute vitesse
  - *Le Service Public de l'Eau* : Jet perçant traversant les foules
  - *La Règle Verte* : Aura de contact tranchante
  - *Retraite à 60 ans* : Zone de ralentissement temporel
  - *Garantie d'Autonomie* : Orbes dorés orbitaux protecteurs
  - *Blocage des Prix* : Onde de choc givrante
  - *ISF Climatique* : Éclair fiscal ciblé
  - *Cantine Bio & Locale* : Soin passif régulier
  - *Révoquer les Élus* : Météore de destitution sur l'adversaire le plus résistant
  - *Référendum d'Autodétermination* : Zone circulaire de conversion pacifique des ennemis
  - *Le Rush Kranidos* : Charge ultra-rapide invincible laissant du feu
  - *Taxe Zucman & Allocation d'Autonomie* : Réduction d'esquive des milliardaires et bonus XP
- **Ennemis & Boss** :
  - Journalistes, Politiciens, Milliardaires (avec 25% d'évasion fiscale)
  - Mini-boss Léa & Raph traversant l'écran
  - Mega Glucksmann & Mega Tondelier déclenchés par les combos
  - Mega Boss final : Marine Le Pen à 12:00 avec flamme tricolore et attaques de bottes
- **Alliés de la lutte (Ralliement)** :
  - Sandrine Rousseau, Rima Hassan, Philippe Poutou et François Ruffin
- **Système de sauvegardes** : 3 slots locaux via `localStorage`
- **Options complètes** : Réglage du volume général, volume OST, échelle d'interface, affichage des nombres de dégâts, plein écran, et configuration personnalisée des touches
- **Bande-son complète (OST)** : Sélection de 14 musiques rétro / chiptune / satire avec lecteur intégré
- **Modes Bonus** : Mode Turbo (x2) et Ultra Turbo (x4) déblocables après victoire, et mode Prestige

## Développement

Le projet tourne avec Vite sur le port 3000 :

```bash
npm install
npm run dev
```

Pour compiler l'application en production :

```bash
npm run build
```
