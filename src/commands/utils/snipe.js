const { createEmbed } = require('../../utils/design');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'snipe',
    description: 'Affiche le dernier message supprimé du salon',
    category: 'Utils',
    async run(client, message, args) {
        const snipe = client.snipes.get(message.channel.id);
        if (!snipe) return message.channel.send({ embeds: [createEmbed(await t('snipe.empty', message.guild.id), '', 'info')] });

        let content = (await t('snipe.from', message.guild.id, { author: snipe.author, date: `<t:${Math.floor(snipe.date.getTime() / 1000)}:R>` })) + "\n" +
                      (await t('snipe.content', message.guild.id, { content: snipe.content }));
        
        const embed = createEmbed(content, '', 'info');
        if (snipe.image) embed.setImage(snipe.image);

        const msg = await message.channel.send({ embeds: [embed] });

        // Autodelete Response
        const config = await getGuildConfig(message.guild.id);
        if (config.autodelete?.snipe?.response > 0) {
            setTimeout(() => {
                 msg.delete().catch(() => {});
            }, config.autodelete.snipe.response);
        }
    }
};