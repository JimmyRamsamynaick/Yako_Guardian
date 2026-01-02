const { createEmbed } = require('../../utils/design');
const { isBotOwner } = require('../../utils/ownerUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'globalset',
    description: 'Modifie le profil GLOBAL du bot (Owner uniquement)',
    category: 'Owner',
    aliases: ['gset'],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const type = args[0]?.toLowerCase();
        const value = args.slice(1).join(' ');

        if (!type || !value) {
            return message.channel.send({ embeds: [createEmbed(
                await t('globalset.usage', message.guild.id),
                '',
                'info'
            )] });
        }

        try {
            if (type === 'name') {
                await client.user.setUsername(value);
                return message.channel.send({ embeds: [createEmbed(
                    await t('globalset.name_changed', message.guild.id, { value }),
                    '',
                    'success'
                )] });
            } else if (['pic', 'avatar', 'pfp'].includes(type)) {
                await client.user.setAvatar(value);
                return message.channel.send({ embeds: [createEmbed(
                    await t('globalset.avatar_updated', message.guild.id),
                    '',
                    'success'
                )] });
            } else if (['banner'].includes(type)) {
                // Bots need to be verified/partnered? Not always, but usually tricky via API for normal bots?
                // Actually setBanner is not a method on client.user directly in v14?
                // It's typically done via the API or dashboard.
                // client.user.setBanner doesn't exist.
                return message.channel.send({ embeds: [createEmbed(
                    await t('globalset.banner_not_supported', message.guild.id),
                    '',
                    'error'
                )] });
            } else {
                return message.channel.send({ embeds: [createEmbed(
                    await t('globalset.invalid_option', message.guild.id),
                    '',
                    'error'
                )] });
            }
        } catch (e) {
            return message.channel.send({ embeds: [createEmbed(
                await t('globalset.error', message.guild.id, { error: e.message }),
                '',
                'error'
            )] });
        }
    }
};
