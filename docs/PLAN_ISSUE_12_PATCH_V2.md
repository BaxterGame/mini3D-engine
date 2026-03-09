# Patch issue #12 — ajustements caméra/navigation

Contenu du patch :
- `src/render/cameraController.js`
- `src/entities/player.js`
- `src/main.js`
- `src/input/actions.js`
- `src/ui/hud.js`

## Ce que corrige ce patch
- cycle caméra conservé sur `C`
- orbite `J / L` passée en incréments de `45°`
- vue isométrique plus souple pour construire en diagonale
- vue perspective stabilisée : la caméra ne tourne plus selon la dernière direction du player
- déplacement 3D toujours reprojeté selon l’écran
- restauration des assets du player (`wall`, `projectile`, `aqua`, `vehicle`) via `assetLibrary`

## À tester
- `C` : top -> iso -> perspective -> top
- `J / L` : rotation 45° en vue iso et perspective
- en iso : lecture plus facile des diagonales
- en perspective : avancer tout droit ne doit plus faire tourner la caméra en rond
- les meshes du player reviennent bien pour `wall`, `projectile`, `aqua`, `vehicle`
- projectiles et sphères aqua restent inchangés
