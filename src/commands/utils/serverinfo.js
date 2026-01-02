const { sendV2Message } = require('../../utils/componentUtils');
const { ChannelType } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'serverinfo',
    description: 'Informations complètes du serveur',
    category: 'Utils',
    async run(client, message, args) {
        const guild = message.guild;
        const owner = await guild.fetchOwner();
        
        const info = [
            await t('serverinfo.name', message.guild.id, { name: guild.name }),
            await t('serverinfo.id', message.guild.id, { id: guild.id }),
            await t('serverinfo.owner', message.guild.id, { tag: owner.user.tag, id: owner.id }),
            (await t('serverinfo.created', message.guild.id, { date: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>` })),
            await t('serverinfo.members', message.guild.id, { count: guild.memberCount }),
            await t('serverinfo.channels', message.guild.id, { total: guild.channels.cache.size, text: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size, voice: guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size }),
            await t('serverinfo.roles', message.guild.id, { count: guild.roles.cache.size }),
            await t('serverinfo.emojis', message.guild.id, { count: guild.emojis.cache.size }),
            await t('serverinfo.boosts', message.guild.id, { count: guild.premiumSubscriptionCount, level: guild.premiumTier })
        ].join('\n');

        await sendV2Message(client, message.channel.id, (await t('serverinfo.title', message.guild.id)) + "\n\n" + info, []);
    }
};