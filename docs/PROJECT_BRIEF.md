mini3D-engine — Project Brief
Vision

mini3D-engine est un prototype expérimental de mini moteur de jeu web conçu pour explorer un concept de jeu open world minimaliste, fluide, réactif et évolutif sur le long terme.

L’objectif n’est pas de recréer un moteur généraliste, mais de développer un micro-moteur spécialisé, pensé avant tout comme un système hybride, capable de faire coexister plusieurs formes de jeu dans une structure légère, souple et évolutive. Le projet s’appuie sur la navigation, la construction, l’exploration et des missions variées, tout en conservant une approche volontairement épurée et accessible.

Le gameplay peut prendre des formes très différentes : simple, ludique, sophistiqué, contemplatif ou plus artistique, avec une volonté constante de créer de la surprise, du décalage, ou parfois une touche d’humour. Cette approche hybride permet aussi une grande liberté de mise en scène et de structure, en passant selon les besoins d’un niveau en 2D (plateforme / action), à une 3D isométrique (dans un esprit proche d’un puzzle spatial), ou encore à une vue FPS.

Intention

Le projet sert à :

prototyper rapidement

tester la navigation, la caméra et l’interface

garder une base légère et modulaire

construire une identité technique et visuelle originale

préparer, si nécessaire plus tard, une migration vers un moteur comme Unity

Priorité actuelle

La priorité actuelle est :

navigation

caméra

UI / UX

Le gameplay existe pour soutenir l’expérience, mais reste secondaire à ce stade.

Base technique

Le prototype repose sur :

HTML / CSS

JavaScript

Three.js

WebGL

Le rendu est une vraie scène 3D dans le navigateur, avec un pipeline volontairement léger.

Direction visuelle et technique

Le projet vise une esthétique :

minimaliste

lisible

légère

potentiellement low poly

compatible avec de petits assets 2D / 3D

Contraintes souhaitées :

meshes simples

textures légères (ex. 256x256)

petits FX graphiques

sons simples

bonne fluidité

Monde

Le monde actuel repose sur :

une grille visuelle générative

une impression d’espace ouvert

une zone de mission fermée en 100x100

une bordure solide

des murs construits par le joueur

Cette structure permet de combiner sensation d’ouverture et contrôle du gameplay.

Navigation et caméra

Le prototype utilise plusieurs modes de vue :

Top View

Camera View

Isométrique

Perspective

La caméra supporte :

transitions entre vues

rotation par pas de 90°

retour automatique à l’axe de base après déplacement

recherche d’un feeling fluide, lisible et proche d’un outil 3D simplifié

Gameplay actuel

Le gameplay actuel est volontairement simple.

Mission de base

Le premier objectif est de :

récupérer 3 pièces d’or

Principe

Le joueur doit :

construire des murs

piéger un ennemi

provoquer un “stress” qui transforme l’ennemi en pièce d’or

Règles actuelles

les murs du joueur sont permanents

Espace construit ou détruit un mur sur la case du joueur

le joueur ne doit pas se bloquer avec ses propres murs

la bordure reste bloquante

les ennemis se déplacent aléatoirement

un ennemi ne doit pas se transformer en or uniquement au contact de la bordure

la transformation doit impliquer au moins un mur posé par le joueur

Stratégie de développement

La stratégie retenue est de :

continuer le développement comme un mini moteur web dédié

garder une structure légère et modulaire

avancer par refactorisation propre

utiliser GitHub comme base de production et de documentation

Cette approche doit permettre de développer un prototype fort, clair et extensible, avant toute décision de migration.

Pipeline

Le projet est organisé avec :

Git local

GitHub

branches de travail

Pull Requests

merge sur main pour les versions stables

Le dépôt GitHub devient la source principale du projet :

code

historique

documentation

décisions

roadmap

Refactorisation en cours

Étapes engagées :

v0.1a : sortie du code hors du HTML

v0.1b : extraction config / state / utils / input / HUD

v0.1c : extraction renderer + camera controller

v0.1d : extraction world (chunks / collision / walls)

Étapes suivantes prévues :

entités

FX

boucle de jeu

système de données

premiers assets

Règle directrice

Le projet doit rester :

léger

modulaire

réactif

lisible

orienté expérience

Chaque ajout doit renforcer la clarté du prototype, pas l’alourdir.