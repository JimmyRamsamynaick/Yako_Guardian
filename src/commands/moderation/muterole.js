const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'muterole',
    description: 'Définit le rôle Mute pour le serveur',
    category: 'Moderation',
    usage: 'muterole <rôle>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.admin_only', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};

        // Display current
        if (!args[0]) {
             const current = config.moderation.muteRole ? `<@&${config.moderation.muteRole}>` : await t('common.not_defined', message.guild.id);
             return message.channel.send({ embeds: [createEmbed('Rôle Mute', await t('muterole.current', message.guild.id, { role: current }), 'info')] });
        }

        let roleId;
        if (message.mentions.roles.size > 0) roleId = message.mentions.roles.first().id;
        else roleId = args[0].replace(/[<@&>]/g, '');

        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
            return message.channel.send({ embeds: [createEmbed('Erreur', await t('common.role_not_found', message.guild.id), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed('Configuration', `${THEME.icons.loading} Sauvegarde en cours...`, 'loading')] });

        config.moderation.muteRole = roleId;
        config.markModified('moderation');
        await config.save();

        await replyMsg.edit({ embeds: [createEmbed('Succès', await t('muterole.success', message.guild.id, { role: role.name }), 'success')] });
    }
};
