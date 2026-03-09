# Issue #25 — Intégrer les assets dans le moteur

## Fichiers inclus
- `src/main.js`
- `src/entities/player.js`
- `src/entities/playerModes.js`
- `src/assets/library.js` *(nouveau)*

## Ce que fait ce zip
- ajoute une première couche de chargement d'assets depuis `assets/manifest.json`
- charge une sélection d'assets tests (`wall-block`, `projectile-shard`, `aqua-orb`, `vehicle-kart`)
- relie ces assets aux formes du player selon le mode actif
- remplace aussi les placeholders géométriques du tir Projectile et des sphères Aqua quand les fichiers sont présents
- garde un fallback automatique vers les géométries procédurales si un asset ou une texture manque

## Choix importants
- intégration volontairement légère : pas de loader généraliste complet, pas de refonte du pipeline Three.js
- pas de modification des systèmes `coins` / `walls` pour limiter le risque de casser le prototype
- chargement centralisé dans `src/assets/library.js`
- démarrage du jeu conservé, avec init `async` pour charger les assets avant de créer les systèmes qui en dépendent

## Ce qui sera visible en jeu
- mode `Wall` : mesh asset au lieu du placeholder pur
- mode `Projectile` : mesh asset + tirs asset
- mode `Aqua` : mesh asset + sphères posées sur la grille via asset
- mode `Vehicle` : mesh asset

## Limites assumées
- les bordures et murs du monde restent sur le système existant
- les pickups / coins restent sur leur visuel actuel
- l'OBJ parser inclus vise une première passe légère (suffisante pour les meshes low poly de test)
