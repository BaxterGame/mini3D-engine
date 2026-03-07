# Issue #7 — Clarifier la logique d’input et d’actions contextuelles

## Intention
Refactor only : clarifier la couche input sans casser le prototype.

## Changements inclus

### 1) `src/input/keyboard.js`
- remplace le simple `keys[key] = boolean` par trois états explicites :
  - `down` : touche maintenue
  - `pressed` : touche pressée sur le frame courant
  - `released` : touche relâchée sur le frame courant
- normalise `Space` vers `space`
- ajoute un `blur` handler pour éviter les touches “bloquées” si la fenêtre perd le focus

### 2) `src/input/actions.js` *(nouveau)*
- introduit une couche sémantique au-dessus du clavier brut
- sépare clairement :
  - mouvement continu
  - sprint maintenu
  - action contextuelle mur (`space` maintenu + relâche)
  - actions uniques (`r`, `v`, `c`, `m`, `j`, `l`/`x`)

### 3) `src/entities/player.js`
- le déplacement ne lit plus directement le clavier brut si `actions` est fourni
- fallback conservé sur l’ancien `keys` pour limiter le risque de casse

### 4) `src/main.js`
- supprime la logique `prevKeys` bricolée dans le flux principal
- remplace les “edge keys” par des actions sémantiques consommées
- isole :
  - actions uniques
  - actions contextuelles
  - fin de frame input (`input.endFrame()`)

## Effet recherché
- rotation caméra : une action nette par pression
- changement de vue / projection / mode : une bascule par pression
- mur : action contextuelle lisible (`maintien` + `relâche`)
- base plus stable pour de futurs contrôles hybrides

## Fichiers à copier dans le repo
- `src/main.js`
- `src/input/keyboard.js`
- `src/input/actions.js`
- `src/entities/player.js`

## Vérifications manuelles conseillées
1. déplacement clavier inchangé
2. sprint inchangé
3. espace : poser/détruire un mur sans double-trigger parasite
4. `v`, `c`, `m` : une seule bascule par pression
5. `j`, `l`, `x` : une seule rotation de 90° par pression
6. alt-tab / perte de focus : pas de touche bloquée
