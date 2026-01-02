const Level = require('../../database/models/Level');
const Reputation = require('../../database/models/Reputation');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'leaderboard',
    description: 'Affiche le classement du serveur (XP ou Reputation)',
    category: 'Community',
    usage: 'leaderboard [rep]',
    aliases: ['lb', 'top'],
    async run(client, message, args) {
        const type = args[0] === 'rep' ? 'rep' : 'xp';
        
        let data;
        let title;

        if (type === 'rep') {
            data = await Reputation.find({ guildId: message.guild.id })
                .sort({ rep: -1 })
                .limit(10);
            title = 'Reputation Leaderboard';
        } else {
            const config = await getGuildConfig(message.guild.id);
            if (!config.community?.levels?.enabled) {
                return message.channel.send({ embeds: [createEmbed(await t('rank.disabled', message.guild.id), '', 'error')] });
            }
            // Sort by Level DESC, then XP DESC
            data = await Level.find({ guildId: message.guild.id })
                .sort({ level: -1, xp: -1 })
                .limit(10);
            title = 'XP Leaderboard';
        }

        if (!data || data.length === 0) {
            return message.channel.send({ embeds: [createEmbed(await t('leaderboard.empty', message.guild.id), '', 'info')] });
        }

        let description = '';
        for (let i = 0; i < data.length; i++) {
            const entry = data[i];
            const user = await client.users.fetch(entry.userId).catch(() => null);
            const tag = user ? user.tag : 'Unknown User';
            
            if (type === 'rep') {
                description += `**${i + 1}.** ${tag} - **${entry.rep}** Rep\n`;
            } else {
                description += `**${i + 1}.** ${tag} - Level **${entry.level}** (${entry.xp} XP)\n`;
            }
        }

        const embed = createEmbed(await t('leaderboard.title', message.guild.id, { guild: message.guild.name }), description, 'info');
        embed.setDescription(`**${title}**\n\n${description}`);
        
        message.channel.send({ embeds: [embed] });
    }
};
