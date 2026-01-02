const { createEmbed } = require('../../utils/design');
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
            return message.channel.send({ embeds: [createEmbed(await t('banner.user_not_found', message.guild.id), '', 'error')] });
        }

        if (!user.banner) {
             return message.channel.send({ embeds: [createEmbed(await t('banner.no_banner', message.guild.id), '', 'info')] });
        }

        const url = user.bannerURL({ size: 4096, extension: 'png' });
        const embed = createEmbed(await t('banner.success', message.guild.id, { user: user.tag }), '', 'info');
        embed.setImage(url);
        await message.channel.send({ embeds: [embed] });
    }
};