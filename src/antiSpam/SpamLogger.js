const { createEmbed } = require('../utils/design');
const logger = require('../utils/logger');

function formatFactors(factors) {
    return Object.entries(factors)
        .filter(([, value]) => value)
        .map(([key, value]) => `${value > 0 ? '+' : ''}${Math.round(value)} ${key}`)
        .join(' | ');
}

async function logDetection(message, result, actionLabel, guildConfig, effectiveScore) {
    const channelId = guildConfig?.logs?.mod?.enabled
        ? guildConfig.logs.mod.channelId
        : guildConfig?.moderation?.logChannel;

    if (!channelId) return;

    const channel = message.guild.channels.cache.get(channelId);
    if (!channel) return;

    const reasons = result.reasons.length
        ? result.reasons.map((reason) => `• ${reason}`).join('\n')
        : '• Score comportemental composite';

    const embed = createEmbed(
        '🚨 Anti-Spam',
        `Utilisateur : ${message.author}\nUser ID : \`${message.author.id}\`\n\nScore : **${effectiveScore}/100**\n\nRaison :\n${reasons}\n\nAction : **${actionLabel}**`,
        'moderation'
    )
        .addFields({
            name: 'Facteurs',
            value: formatFactors(result.factors).slice(0, 1024) || 'Aucun facteur detaille'
        })
        .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
}

function logDebug(message, result, effectiveScore) {
    logger.info(
        `[AntiSpam] guild=${message.guild.id} user=${message.author.id} score=${effectiveScore} ${formatFactors(
            result.factors
        )}`
    );
}

module.exports = { logDetection, logDebug };
