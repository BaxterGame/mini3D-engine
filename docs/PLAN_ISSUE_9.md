# PLAN — Issue #9 — première librairie d'assets légers

## Intention
Cette livraison ne touche pas au runtime du moteur.
Elle prépare une **base d'assets légère et cohérente** à intégrer ensuite, sans casser le prototype.

## Choix
- ajout d'un dossier `assets/`
- séparation `meshes/` / `textures/`
- convention de nommage simple et stable
- assets de test réels, très légers, alignés avec le gameplay actuel

## Fichiers livrés
- `assets/README.md`
- `assets/manifest.json`
- `assets/meshes/mesh_wall_block_lp_v001.obj`
- `assets/meshes/mesh_projectile_shard_lp_v001.obj`
- `assets/meshes/mesh_aqua_orb_lp_v001.obj`
- `assets/meshes/mesh_vehicle_kart_lp_v001.obj`
- `assets/meshes/mesh_coin_token_lp_v001.obj`
- `assets/textures/tex_wall_block_256_v001.png`
- `assets/textures/tex_projectile_red_256_v001.png`
- `assets/textures/tex_aqua_bubble_256_v001.png`
- `assets/textures/tex_vehicle_green_256_v001.png`
- `assets/textures/tex_coin_gold_256_v001.png`

## Pourquoi cette portée
L'issue demande surtout :
- une arborescence claire
- des contraintes de légèreté
- une convention de nommage
- 3 à 5 assets tests identifiés

Ici, les assets tests sont non seulement identifiés, mais **déjà présents** sous une forme minimale.
Ça reste dans le périmètre tout en rendant la base plus concrète.

## Vérification rapide
- arborescence claire : oui
- contraintes de légèreté définies : oui (`assets/README.md`, `assets/manifest.json`)
- convention de nommage définie : oui
- premiers assets de test listés : oui
- premiers assets de test fournis : oui

## Intégration conseillée
1. Copier le dossier `assets/` à la racine du repo
2. Vérifier dans GitHub Desktop que seuls ces fichiers apparaissent
3. Commit conseillé :
   `assets - add lightweight starter library`
4. PR :
   `Closes #9`
