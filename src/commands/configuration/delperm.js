const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'delperm',
    description: 'Supprime les permissions personnalisées d\'un rôle',
    category: 'Configuration',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('delperm.permission', message.guild.id), []);
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) return sendV2Message(client, message.channel.id, await t('delperm.usage', message.guild.id), []);

        const config = await getGuildConfig(message.guild.id);
        const initialLen = config.customPermissions.length;
        config.customPermissions = config.customPermissions.filter(p => p.roleId !== role.id);
        
        if (config.customPermissions.length === initialLen) {
            return sendV2Message(client, message.channel.id, await t('delperm.not_found', message.guild.id, { role: role.name }), []);
        }

        await config.save();
        sendV2Message(client, message.channel.id, await t('delperm.success', message.guild.id, { role: role.name }), []);
    }
};
