const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'announce',
    description: 'Envoie une annonce sous forme d\'embed',
    category: 'Utils',
    usage: 'announce <message>',
    aliases: ['annonce'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ManageMessages' }), 'error')] });
        }

        const content = args.join(' ');
        if (!content) {
            return message.channel.send({ embeds: [createEmbed('Usage', await t('announce.usage', message.guild.id), 'warning')] });
        }

        const embed = createEmbed(
            await t('announce.title', message.guild.id),
            content,
            'default',
            { footer: message.guild.name, footerIcon: message.guild.iconURL() }
        );

        await message.channel.send({ embeds: [embed] });
        if (message.deletable) message.delete().catch(() => {});
    }
};
