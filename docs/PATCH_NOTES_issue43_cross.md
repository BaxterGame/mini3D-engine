# Patch notes — issue #43 (version centrée / menu en croix)

Objectif du patch : rapprocher l'inventaire du concept fourni.

Ce patch fait :
- recentrage complet du menu à l'écran
- remplacement du panneau latéral par une structure "croix"
- rail horizontal pour les catégories
- colonne verticale pour les variantes / sous-types
- navigation cohérente :
  - gauche / droite = catégories
  - haut / bas = variantes
- boutons souris pour flèches horizontales et verticales
- conservation du flow existant avec `E` pour ouvrir / fermer

Choix assumés pour cette version :
- ce n'est pas encore un vrai carousel infini visuel
- en revanche, la navigation boucle déjà logiquement sur les catégories et les variantes
- la structure est préparée pour évoluer ensuite vers un scroll/carousel plus poussé

Fichiers modifiés :
- index.html
- src/ui/inventoryMenu.js
