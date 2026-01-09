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

        // Format Title to replace raw mentions with display names
        const formatTitle = (text) => {
            if (!text) return text;
            
            // Roles
            text = text.replace(/<@&(\d+)>/g, (match, id) => {
                const role = message.guild.roles.cache.get(id);
                return role ? `@${role.name}` : match;
            });
            
            // Users
            text = text.replace(/<@!?(\d+)>/g, (match, id) => {
                const user = message.mentions.users.get(id) || message.guild.members.cache.get(id)?.user || client.users.cache.get(id);
                return user ? `@${user.username}` : match;
            });

            // Channels
            text = text.replace(/<#(\d+)>/g, (match, id) => {
                const channel = message.guild.channels.cache.get(id);
                return channel ? `#${channel.name}` : match;
            });
            
            return text;
        };

        title = formatTitle(title);

        await message.channel.send({ embeds: [createEmbed(title, description, 'info')] });
    }
};
