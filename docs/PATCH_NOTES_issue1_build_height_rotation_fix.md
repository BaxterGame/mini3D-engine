# Patch notes — Issue 1 build vertical + rotation (ajustement)

## Corrigé
- Retour à la logique de construction/empilement précédente
- La hauteur manuelle ne remplace plus l'empilement : elle sert de plancher vertical persistant
- Le build continu avec `Space` hold refonctionne
- `Shift + ↑ / ↓` pilote maintenant la hauteur verticale du cercle sans casser le zoom caméra
- `Shift + ← / →` fait tourner l'asset sélectionné par pas de 45°

## Ajout visuel
- Petit repère bleu sur le cercle pour les assets custom orientables

## Note
- La détection "non symétrique" n'est pas automatique ici : le repère est affiché pour les assets custom sélectionnés, ce qui couvre le besoin pratique sans heuristique fragile.


## Polish final — repère directionnel + tilt caché
- repère bleu sorti du groupe du player pour ne plus hériter de sa rotation visuelle
- repère visible uniquement en mode build, masqué en destruction
- repère toujours calé sur la rotation logique par pas de 45°
- option cachée : double-appui rapide sur la même rotation (`Shift + ←` ou `Shift + →`) = cycle de tilt X par pas de 90° pour les assets customs
