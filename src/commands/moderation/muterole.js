const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'muterole',
    description: 'Définit le rôle Mute pour le serveur',
    category: 'Moderation',
    usage: 'muterole <rôle>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('common.admin_only', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};

        // Display current
        if (!args[0]) {
             const current = config.moderation.muteRole ? `<@&${config.moderation.muteRole}>` : "Non défini";
             return sendV2Message(client, message.channel.id, await t('muterole.current', message.guild.id, { role: current }), []);
        }

        let roleId;
        if (message.mentions.roles.size > 0) roleId = message.mentions.roles.first().id;
        else roleId = args[0].replace(/[<@&>]/g, '');

        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
            return sendV2Message(client, message.channel.id, await t('common.role_not_found', message.guild.id), []);
        }

        config.moderation.muteRole = roleId;
        config.markModified('moderation');
        await config.save();

        return sendV2Message(client, message.channel.id, await t('muterole.success', message.guild.id, { role: role.name }), []);
    }
};
