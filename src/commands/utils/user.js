const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'user',
    description: 'Informations globales d’un utilisateur',
    category: 'Utils',
    async run(client, message, args) {
        const userId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;
        let user;
        try {
            user = await client.users.fetch(userId);
        } catch {
            return sendV2Message(client, message.channel.id, await t('userinfo.not_found', message.guild.id), []);
        }

        const info = [
            await t('userinfo.tag', message.guild.id, { tag: user.tag }),
            await t('userinfo.id', message.guild.id, { id: user.id }),
            await t('userinfo.created', message.guild.id, { date: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>` }),
            await t('userinfo.bot', message.guild.id, { isBot: user.bot ? await t('userinfo.yes', message.guild.id) : await t('userinfo.no', message.guild.id) })
        ].join('\n');
        
        const links = [
            `[${await t('userinfo.avatar_link', message.guild.id)}](${user.displayAvatarURL({ size: 1024 })})`,
            user.banner ? `[${await t('userinfo.banner_link', message.guild.id)}](${user.bannerURL({ size: 1024 })})` : null
        ].filter(Boolean).join(' | ');

        await sendV2Message(client, message.channel.id, (await t('userinfo.title', message.guild.id, { username: user.username })) + `\n\n${info}\n\n${links}`, []);
    }
};