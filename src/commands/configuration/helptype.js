const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const { db } = require('../../database');

module.exports = {
    name: 'helptype',
    description: 'Configure le style du menu d\'aide (Button, Select, Hybrid)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && message.author.id !== message.guild.ownerId) {
             return sendV2Message(client, message.channel.id, "❌ Vous devez être administrateur pour utiliser cette commande.", []);
        }

        const type = args[0]?.toLowerCase();
        if (!type || !['button', 'select', 'hybrid'].includes(type)) {
            return sendV2Message(client, message.channel.id, "❌ Usage: `+helptype <button/select/hybrid>`\n\n• **Button**: Affiche des boutons pour chaque catégorie.\n• **Select**: Affiche un menu déroulant.\n• **Hybrid**: Combine les deux (Boutons pour les sections principales, Select pour le reste).", []);
        }

        db.prepare('UPDATE guild_settings SET help_type = ? WHERE guild_id = ?').run(type, message.guild.id);
        return sendV2Message(client, message.channel.id, `✅ Menu d'aide configuré sur : **${type.toUpperCase()}**.`, []);
    }
};
