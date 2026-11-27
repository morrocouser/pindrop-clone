# Déploiement : Netlify + Supabase

Architecture en ligne (trois services, tous gratuits) :

| Rôle | Service | Adresse |
|---|---|---|
| Application (React) | Netlify, site `pindrop-clone-app` | https://pindrop-clone-app.netlify.app |
| API (Express en Netlify Function) + fichiers des modèles | Netlify, site `pindrop-clone-api` | https://pindrop-clone-api.netlify.app |
| Base de données PostgreSQL | Supabase, projet `pindrop-clone` (Paris) | via le pooler `aws-1-eu-west-3` |

L'application et l'API sont deux sites distincts **volontairement** : les pages publiques des commerces
(`/s/...`) et leurs scripts tournent sur l'origine de l'API, jamais sur celle de l'application.

## Redéployer

Depuis le dossier du site (`backend/` ou `frontend/`), avec l'identifiant du site Netlify :

```powershell
npx -y @netlify/mcp@latest --site-id <ID> --proxy-path "<URL fournie par l'outil deploy-site>"
```

Ne jamais lancer deux déploiements en même temps (ils partagent le cache `npx`).

## Variables d'environnement de l'API (Netlify)

`DATABASE_URL` (rôle `pindrop_app`, pooler Supabase, port 6543, `?pgbouncer=true&connection_limit=1`),
`JWT_SECRET`, `CORS_ORIGIN` (URL de l'application), `PUBLIC_BASE_URL` (URL de l'API),
`PAYMENTS_MODE=test`, `NODE_ENV=production`.
Elles sont figées à chaque déploiement : redéployer après tout changement.

Facultatives :
- `ALLOW_TEST_PAYMENTS=true` : garde le paiement simulé en production. Sans elle, il est coupé, car n'importe qui
  (le propriétaire du site compris) pourrait confirmer un lien et mettre un site en ligne sans payer.
  La page de paiement affiche alors « paiement en ligne pas encore ouvert ».
- `CLIENT_IP_HEADER` : en-tête qui porte l'adresse du client pour la limitation de débit. Inutile sur Netlify
  (`x-nf-client-connection-ip` est choisi automatiquement) ; `X-Forwarded-For` n'est jamais utilisé, il est falsifiable.

## Base de données

Le schéma est appliqué par migration Supabase. La sécurité par ligne (RLS) est active sur toutes les tables,
sans politique pour les rôles publics : seule l'application (rôle `pindrop_app`) y accède, en connexion directe.
Les migrations Prisma du dossier `backend/prisma/migrations` restent la référence du schéma.

La table `rate_limits` (compteurs de limitation de débit partagés entre les instances de la fonction,
migration Prisma `20261127120000_rate_limits`) est appliquée sur Supabase (migration `rate_limits`, 27/11/2026),
comme les autres tables : RLS active, politique `pindrop_app_all` pour `pindrop_app` seul, aucun droit pour
`anon` ni `authenticated`. Sans cette table, connexion, inscription, paiement et prospection répondraient 500.

La colonne `payment_links.currency` (devises USD, EUR, MAD) est déjà appliquée sur Supabase ; elle a une valeur
par défaut, donc l'API déjà en ligne continue de fonctionner. Les nouveautés d'affichage (arabe, WhatsApp, devises)
n'apparaissent en ligne qu'après un redéploiement des deux sites.

## Limites connues

- **IA (OmniRoute)** : non disponible en ligne, la passerelle tourne sur la machine locale.
- **Paiements** : mode test, aucun débit réel.
- **Recherche de commerces** : dépend des serveurs publics OpenStreetMap ; l'hébergeur coupe les requêtes
  sans réponse au bout de 30 s, d'où une recherche en parallèle sur plusieurs miroirs.
