# mini-engine v0.1a (base refactor)

## Lancer le prototype
Ce projet utilise un script `type="module"`. Ouvre-le via un serveur local :

### Option A (Python)
```bash
cd mini-engine-v0.1a
python -m http.server 8000
```
Puis ouvre `http://localhost:8000/` dans ton navigateur.

### Option B (VS Code)
Installe l’extension "Live Server" et lance `index.html`.

## Ce que contient v0.1a
- `index.html` : UI/CSS identiques à la version v4.
- `src/main.js` : le code original déplacé hors du HTML (comportement identique).

## Prochaine étape (v0.1b)
Extraire sans changer le comportement :
1) `src/config.js` (constantes)
2) `src/state.js` (état global)
3) `src/utils/*` (math + grid key)
4) `src/input/keyboard.js`
5) `src/ui/hud.js`
6) `src/render/*` (renderer + camera controller)
7) `src/world/*` (chunks + collision + walls)
8) `src/entities/*` (player + enemies + coins)
9) `src/fx/*`
10) `src/game/*` (reset + loop)

On garde une règle : **aucune feature** pendant la refacto — uniquement découpage.
