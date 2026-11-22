# Essayer le clone de Pindrop

Pars d'un commerce fictif, personnalise sa page et ouvre l'aperçu comme le ferait le commerçant. Aucun compte externe, aucune clé API et aucune carte bancaire ne sont nécessaires. La recherche de vrais commerces reste disponible séparément via OpenStreetMap.

## Démarrer sur ton ordinateur

Installe **Docker Desktop avec Compose v2** (ou Docker Engine avec le module Compose v2). Démarre Docker, récupère cette version du dépôt, puis ouvre un terminal dans le dossier contenant `compose.yaml`. Il faut une connexion Internet au premier lancement pour télécharger les images et les dépendances.

```sh
docker compose up --build --wait --wait-timeout 180
```

Une fois les services prêts, ouvre **http://127.0.0.1:5173/register**. Utilise bien `127.0.0.1` plutôt que `localhost` : l'application autorise cette adresse pour l'éditeur et les aperçus. La commande prépare la base, applique les migrations et génère les secrets locaux. Pas de fichier `.env` à remplir.

## Du café à l'aperçu

1. Inscris-toi avec des identifiants réservés à cet essai. Dans **Prospection**, clique sur **Essayer avec un commerce fictif**, puis sur **Créer son site** dans la fiche du *Café du Papier — Démo*. Tu n'as pas à autoriser la géolocalisation. La fiche reste utilisable même si le fond de carte ne charge pas.
2. Le nom et l'adresse sont déjà remplis. Sélectionne **Torréfacteur**, puis **Créer le site · 100 crédits**. Ces crédits sont ceux du compte d'essai, pas un paiement.
3. Dans **Contenu**, remplace le **Titre principal** par « Une pause au Café du Papier ». Clique sur **Enregistrer**. Recharge la page : le titre doit être conservé dans le formulaire et dans l'aperçu.
4. Clique sur **Publier un aperçu de 7 jours**. Copie le lien et ouvre-le dans une fenêtre de navigation privée **sur le même ordinateur**. Tu dois voir ton titre sans avoir à te connecter.
5. Dans l'éditeur, clique sur **Retirer l'aperçu**, puis recharge la fenêtre privée : la page doit être introuvable. Ton brouillon reste dans **Mes sites**.

L'essai est **local** : les ports 5173 et 3000 sont accessibles uniquement depuis ton ordinateur. Un lien `127.0.0.1` envoyé à quelqu'un d'autre ne lui montrera pas ton site. La publication sur Internet et les paiements réels ne font pas partie de cette configuration.

## Arrêter et reprendre

`docker compose down` arrête la démo **sans effacer** les comptes, les sites ni les secrets locaux. Pour reprendre, lance `docker compose up --wait`. Ne supprime pas les volumes si tu souhaites garder tes données.

Si le démarrage échoue, vérifie que Docker est lancé et que les ports 3000 et 5173 sont libres. `docker compose ps -a` affiche l'état des services et `docker compose logs api` donne les détails si le catalogue n'est pas prêt.

## Vérification automatique

Le contrôle GitHub **Essai du commerce à l’aperçu** démarre une installation vierge pour les propositions de modification vers `main`. Dans Chromium, il inscrit un vendeur fictif, crée le site depuis la carte, enregistre un nouveau titre, recharge l'éditeur, vérifie la durée de sept jours, puis ouvre le lien dans une session sans compte. Enfin, il retire l'aperçu et vérifie que le même lien répond 404. Le scénario bloque les ressources externes du navigateur : il ne dépend pas du service de recherche cartographique et ne le teste pas. Il ne déclenche aucun paiement.

Pour le détail des services : [documentation du serveur](backend/README.md). Pour les licences des modèles : [crédits des ressources tierces](THIRD_PARTY_NOTICES.md).
