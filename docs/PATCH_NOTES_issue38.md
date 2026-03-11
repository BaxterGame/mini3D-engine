# Issue #38 — input mapping + camera controls

## Included files
- `index.html`
- `src/main.js`
- `src/input/keyboard.js`
- `src/input/actions.js`
- `src/render/cameraController.js`
- `src/ui/hud.js`

## What changed
- `W/A/S/D` = movement
- `Q` = cycle player modes (`wall / projectile / aqua / vehicle`)
- `E` = open / close inventory placeholder
- `ArrowUp / ArrowDown` = zoom in / out
- `ArrowLeft / ArrowRight` = rotate camera by 45°
- mouse wheel = zoom
- `Space` unchanged
- `M` unchanged
- `C` kept as legacy camera-cycle shortcut

## Notes
- Inventory is intentionally a lightweight placeholder only.
- Full inventory navigation / submenus are left for a later issue.
- Existing UI camera buttons are preserved.
- Syntax check passed locally with `node --check` on the modified JS files.
