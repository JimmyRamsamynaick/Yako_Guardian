const { createEmbed } = require('../../utils/design');
const { isBotOwner } = require('../../utils/ownerUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'leaveserver',
    description: 'Quitte un serveur (Owner)',
    category: 'Owner',
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const id = args[0];
        if (!id) return message.channel.send({ embeds: [createEmbed(
            await t('leaveserver.missing_id', message.guild.id),
            '',
            'error'
        )] });

        const guild = client.guilds.cache.get(id);
        if (!guild) return message.channel.send({ embeds: [createEmbed(
            await t('leaveserver.guild_not_found', message.guild.id),
            '',
            'error'
        )] });

        await guild.leave();
        return message.channel.send({ embeds: [createEmbed(
            await t('leaveserver.success', message.guild.id, { name: guild.name, id: guild.id }),
            '',
            'success'
        )] });
    }
};