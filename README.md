# mini-engine v0.1d

Objectif : **même prototype**, refactorisation progressive **sans changer le feeling**.

## Lancer

- VS Code + Live Server : OK
- ou serveur local :

```bash
python -m http.server 8000
```

Puis ouvre `http://localhost:8000/`.

## Ce qui est extrait (v0.1d)

En plus de v0.1c :

- `src/world/collision.js` : bordure + collisions (ennemis / murs) + helpers de “stress”
- `src/world/chunks.js` : grille infinie visuelle (chunks)
- `src/world/walls.js` : construction/destruction des murs joueurs (toggle) + anti-toggle sur la même case

Le reste (player, ennemis, pièces, FX, boucle de jeu…) est encore dans `src/main.js`.

## Prochaine étape (v0.1e)

- sortir `entities/` :
  - `player`
  - `enemies`
  - `coins`
- sortir `fx/particles`

Objectif : continuer à isoler les systèmes **sans ajouter de features**.
