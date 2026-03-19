# Assets — librairie légère (première base)

Cette arborescence pose une première base d'assets **légers** pour le mini moteur.

## Objectif
Sortir du placeholder pur sans alourdir le projet, avec :
- des meshes low poly très simples
- des textures légères en `256x256`
- un style cohérent, lisible et économique

## Structure
- `meshes/` : meshes de test au format `.obj`
- `textures/` : textures atlas 2048px 
- `manifest.json` : liste des assets, conventions et contraintes

## Conventions de nommage
Format recommandé :
- mesh : `mesh_<famille>_<nom>_<niveau>_v001.obj`
- texture : `tex_<famille>_<nom>_<taille>_v001.png`

Exemples :
- `mesh_wall_block_lp_v001.obj`
- `tex_wall_block_256_v001.png`

## Contraintes de légèreté
- Meshes : low poly, lecture de silhouette prioritaire
- Triangle budget cible : **8 à 64 tris**
- Budget toléré pour tests : **jusqu'à 128 tris**
- Pas de normal map / roughness / metalness à ce stade
- Préférer des surfaces lisibles, contrastées, peu détaillées

## Contraintes textures

- texture simple par asset : cible par défaut `256x256`
- atlas partagée : autorisée jusqu’à `2048x2048` si elle mutualise plusieurs assets
- privilégier les textures légères, lisibles et réutilisables
- éviter la multiplication de petites textures isolées si une atlas cohérente suffit
- format recommandé :
  - `PNG` pour les textures stylisées, nettes, avec alpha ou motifs graphiques
  - `JPG` à réserver aux cas sans alpha et sans besoin de contours propres

## Direction visuelle
- formes simples, lisibles à distance
- couleurs franches par famille d'usage
- shading économique, peu de micro-détails
- style compatible avec un prototype Three.js rapide à charger

## Assets tests inclus
- wall block
- projectile shard
- aqua orb
- vehicle kart
- coin token

Ces assets servent de **première base de test**, pas de bibliothèque finale.
