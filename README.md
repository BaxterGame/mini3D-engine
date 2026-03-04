# mini-engine v0.1c

Objectif : **même prototype**, refactorisation progressive **sans changer le feeling**.

## Lancer

- VS Code + Live Server : OK
- ou serveur local :

```bash
python -m http.server 8000
```

Puis ouvre `http://localhost:8000/`.

## Ce qui est extrait (v0.1c)

En plus de v0.1b :

- `src/render/renderer.js` : création du renderer + resize
- `src/render/cameraController.js` : caméra (Top / Iso / Perspective) + orbite 90°

Le reste (monde, entités, missions, FX…) est encore dans `src/main.js`.

## Prochaine étape (v0.1d)

- sortir `world/` :
  - `chunks` (grille infinie visuelle)
  - `collision` (occupation / bordures)
  - `walls` (build/destroy)

Objectif : continuer à isoler les systèmes **sans ajouter de features**.
