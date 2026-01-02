const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'timeout',
    description: 'Active/Désactive l\'utilisation du Timeout Discord au lieu du rôle Mute',
    category: 'Moderation',
    usage: 'timeout <on/off>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('common.admin_only', message.guild.id), []);
        }

        const sub = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(sub)) {
            return sendV2Message(client, message.channel.id, await t('timeout.usage', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        
        config.moderation.timeoutEnabled = (sub === 'on');
        config.markModified('moderation');
        await config.save();

        return sendV2Message(client, message.channel.id, await t('timeout.success', message.guild.id, { status: sub.toUpperCase() }), []);
    }
};
