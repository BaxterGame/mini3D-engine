# AI_CONTEXT — mini3D-engine

Ce fichier sert de **contexte minimal** pour reprendre le projet rapidement (nouveau chat ou après une pause).
Objectif : éviter les longues “fenêtres de contexte” et repartir vite, proprement.

---

## Projet (résumé)

**mini3D-engine** est un prototype expérimental de **micro-moteur web** (HTML/CSS/JS + Three.js/WebGL) visant une expérience
**open world minimaliste** avec une intention **hybride** (formes de jeu variées : 2D, 3D iso, perspective, FPS, etc.).
Priorité actuelle : **navigation + caméra + UI/UX**. Le gameplay sert surtout de support à l’expérience.

---

## Règles de développement

- `main` = **stable** (toujours jouable)
- 1 tâche = **1 branche** = **1 PR** = (si possible) 1 issue
- **Créer la branche AVANT** de modifier des fichiers
- Toujours tester via **VS Code + Live Server**
- PR vers `main` avec `Closes #X` (fermeture auto de l’issue)
- Garder le projet **léger** : petits meshes low poly + textures légères (ex. 256×256), FX simples, audio simple

---

## Pipeline (outils)

- VS Code (édition)
- Live Server (test rapide)
- GitHub Desktop (branches / commit / push / PR)
- GitHub web (issues, board, PR, merge)

Document de référence : `docs/PIPELINE.md`

---

## Conventions

### Branches
- `refactor/...` : découpage / architecture / nettoyage
- `feature/...` : nouvelle fonction
- `fix/...` : correction
- `docs/...` : documentation
- `wip/...` : sauvegarde temporaire

### Commits
Format court et clair :
- `v0.1f - extract FX (particles)`
- `docs - add pipeline guide`

---

## Architecture (haut niveau)

- `src/config.js` : constantes
- `src/state.js` : état global minimal
- `src/input/` : gestion clavier
- `src/ui/` : HUD et UI HTML
- `src/render/` : renderer + caméra
- `src/world/` : chunks, collision, walls
- `src/entities/` : player, enemies, coins
- `src/fx/` : particules, FX
- `src/game/` : boucle de jeu, reset, mission logic (à extraire)

---

## État actuel (refactor V0.1)

Déjà fait (mergé sur `main`) :
- V0.1a : code sorti du HTML
- V0.1b : config/state/utils/input/hud extraits
- V0.1c : renderer + camera controller extraits
- V0.1d : world (chunks/collision/walls) extraits
- V0.1e : entities (player/enemies/coins) extraits
- V0.1f : FX (particles) extraits

À faire ensuite :
- V0.1g : extraire `game loop` + `reset` dans `src/game/` (refactor only, comportement identique)

---

## Gameplay actuel (résumé)

Mission de base : obtenir 3 pièces.
Principe : construire/détruire des murs sur la case du joueur (toggle), piéger des ennemis.
Contraintes importantes :
- murs joueur permanents (toggle build/destroy)
- joueur ne se bloque pas sur ses propres murs (bordure bloquante)
- ennemis errent aléatoirement (pas attirés par le joueur)
- transformation en or : seulement si piégeage impliquant au moins un mur joueur (pas juste la bordure)
- monde : grille visuelle générative + zone mission 100×100 bordée

---

## Comment repartir dans un nouveau chat (template)

Copier-coller ce bloc + préciser la tâche du jour :

- Repo : mini3D-engine (micro-moteur Three.js/WebGL)
- Pipeline : GitHub Desktop + PR + `main` stable
- Contexte : voir `docs/AI_CONTEXT.md`
- Tâche : (ex) “V0.1g : extraire game loop + reset — refactor only”
- Sortie attendue : “zip prêt” ou “plan fichier par fichier”

---

## Notes / vigilance

- Éviter de committer sur `main`
- Si des changements apparaissent sur `main` par erreur : créer une branche `wip/...` et commit dessus, puis revenir à `main` propre
- GitHub Desktop peut parfois afficher des erreurs “fork/resource temporarily unavailable” : contourner via PowerShell si nécessaire pour `stash pop`, `commit`, `push`