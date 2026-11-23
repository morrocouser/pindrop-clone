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

## Base de données

Le schéma est appliqué par migration Supabase. La sécurité par ligne (RLS) est active sur toutes les tables,
sans politique pour les rôles publics : seule l'application (rôle `pindrop_app`) y accède, en connexion directe.
Les migrations Prisma du dossier `backend/prisma/migrations` restent la référence du schéma.

La colonne `payment_links.currency` (devises USD, EUR, MAD) est déjà appliquée sur Supabase ; elle a une valeur
par défaut, donc l'API déjà en ligne continue de fonctionner. Les nouveautés d'affichage (arabe, WhatsApp, devises)
n'apparaissent en ligne qu'après un redéploiement des deux sites.

## Limites connues

- **IA (OmniRoute)** : non disponible en ligne, la passerelle tourne sur la machine locale.
- **Paiements** : mode test, aucun débit réel.
- **Recherche de commerces** : dépend des serveurs publics OpenStreetMap ; l'hébergeur coupe les requêtes
  sans réponse au bout de 30 s, d'où une recherche en parallèle sur plusieurs miroirs.
