# Pipeline de production — mini3D-engine

## Antisèche (workflow)

1) GitHub Desktop → branch = `main` → Fetch → Pull si proposé  
2) Branch → New branch (`refactor/...` / `feature/...` / `fix/...`)  
3) Faire les modifs (ou copier les fichiers du zip) dans le repo cloné  
4) Tester (VS Code + Live Server)  
5) GitHub Desktop → Changes : vérifier la liste (pas de surprise)  
6) Summary commit court (ex: `v0.1f - extract FX (particles)`) → Commit  
7) Push origin / Publish branch  
8) Create Pull Request → description : `Closes #X`  
9) Merge PR sur GitHub → (optionnel) Delete branch  
10) Retour sur `main` → Fetch → Pull → “No local changes”

---

## Objectif

Ce document décrit le workflow minimal et fiable pour développer le projet sans se perdre :
- GitHub Desktop (branches, commits, push, PR)
- GitHub (issues, board, PR, merge)
- VS Code + Live Server (test rapide)
- règles simples pour garder `main` stable

---

## Outils

- **VS Code** : édition du code
- **Live Server** (extension VS Code) : test local rapide
- **GitHub Desktop** : gestion Git simple (branches/commits/push/PR)
- **GitHub (web)** : issues, board, PR, merge, historique

---

## Règles de base

- **`main` = stable** (toujours jouable)
- **1 tâche = 1 branche = 1 PR**
- **Ne jamais commit directement sur `main`** (sauf doc trivial… et encore, idéalement via PR)
- **Créer la branche AVANT de modifier les fichiers** (évite stash/erreurs)
- Garder les commits **courts et clairs**

---

## Workflow standard (refactor / feature / fix)

### 0) Pré-requis

1. Ouvrir GitHub Desktop
2. Vérifier en haut :
   - `Current branch = main`
   - “No local changes”
3. Cliquer **Fetch origin**
4. Si GitHub Desktop propose **Pull origin**, cliquer **Pull origin**

---

### 1) Créer une branche

GitHub Desktop :
- **Branch → New branch…**
- Nom conseillé :
  - `refactor/v0.1g`
  - `feature/camera-zoom`
  - `fix/wall-toggle`
- **Create branch**

---

### 2) Modifier le code

Dans VS Code :
- faire les changements (ou copier des fichiers depuis un zip)
- ne pas toucher au dossier `.git`

#### Si on intègre un zip (ex : v0.1f)

1. Dézipper dans un dossier temporaire
2. Copier uniquement les fichiers indiqués (ex : `src/main.js`, `src/fx/particles.js`)
3. Coller/écraser dans le repo cloné
4. Tester

---

### 3) Tester (Live Server)

Dans VS Code :
- clic droit `index.html` → **Open with Live Server**
- vérifier rapidement :
  - lancement
  - déplacement
  - caméra
  - murs
  - ennemis / coins
  - mode exploration/mission

---

### 4) Commit

GitHub Desktop → onglet **Changes** :
- Vérifier la liste des fichiers modifiés (pas de surprise)
- Remplir **Summary (required)** avec une phrase courte  
  Exemple : `v0.1f - extract FX (particles)`
- **Commit to <branch>**

> La **Description** est optionnelle.  
> Si besoin : “Refactor only. No behavior change.”

---

### 5) Push

GitHub Desktop :
- **Push origin** (ou “Publish branch” si première fois)

---

### 6) Pull Request (PR)

GitHub Desktop :
- **Create Pull Request**

Sur GitHub (page PR) :
- base = `main`
- compare = ta branche
- Dans la description, ajouter :  
  - `Closes #X` (ferme l’issue automatiquement au merge)

---

### 7) Review → Merge

Sur GitHub :
- vérifier rapidement les fichiers dans la PR
- **Merge pull request**
- (optionnel) **Delete branch**

Board :
- déplacer la carte : **In Progress → Review → Done**

---

### 8) Retour propre sur `main`

GitHub Desktop :
- revenir sur `main`
- **Fetch origin**
- **Pull origin** si proposé
- vérifier : “No local changes”

---

## Règles de nommage

### Branches

- `refactor/...` : découpage / nettoyage / architecture
- `feature/...` : nouvelle fonctionnalité
- `fix/...` : correction bug
- `docs/...` : documentation

### Commits (style recommandé)

- `v0.1f - extract FX (particles)`
- `v0.1g - extract game loop and reset`
- `docs - add pipeline guide`

---

## En cas de problème (raccourci)

### “J’ai des changements sur main sans le vouloir”

- Créer une branche `wip/...` et commit dessus
- Revenir sur `main` (propre) et pull
- Reprendre le travail sur la bonne branche

### “GitHub Desktop plante / fait des erreurs”

- Ne pas paniquer : le repo est rarement cassé
- Passer temporairement par PowerShell pour :
  - `git status`
  - `git add -A`
  - `git commit -m "..."`
  - `git push`

---

## Checklist reprise après quelques jours

1. Ouvrir GitHub Desktop
2. `main` → Fetch → Pull
3. Ouvrir le board GitHub → choisir l’issue “In Progress”
4. Branch → New branch
5. Reprendre le travail