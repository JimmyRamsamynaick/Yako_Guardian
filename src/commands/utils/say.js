const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'say',
    description: 'Fait parler le bot',
    category: 'Utils',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

        const content = args.join(' ');
        if (!content) return message.channel.send({ embeds: [createEmbed(await t('say.usage', message.guild.id), '', 'info')] });

        message.delete().catch(() => {});
        // message.channel.send(content);
        await message.channel.send({ embeds: [createEmbed(content, '', 'info')] });
    }
};
