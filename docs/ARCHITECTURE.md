Architecture
Objectif

L’architecture de mini3D-engine doit rester :

simple

modulaire

légère

lisible

Le but est de construire un mini moteur spécialisé, pas un moteur généraliste complexe.

Structure actuelle visée
src/main.js

Point d’entrée principal.

Responsabilités :

initialisation

assemblage des modules

démarrage de la boucle

src/config.js

Contient les constantes globales :

tailles

limites

vitesses

paramètres de caméra

réglages de gameplay simples

src/state.js

Contient l’état global minimal du runtime :

scène

renderer

caméras

collections d’entités

mode courant

score

état de mission

données monde

src/utils/

Fonctions utilitaires pures.

Exemples :

helpers math

helpers grille

conversions coordonnées / cellules

src/input/

Gestion des entrées utilisateur.

Responsabilités :

clavier

touches maintenues / appuis uniques

actions contextuelles

src/ui/

Gestion de l’interface HTML.

Responsabilités :

HUD

état des boutons

affichage du mode courant

infos minimales de debug

src/render/

Gestion de l’affichage 3D.

Responsabilités :

renderer

scène

lumière

caméras

transitions de vue

rotation de caméra

src/world/

Gestion du monde.

Responsabilités :

chunks visuels

collisions

bordures

murs joueur

logique spatiale de base

src/entities/

Gestion des entités du jeu.

Responsabilités :

player

ennemis

pièces

logique de mouvement propre à chaque type

src/fx/

Effets visuels légers.

Responsabilités :

particules

flashes

petits feedbacks visuels

src/game/

Orchestration du gameplay.

Responsabilités :

boucle de jeu

reset

logique de mission

coordination générale

Règles d’architecture

un module = une responsabilité claire

éviter les variables globales dispersées

éviter les nombres magiques

séparer rendu, logique, UI et données

préserver un comportement stable pendant la refactorisation

Principe de refactorisation

Pendant la phase V0.1 :

aucun ajout de feature majeur

aucune refonte de gameplay

priorité à la clarté du code

refactorisation à comportement identique

Évolution prévue

À court terme :

finaliser la séparation des entités

isoler la boucle de jeu

préparer un système de données simple

À moyen terme :

ajouter une petite librairie d’assets

intégrer sons et FX

préparer un mode exploration / éditeur plus structuré