# Anti-Spam avancé

## Vue d'ensemble
Le module anti-spam analyse chaque utilisateur indépendamment, sur plusieurs salons, avec un score de risque borné entre 0 et 100.

## Stockage
- Configuration persistée : `GuildConfig.moderation.antispam`
- État temporaire : mémoire (`Map`)
- Réduction mémoire : historique borné + nettoyage périodique + decay

## Paramètres principaux
- `enabled` : active ou désactive le module
- `debug` : journalise le détail des facteurs
- `profile` : `lenient`, `balanced`, `strict`
- `similarityThreshold` : seuil de similarité textuelle
- `historyRetentionMs` : durée max de conservation en mémoire
- `cleanupIntervalMs` : fréquence de nettoyage
- `decayPerSecond` : vitesse de décroissance du score
- `maxTrackedMessages` : limite mémoire par utilisateur
- `antiSpamChannels` : salons plus sensibles
- `trustedDomains` : domaines neutres ou habituels
- `blockedDomains` : domaines fortement suspects
- `suspiciousDomains` : domaines raccourcis ou à surveiller
- `ignoredUsers`, `ignoredRoles`, `ignoredChannels`, `ignoredCategories`, `ignoredPermissions` : exclusions
- `windows.short|medium|long|extended` : fenêtres de burst
- `thresholds` : paliers du score
- `weights` : poids des facteurs
- `actions.warning|delete|timeout|severe` : réponses progressives

## Facteurs de score
- Rapidité et bursts
- Doublons exacts
- Similarité forte
- Répétition de liens
- Répétition de pièces jointes
- Diffusion cross-channel
- Fichiers suspects
- Contenu obfusqué ou fortement suspect
- Mitigation conversationnelle pour limiter les faux positifs

## Commandes
- `+antispam status`
- `+antispam on`
- `+antispam off`
- `+antispam debug on`
- `+antispam preset strict`
- `+antispam set actions.timeout.durationMs 15m`
- `+antispam add blockedDomains grabify.link`
- `+antispam add ignoredChannels 123456789012345678`

## Conseils
- Commencer en `debug=true`
- Utiliser `balanced` en production initiale
- Activer `severe.enabled` uniquement après observation réelle
- Garder `ignoredPermissions` avec `Administrator` et `ManageMessages` tant que les seuils ne sont pas stabilisés
