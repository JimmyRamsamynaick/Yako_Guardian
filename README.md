# 🛡️ Yako Guardian

<div align="center">

[![Discord](https://img.shields.io/discord/1325988636785315870?color=5865F2&label=Support&logo=discord&logoColor=white)](https://discord.gg/sferTT73tZ)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/JimmyRamsamynaick/Yako_Guardian)
[![Security](https://img.shields.io/badge/Security-High-green)](https://github.com/JimmyRamsamynaick/Yako_Guardian)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/JimmyRamsamynaick/Yako_Guardian)

**La solution ultime pour sécuriser, gérer et protéger votre communauté Discord.**

[Inviter le Bot](https://discord.com/oauth2/authorize?client_id=1455618003067605207&permissions=8&scope=bot) • [Support](https://discord.gg/sferTT73tZ) • [Site Web](https://payement-guardian.myddns.me/)

</div>

---

## 🔒 Introduction à la Cybersécurité Discord

Dans un environnement numérique en constante évolution, la sécurité de votre communauté n'est pas une option, c'est une nécessité. **Yako Guardian** a été conçu avec une philosophie "Security First" pour contrer les menaces modernes qui pèsent sur les serveurs Discord : raids automatisés, nuking, spam de tokens, et failles humaines.

Ce n'est pas juste un bot de modération, c'est un **pare-feu intelligent** pour votre serveur.

## ✨ Fonctionnalités Principales

### 🛡️ Système Anti-Raid & Sécurité Avancée
Protégez votre serveur contre les attaques malveillantes avec des modules configurables :
- **Anti-Bot** : Bloque l'ajout de bots non vérifiés ou malveillants.
- **Anti-Token / Anti-Selfbot** : Détecte et bannit les comptes utilisateurs automatisés.
- **Anti-Mass Ban/Kick** : Empêche les administrateurs compromis de détruire votre base d'utilisateurs.
- **Anti-Channel/Role Update** : Bloque la suppression ou la modification massive de vos salons et rôles.
- **Anti-Link & Anti-Spam** : Filtre les liens dangereux et le flood.
- **Mode Urgence** : Verrouillez instantanément votre serveur en cas d'attaque.

### 💾 Système de Backup (Sauvegarde)
Ne perdez plus jamais votre travail.
- **Sauvegarde complète** : Rôles, salons, permissions, catégories, et configurations.
- **Restauration rapide** : Remettez votre serveur sur pied en quelques secondes après un incident.
- **Auto-Backup** : Planifiez des sauvegardes automatiques pour une tranquillité d'esprit totale.

### 🎫 Support & Gestion Communautaire
- **Système de Tickets** : Créez des panels de support professionnels avec transcrits.
- **Modmail** : Permettez à vos membres de contacter le staff en privé sans polluer les salons.
- **Suggestions** : Système de vote interactif pour impliquer votre communauté.

### 🔧 Utilitaires & Modération
- **Clonage de Serveur** : Copiez la structure d'un serveur vers un autre (Owner only).
- **Gestion des Rôles** : Mass role, temp role, menus de rôles (réactions).
- **Logs Détaillés** : Gardez une trace de toutes les actions (modération, vocal, messages).
- **Alertes Twitch** : Notifiez votre communauté lors de vos lives.

---

## 🚀 Installation & Déploiement

### Prérequis
- [Node.js](https://nodejs.org/) (v16.9.0 ou supérieur)
- [MongoDB](https://www.mongodb.com/) (Base de données)
- Un VPS (Ubuntu/Debian recommandé) ou une machine locale.

### Installation

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/JimmyRamsamynaick/Yako_Guardian.git
   cd Yako_Guardian
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration**
   Renommez le fichier `.env.example` en `.env` et remplissez vos informations :
   ```env
   TOKEN=votre_token_discord
   MONGO_URI=votre_lien_mongodb
   CLIENT_ID=id_du_bot
   OWNER_ID=votre_id_discord
   # ... autres clés
   ```

4. **Lancer le bot**
   
   *Mode développement :*
   ```bash
   node src/index.js
   ```

   *Mode production (avec PM2) :*
   ```bash
   pm2 start ecosystem.config.js
   ```

---

## 🤝 Contribution & Support

Si vous rencontrez un problème de sécurité ou un bug, merci de ne pas ouvrir d'issue publique pour les failles critiques. Contactez-nous directement sur notre serveur de support.

Rejoignez la communauté pour obtenir de l'aide, suggérer des fonctionnalités ou simplement discuter de cybersécurité.

[**Rejoindre le Serveur de Support**](https://discord.gg/sferTT73tZ)

---

<div align="center">
  
  *Développé avec ❤️ pour la sécurité de vos communautés.*
  
  © 2025 Yako Guardian. Tous droits réservés.

</div>
