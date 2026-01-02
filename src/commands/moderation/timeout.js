const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'timeout',
    description: 'Active/Désactive l\'utilisation du Timeout Discord au lieu du rôle Mute',
    category: 'Moderation',
    usage: 'timeout <on/off>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.admin_only', message.guild.id), 'error')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(sub)) {
            return message.channel.send({ embeds: [createEmbed('Utilisation Incorrecte', await t('timeout.usage', message.guild.id), 'warning')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed('Timeout', `${THEME.icons.loading} Configuration en cours...`, 'loading')] });

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        
        config.moderation.timeoutEnabled = (sub === 'on');
        config.markModified('moderation');
        await config.save();

        const statusText = sub === 'on' ? 'ACTIVÉ' : 'DÉSACTIVÉ';
        const type = sub === 'on' ? 'success' : 'warning';

        const embed = createEmbed(
            'Configuration Timeout',
            `${THEME.separators.line}\n` +
            `**Statut :** ${statusText}\n\n` +
            `${sub === 'on' ? '✅ Le bot utilisera désormais les Timeouts natifs de Discord.' : '⚠️ Le bot utilisera désormais le système de rôle Mute classique.'}\n` +
            `${THEME.separators.line}`,
            type
        );

        await replyMsg.edit({ embeds: [embed] });
    }
};
