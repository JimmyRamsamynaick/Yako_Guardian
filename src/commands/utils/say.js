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
        
        let title = content;
        let description = '';

        // Discord Limit: Title max 256 chars
        if (content.length > 256) {
            const firstNewline = content.indexOf('\n');
            if (firstNewline > -1 && firstNewline <= 256) {
                title = content.substring(0, firstNewline);
                description = content.substring(firstNewline + 1);
            } else {
                title = ' '; // Use space to keep the icon
                description = content;
            }
        }

        await message.channel.send({ embeds: [createEmbed(title, description, 'info')] });
    }
};
