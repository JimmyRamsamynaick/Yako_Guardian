const { sendV2Message } = require('../../utils/componentUtils');
const { ChannelType } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'channel',
    description: 'Informations relatives à un salon',
    category: 'Utils',
    async run(client, message, args) {
        const channelId = args[0]?.replace(/[<#>]/g, '') || message.channel.id;
        const channel = message.guild.channels.cache.get(channelId);

        if (!channel) {
            return sendV2Message(client, message.channel.id, await t('channel.not_found', message.guild.id), []);
        }

        const typeStr = Object.keys(ChannelType).find(key => ChannelType[key] === channel.type);
        const createdStr = `<t:${Math.floor(channel.createdTimestamp / 1000)}:R>`;

        const info = [
            await t('channel.name', message.guild.id, { name: channel.name }),
            await t('channel.id', message.guild.id, { id: channel.id }),
            await t('channel.type', message.guild.id, { type: typeStr }),
            await t('channel.category', message.guild.id, { category: channel.parent ? channel.parent.name : 'Aucune' }),
            await t('channel.created', message.guild.id, { date: createdStr }),
            await t('channel.position', message.guild.id, { position: channel.position })
        ].join('\n');

        const header = await t('channel.info_title', message.guild.id, { name: channel.name });
        await sendV2Message(client, message.channel.id, `${header}\n\n${info}`, []);
    }
};