# Politique de sécurité

## Signaler une vulnérabilité

Si vous découvrez une faille de sécurité, **ne créez pas d'issue publique**.

Contactez-nous directement via les mainteneurs du projet sur GitHub en utilisant la fonctionnalité [Security Advisories](../../security/advisories/new).

## Portée

Cette politique s'applique à :
- Le code source de l'application
- Les dépendances tierces
- La configuration de déploiement

## Hors portée

- Les services externes (Google Maps API, OSRM, Régie de l'énergie)
- Les instances auto-hébergées par des tiers

## Bonnes pratiques

- Les clés API doivent toujours être dans `.env` (jamais commitées)
- Les clés Google Maps doivent avoir des restrictions HTTP referrer
- Les données utilisateur restent dans `localStorage` (côté client uniquement)
