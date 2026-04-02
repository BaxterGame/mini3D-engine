# Patch notes — camera polish final

Base utilisée : version de `cameraController.js` fournie par l'utilisateur, qui rétablit la bonne logique de transitions et d'angles.

## Ajustements
- suppression du mode `fps` du cycle caméra sur la touche `C`
- conservation de l'accès au `fps` uniquement via le dernier cran de zoom en perspective
- correction du petit glitch au retour vers la vue `top`
- fin de transition avec snap propre sur la pose finale pour éviter un micro-réajustement nerveux
- changement de famille de projection (ortho / perspective) repoussé à la fin de la transition pour éviter un swap visuel au milieu du mouvement

## Intention
Garder exactement la logique de vues validée par l'utilisateur, sans re-casser les angles 90° / 45° ni le comportement du zoom vers le FPS.
