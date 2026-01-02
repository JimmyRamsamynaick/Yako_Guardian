const { createEmbed } = require('../../utils/design');
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
            return message.channel.send({ embeds: [createEmbed(await t('pic.not_found', message.guild.id), '', 'error')] });
        }

        const url = user.displayAvatarURL({ size: 4096, extension: 'png' });
        const embed = createEmbed((await t('pic.title', message.guild.id, { tag: user.tag })), '', 'info');
        embed.setImage(url);
        await message.channel.send({ embeds: [embed] });
    }
};