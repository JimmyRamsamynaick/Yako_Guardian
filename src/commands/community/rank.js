const Level = require('../../database/models/Level');
const Reputation = require('../../database/models/Reputation');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'rank',
    description: 'Affiche votre niveau et réputation ou celui d\'un utilisateur',
    category: 'Community',
    aliases: ['profile', 'level', 'xp'],
    async run(client, message, args) {
        const config = await getGuildConfig(message.guild.id);
        
        if (!config.community?.levels?.enabled) {
            return message.channel.send({ embeds: [createEmbed(await t('rank.disabled', message.guild.id), '', 'error')] });
        }

        const targetUser = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;
        const member = await message.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) return message.channel.send({ embeds: [createEmbed(await t('common.member_not_found', message.guild.id), '', 'error')] });

        // Fetch Data
        const levelData = await Level.findOne({ guildId: message.guild.id, userId: targetUser.id });
        const repData = await Reputation.findOne({ guildId: message.guild.id, userId: targetUser.id });

        // Calculate Rank
        let rank = 0;
        if (levelData) {
            const betterPlayers = await Level.countDocuments({
                guildId: message.guild.id,
                $or: [
                    { level: { $gt: levelData.level } },
                    { level: levelData.level, xp: { $gt: levelData.xp } }
                ]
            });
            rank = betterPlayers + 1;
        }

        const level = levelData ? levelData.level : 0;
        const currentXp = levelData ? levelData.xp : 0;
        const messageCount = levelData ? (levelData.messageCount || 0) : 0;
        const rep = repData ? repData.rep : 0;
        
        // XP Needed for NEXT level
        // Formula: 5 * (level ** 2) + 50 * level + 100
        const xpNeeded = 5 * (level ** 2) + 50 * level + 100;
        const percentage = Math.min(Math.floor((currentXp / xpNeeded) * 100), 100);

        // Progress Bar
        const size = 15;
        const progress = Math.round((percentage / 100) * size);
        const emptyProgress = size - progress;
        const progressBar = '█'.repeat(progress) + '░'.repeat(emptyProgress);

        // Role
        const highestRole = member.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.position - a.position).first();
        const roleName = highestRole ? highestRole.toString() : '@everyone';

        const embed = createEmbed(
            null, 
            null, 
            'info'
        );
        
        // Header
        embed.setAuthor({ name: await t('rank.title', message.guild.id, { user: targetUser.username }), iconURL: targetUser.displayAvatarURL({ dynamic: true }) });
        embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }));
        
        // Description: Progress Bar + %
        embed.setDescription(`${progressBar} **${percentage}%**`);

        // Fields
        embed.addFields(
            { name: await t('rank.level', message.guild.id), value: `${level}`, inline: true },
            { name: await t('rank.rank', message.guild.id), value: rank > 0 ? `#${rank}` : '-', inline: true },
            { name: await t('rank.reputation', message.guild.id), value: `${rep}`, inline: true }
        );

        embed.addFields(
            { name: await t('rank.progression', message.guild.id), value: `${currentXp}/${xpNeeded}`, inline: true },
            { name: await t('rank.xp_required', message.guild.id), value: `${xpNeeded} XP`, inline: true },
            { name: await t('rank.messages', message.guild.id), value: `${messageCount}`, inline: true }
        );

        // Footer
        let locale = await t('common.date_locale', message.guild.id);
        // Fallback if translation missing or returns key
        if (!locale || locale === 'common.date_locale') locale = 'fr-FR';
        
        const joinDate = member.joinedAt.toLocaleDateString(locale);
        embed.setFooter({ text: `${await t('rank.member_since', message.guild.id)} ${joinDate}` });
        embed.setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }
};
