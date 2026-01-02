const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'pic',
    description: 'Récupère la photo de profil d’un utilisateur',
    category: 'Utils',
    async run(client, message, args) {
        const userId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;
        let user;
        try {
            user = await client.users.fetch(userId);
        } catch {
            return sendV2Message(client, message.channel.id, await t('pic.not_found', message.guild.id), []);
        }

        const url = user.displayAvatarURL({ size: 4096, extension: 'png' });
        await sendV2Message(client, message.channel.id, (await t('pic.title', message.guild.id, { tag: user.tag })) + `\n${url}`, []);
    }
};