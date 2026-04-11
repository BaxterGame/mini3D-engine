# Patch notes — preview polish / stack navigation fix

## Fichiers touchés
- src/main.js
- src/entities/player.js
- src/world/walls.js

## Corrections
- restauration de la logique de sélection build en pile + dans le vide
- le halo/cercle bleu remonte maintenant sur la prochaine brique par défaut quand il y a une pile
- la navigation verticale en build fonctionne à nouveau après la première pose
- la preview asset reste liée au cube (centre du volume), le halo gère seul les exceptions verticales
- la rotation Y continue en 45°
- à 180° en Y, `Shift + ←` fait tourner sur X par pas de 90° et `Shift + →` sur Z par pas de 90°
- les rotations X/Z sont réinjectées dans la preview et dans le placement
