const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'banner',
    description: 'Récupère la bannière d’un utilisateur',
    category: 'Utils',
    async run(client, message, args) {
        const userId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;
        let user;
        try {
            user = await client.users.fetch(userId, { force: true }); 
        } catch {
            return sendV2Message(client, message.channel.id, await t('banner.user_not_found', message.guild.id), []);
        }

        if (!user.banner) {
             return sendV2Message(client, message.channel.id, await t('banner.no_banner', message.guild.id), []);
        }

        const url = user.bannerURL({ size: 4096, extension: 'png' });
        await sendV2Message(client, message.channel.id, `${await t('banner.success', message.guild.id, { user: user.tag })}\n${url}`, []);
    }
};