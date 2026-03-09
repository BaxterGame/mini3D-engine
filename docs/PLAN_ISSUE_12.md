# Issue #12 — Affiner le feeling caméra et simplifier la navigation

## Portée du zip
Ce zip applique une passe ciblée sur la caméra et la navigation, sans refonte générale du moteur :

- cycle caméra unique sur `C`
- suppression fonctionnelle de l’ancien split `V` / `C`
- masquage du bouton UI de projection devenu redondant
- amélioration du feeling 3D via un déplacement relatif à la caméra
- conservation de l’orbite `J / L` pour les vues 3D

## Fichiers fournis
- `src/main.js`
- `src/render/cameraController.js`
- `src/input/actions.js`
- `src/entities/player.js`
- `src/ui/hud.js`

## Choix principaux
### 1. Cycle caméra unifié
La caméra suit maintenant ce cycle sur `C` :
1. `top`
2. `iso`
3. `perspective`
4. retour à `top`

### 2. Navigation 3D plus lisible
Le déplacement du player n’est plus seulement en axes monde quand la caméra est en 3D.
Il est reprojeté selon la base `forward/right` de la caméra, ce qui garde `droite/gauche` plus cohérents à l’écran.

### 3. UI simplifiée
- bouton principal renommé conceptuellement en **Cycle caméra (C)**
- bouton `toggleProjectionBtn` masqué
- texte d’aide clavier mis à jour dans le HUD

## Point important
Je n’ai pas pu tester l’exécution complète ici.
Le code a été vérifié en **syntaxe JS**, mais il faut valider en local avec Live Server :

- cycle `C`
- lisibilité du déplacement en iso
- lisibilité du déplacement en perspective
- orbite `J / L`
- absence de régression sur top view
