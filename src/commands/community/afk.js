const AFK = require('../../database/models/AFK');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'afk',
    description: 'Définit votre statut en AFK',
    category: 'Community',
    usage: 'afk [raison]',
    async run(client, message, args) {
        const reason = args.join(' ') || 'AFK';
        
        try {
            await AFK.findOneAndUpdate(
                { guildId: message.guild.id, userId: message.author.id },
                { 
                    reason: reason, 
                    timestamp: Date.now(),
                    mentions: []
                },
                { upsert: true, new: true }
            );

            // Rename user if permission? (Optional, maybe annoying if it fails or name too long)
            // if (message.member.manageable) {
            //    await message.member.setNickname(`[AFK] ${message.member.displayName}`).catch(() => {});
            // }

            message.channel.send({ embeds: [createEmbed(await t('afk.set', message.guild.id, { user: message.author.username, reason }), '', 'success')] });
        } catch (e) {
            console.error(e);
        }
    }
};
