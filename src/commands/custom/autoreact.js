const AutoReact = require('../../database/models/AutoReact');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'autoreact',
    description: 'Gérer les réactions automatiques',
    category: 'Personnalisation',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageChannels') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('autoreact.permission', message.guild.id), '', 'error')] });
        }

        const sub = args[0] ? args[0].toLowerCase() : null;

        if (!sub) {
            return message.channel.send({ embeds: [createEmbed(await t('autoreact.usage', message.guild.id), '', 'info')] });
        }

        if (sub === 'list') {
            const reacts = await AutoReact.find({ guild_id: message.guild.id });
            if (reacts.length === 0) return message.channel.send({ embeds: [createEmbed(await t('autoreact.list_empty', message.guild.id), '', 'info')] });

            const list = reacts.map(r => `<#${r.channel_id}>: ${r.emojis.join(' ')}`).join('\n');
            return message.channel.send({ embeds: [createEmbed(await t('autoreact.list_title', message.guild.id, { list }), '', 'info')] });
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
        const emoji = args[2];

        if (!channel || !emoji) {
            return message.channel.send({ embeds: [createEmbed(await t('autoreact.missing_args', message.guild.id), '', 'info')] });
        }

        // Validate emoji (basic check)
        // A proper check would try to react to a message.
        
        let doc = await AutoReact.findOne({ guild_id: message.guild.id, channel_id: channel.id });

        if (sub === 'add') {
            if (!doc) {
                doc = new AutoReact({ guild_id: message.guild.id, channel_id: channel.id, emojis: [] });
            }
            if (!doc.emojis.includes(emoji)) {
                doc.emojis.push(emoji);
                await doc.save();
                return message.channel.send({ embeds: [createEmbed(await t('autoreact.added', message.guild.id, { emoji, channel }), '', 'success')] });
            } else {
                return message.channel.send({ embeds: [createEmbed(await t('autoreact.already_exists', message.guild.id), '', 'error')] });
            }
        }

        if (sub === 'del') {
            if (doc && doc.emojis.includes(emoji)) {
                doc.emojis = doc.emojis.filter(e => e !== emoji);
                if (doc.emojis.length === 0) {
                    await AutoReact.deleteOne({ _id: doc._id });
                } else {
                    await doc.save();
                }
                return message.channel.send({ embeds: [createEmbed(await t('autoreact.removed', message.guild.id, { emoji, channel }), '', 'success')] });
            } else {
                return message.channel.send({ embeds: [createEmbed(await t('autoreact.not_found', message.guild.id), '', 'error')] });
            }
        }
    }
};