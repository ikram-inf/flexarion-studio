# Site Flexarion : mise en ligne sur GitHub Pages

## 1. À remplacer avant de publier
Dans tous les fichiers `.html`, plus `sitemap.xml` et `robots.txt`, faites un « Rechercher / Remplacer » sur :

| Texte actuel | Remplacer par |
|---|---|
| `contact@flexarion-studio.fr` | votre vrai e-mail de contact |
| `presse@flexarion-studio.fr` | votre e-mail presse (ou le même) |

À personnaliser aussi :
- les noms et rôles des 4 fondateurs dans `studio.html` (ce sont des noms fictifs) ;
- les liens vers les réseaux sociaux (pied de page et `contact.html`), qui pointent pour l'instant vers les pages d'accueil d'Instagram, Discord, etc. ;
- la date des devlogs, si vous les publiez à des jours différents (balise `<time>` et `datePublished`).

## 2. Publier sur alwaysdata
Le site est en ligne à l'adresse **https://flexarion-studio.alwaysdata.net/**.
- **Par SFTP** (FileZilla) : connectez-vous avec les identifiants SSH/SFTP d'alwaysdata, ouvrez le dossier du site (`www/` par défaut), supprimez l'ancien contenu, puis envoyez **tout** le contenu de ce dossier, y compris le fichier caché `.htaccess`.
- **Par Git** : poussez sur GitHub (`git add -A`, `git commit`, `git push`), puis connectez-vous en SSH à alwaysdata, allez dans le dossier du site et faites `git pull`.

Le fichier `.htaccess` gère la page d'erreur 404, la redirection vers HTTPS, la compression et le cache.

## 3. Accélérer l'indexation par Google
1. Ouvrez [Google Search Console](https://search.google.com/search-console) et ajoutez la propriété « Préfixe d'URL » avec l'URL du site.
2. Validez la propriété avec la méthode « Balise HTML » : collez la balise fournie dans le `<head>` de `index.html`.
3. Dans *Sitemaps*, soumettez `sitemap.xml`.
4. Dans *Inspection de l'URL*, demandez l'indexation de chaque page.

## 4. Ajouter un devlog
Dupliquez un fichier de `devlog/`, changez le titre, la description, la date et le contenu, puis ajoutez-le :
- à la liste de `devlog/index.html` ;
- à `sitemap.xml` ;
- au lien « Devlog suivant » de l'article précédent (maillage interne).

## Ce qui est déjà en place pour le SEO
- Un `<title>` et une meta description uniques sur chaque page, avec « Flexarion ».
- Un seul `<h1>` par page, et une structure de titres claire.
- Des données structurées schema.org : Organization, VideoGame, BlogPosting, BreadcrumbList.
- `sitemap.xml`, `robots.txt` et des URL canoniques.
- Les balises Open Graph pour le partage sur les réseaux (`og-flexarion.jpg`).
- Des images en WebP, avec chargement différé (`lazy`) et un texte alternatif.
- Un maillage interne en silo : Accueil → Deviation / Studio → Devlog → articles.
- Un site responsive et accessible : lien d'évitement, navigation au clavier, respect du réglage « réduire les animations ».

## Le mini-jeu « Opération Deviation » (décor en haut des pages)
- Cliquez dans le décor pour tirer. Une vague est franchie tous les 5 ou 6 drones abattus, et la difficulté augmente à chaque vague : drones plus rapides, blindés plus résistants (3, puis 4, 5, 6 tirs…), snipers qui visent plus vite.
- Les ennemis :
  - **éclaireur** : 1 tir ;
  - **traqueur** : pique vers vous et fait perdre du signal ;
  - **blindé** : sa vie augmente avec les vagues ;
  - **courrier doré** : rapide, rapporte 500 points.
- **Snipers** (à partir de la vague 2) : une lueur rouge se charge dans un immeuble. S'il n'est pas abattu à temps, il tire : l'écran se fissure et le signal baisse de 25.
- **Ravitaillements** : des caisses tombent en parachute. Tirez dessus pour regagner du signal, de l'espoir et réparer l'écran.
- **Pigeons** : ils passent de temps en temps. Les abattre fait chuter la jauge Espoir. À 0 %, c'est la fin.
- **Black-out** : détruire tous les projecteurs coupe le courant pendant 25 secondes. Le site s'éteint, le curseur devient une lampe torche, les drones sont aveugles et les points comptent double.
- **La Vigie** (boss aux vagues 4, 8 et 12) : son œil rouge prend 3 fois plus de dégâts, et les sirènes et le mégaphone de la police l'accompagnent. Une fois abattue, la foule scande et le bandeau de propagande devient rebelle sur tout le site.
- **15 vagues** : la Vigie revient aux vagues 4, 8 et 12. La vague 15 lance un dernier avertissement.
- **La fin** : après la vague 15, un hélicoptère de l'Ordre intervient, un soldat tire sur la caméra, et le message « Il n'y a aucun espoir. » s'affiche.
- Le bouton **Mission** affiche les 7 objectifs et les 5 secrets. La progression est sauvegardée dans le navigateur.

Les solutions des secrets (à garder pour la démo à l'oral) :
1. **Code de la Résistance** : le code Konami (↑ ↑ ↓ ↓ ← → ← → B A) active le tir automatique (maintenir le clic).
2. **Pacifiste ?** : tirez 7 fois sur le logo.
3. **Vision nocturne** : tapez « deviation » au clavier.
4. **Quelle cruauté** : tirez sur un pigeon.
5. **Fin de transmission** : terminez la vague 15 (ou faites tomber l'espoir à 0).

## Musique et sons
- Musique : « Squelch and Sweep » (`assets/audio/squelch-and-sweep.mp3`). Elle démarre au premier clic sur la page, car les navigateurs bloquent la lecture automatique, et reprend là où elle en était d'une page à l'autre. Un bouton « Musique » permet de la couper.
- Les bruitages (tirs, verre brisé, sirènes, foule, rotor) sont générés par le navigateur, sans fichier. Les phrases du mégaphone utilisent la synthèse vocale du système : la voix varie selon l'ordinateur.

## Organisation des fichiers JavaScript
- `assets/site.js` : tout le site (écran de démarrage, ville animée, apparitions au défilement, curseur, menu mobile, scène « Votre premier choix »). Il fonctionne seul.
- `assets/game.js` : le mini-jeu, ses sons et la musique. Il est chargé **uniquement si le jeu est activé**, par `site.js`. S'il est absent ou s'il plante, le site reste complet.
- Dans le HUD, les boutons **« Jeu : on »** et **« Animations : on »** permettent au visiteur de couper le jeu (mode visite, le site reste animé) ou toutes les animations. Ces choix sont mémorisés.
