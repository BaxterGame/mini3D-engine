# Issue #16 — Réintroduire les modes du player

## Fichiers inclus
- `src/main.js`
- `src/input/actions.js`
- `src/entities/player.js`
- `src/entities/playerModes.js` *(nouveau)*
- `src/game/reset.js`
- `src/ui/hud.js`

## Ce que fait ce zip
- réintroduit un système de **modes du player** cyclable avec `X`
- conserve **Wall** comme mode de référence
- ajoute **Projectile** avec tir continu simple
- ajoute **Aqua** comme **stub** de placement de sphères bleues sur la grille
- ajoute **Vehicle** avec forme verte + vitesse augmentée
- introduit une première logique de **modes disponibles selon le contexte**
  - `mission` → profil `combat` → `wall / projectile / aqua`
  - `exploration` → profil `travel` → `wall / aqua / vehicle`

## Choix importants
- `X` ne fait plus l’orbite droite caméra : cette action reste sur `L` et le bouton UI
- le HUD affiche maintenant le **mode actif** dans le texte de statut
- le reset remet aussi à zéro les objets liés aux modes (projectiles + aqua) et repasse le player en `wall`

## Remarques
- l’effet Aqua reste volontairement minimal dans cette issue
- le tir Projectile est simple et n’ajoute pas de système d’armes complexe
- la logique contextuelle reste légère et sert surtout de **hook extensible** pour les futurs niveaux/environnements
