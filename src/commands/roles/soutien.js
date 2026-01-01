const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');

const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'soutien',
    description: 'Configure le rôle de soutien (statut)',
    category: 'Menus & Rôles',
    async execute(client, message, args) { // Added client
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission (Administrator requis).", []);
        }

        const sub = args[0]?.toLowerCase();
        // +soutien role <role>
        // +soutien status <texte>
        // +soutien on/off
        // +soutien info

        const config = await getGuildConfig(message.guild.id);
        const soutien = config.soutien || { enabled: false };

        if (!sub || sub === 'info') {
            return sendV2Message(client, message.channel.id, `**Configuration Soutien**\nÉtat: ${soutien.enabled ? '✅' : '❌'}\nRôle: ${soutien.roleId ? `<@&${soutien.roleId}>` : 'Non défini'}\nStatut requis: \`${soutien.statusText || 'Non défini'}\`\n\nCommandes:\n\`+soutien role <rôle>\`\n\`+soutien status <texte>\`\n\`+soutien on/off\``, []);
        }

        if (sub === 'on') {
            config.soutien.enabled = true;
            await config.save();
            return sendV2Message(client, message.channel.id, "✅ Système de soutien activé.", []);
        }
        if (sub === 'off') {
            config.soutien.enabled = false;
            await config.save();
            return sendV2Message(client, message.channel.id, "✅ Système de soutien désactivé.", []);
        }

        if (sub === 'role') {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
            if (!role) return sendV2Message(client, message.channel.id, "❌ Rôle invalide.", []);
            config.soutien.roleId = role.id;
            await config.save();
            return sendV2Message(client, message.channel.id, `✅ Rôle de soutien défini sur **${role.name}**.`, []);
        }

        if (sub === 'status' || sub === 'statut') {
            const text = args.slice(1).join(' ');
            if (!text) return sendV2Message(client, message.channel.id, "❌ Texte invalide.", []);
            config.soutien.statusText = text;
            await config.save();
            return sendV2Message(client, message.channel.id, `✅ Statut requis défini sur : \`${text}\`.`, []);
        }
    }
};
