const { startGiveaway, endGiveaway, rerollGiveaway } = require('../../handlers/giveawayHandler');
const Giveaway = require('../../database/models/Giveaway');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');
const ms = require('ms');

module.exports = {
    name: 'giveaway',
    description: 'Gérer les giveaways (lancements, fin, reroll)',
    category: 'giveaway',
    usage: 'giveaway <start/end/reroll/list> [args]',
    permLevel: 2, // Moderator
    async run(client, message, args) {
        const subCmd = args[0] ? args[0].toLowerCase() : null;
        
        if (!subCmd) {
            const startUsage = await t('giveaway.start_usage', message.guild.id);
            const endUsage = await t('giveaway.end_usage', message.guild.id);
            const rerollUsage = await t('giveaway.reroll_usage', message.guild.id);
            
            const embed = createEmbed(
                await t('giveaway.embed_title', message.guild.id), 
                `${await t('giveaway.usage', message.guild.id)}\n\n` +
                `${startUsage.replace('❌ ', '🔹 ')}\n` +
                `${endUsage.replace('❌ ', '🔹 ')}\n` +
                `${rerollUsage.replace('❌ ', '🔹 ')}\n` +
                `🔹 \`+giveaway list\``, 
                'info'
            );
            return message.channel.send({ embeds: [embed] });
        }

        if (subCmd === 'start') {
            // giveaway start <time> <winners> <prize>
            // args[1] = time
            // args[2] = winners
            // args[3+] = prize

            if (args.length < 4) {
                return message.channel.send({ embeds: [createEmbed(await t('giveaway.start_usage', message.guild.id), '', 'info')] });
            }

            const duration = ms(args[1]);
            if (!duration || isNaN(duration)) {
                return message.channel.send({ embeds: [createEmbed(await t('common.duration_invalid', message.guild.id), '', 'error')] });
            }

            const winners = parseInt(args[2]);
            if (isNaN(winners) || winners < 1) {
                return message.channel.send({ embeds: [createEmbed("❌ Invalid winner count.", '', 'error')] });
            }

            const prize = args.slice(3).join(' ');
            
            await startGiveaway(client, message.guild, message.channel, message.author, duration, winners, prize);
            // Confirmation is sent by the handler (the giveaway message itself)
            // But maybe we want to delete the command message or send a confirmation?
            // Handler sends the Embed.
            message.delete().catch(() => {});
        } else if (subCmd === 'end') {
            const messageId = args[1];
            if (!messageId) {
                return message.channel.send({ embeds: [createEmbed(await t('giveaway.end_usage', message.guild.id), '', 'info')] });
            }

            const result = await endGiveaway(client, messageId);
            if (!result) {
                 return message.channel.send({ embeds: [createEmbed(await t('giveaway.not_found', message.guild.id), '', 'error')] });
            }
            message.delete().catch(() => {});
        } else if (subCmd === 'reroll') {
            const messageId = args[1];
             if (!messageId) {
                return message.channel.send({ embeds: [createEmbed(await t('giveaway.reroll_usage', message.guild.id), '', 'info')] });
            }
            
            const result = await rerollGiveaway(client, messageId, message.guild);
            if (!result) {
                 return message.channel.send({ embeds: [createEmbed(await t('giveaway.not_found', message.guild.id), '', 'error')] });
            }
            message.delete().catch(() => {});
        } else if (subCmd === 'list') {
            const giveaways = await Giveaway.find({ guildId: message.guild.id, ended: false });
            
            if (giveaways.length === 0) {
                 return message.channel.send({ embeds: [createEmbed(await t('giveaway.list_empty', message.guild.id), '', 'info')] });
            }

            let desc = '';
            for (const g of giveaways) {
                desc += `**${g.prize}**\nID: \`${g.messageId}\` | <#${g.channelId}>\nEnds: <t:${Math.floor(g.endTimestamp / 1000)}:R>\n\n`;
            }

            const embed = createEmbed(await t('giveaway.list_title', message.guild.id), desc, 'info');
            
            message.channel.send({ embeds: [embed] });
        } else {
             const startUsage = await t('giveaway.start_usage', message.guild.id);
             const endUsage = await t('giveaway.end_usage', message.guild.id);
             const rerollUsage = await t('giveaway.reroll_usage', message.guild.id);
             
             const embed = createEmbed(
                 await t('giveaway.embed_title', message.guild.id), 
                 `${await t('giveaway.usage', message.guild.id)}\n\n` +
                 `${startUsage.replace('❌ ', '🔹 ')}\n` +
                 `${endUsage.replace('❌ ', '🔹 ')}\n` +
                 `${rerollUsage.replace('❌ ', '🔹 ')}\n` +
                 `🔹 \`+giveaway list\``, 
                 'info'
             );
             return message.channel.send({ embeds: [embed] });
        }
    }
};
