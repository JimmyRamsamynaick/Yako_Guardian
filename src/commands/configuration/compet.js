const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../../utils/design');
const { setBotActivity } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'compet',
    description: 'Change l\'activité du bot (Participe à...)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('compet.permission', message.guild.id), '', 'error')] });
        }

        const text = args.join(' ');
        if (!text) return message.channel.send({ embeds: [createEmbed(await t('compet.usage', message.guild.id), '', 'info')] });

        await setBotActivity(client, message, 'compete', text);
    }
};