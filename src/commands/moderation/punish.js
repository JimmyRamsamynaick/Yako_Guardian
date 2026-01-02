const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');
const ms = require('ms');

module.exports = {
    name: 'punish',
    description: 'Configure les sanctions automatiques (échelle de punitions)',
    category: 'Moderation',
    usage: 'punish <add/remove/list> ...',
    aliases: ['setpunish', 'punishment'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('common.admin_only', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        if (!config.moderation.strikes) config.moderation.strikes = { punishments: [] };
        if (!config.moderation.strikes.punishments) config.moderation.strikes.punishments = [];

        const sub = args[0]?.toLowerCase();

        // LIST
        if (!sub || sub === 'list') {
            const list = config.moderation.strikes.punishments.sort((a, b) => a.count - b.count);
            
            if (list.length === 0) {
                return sendV2Message(client, message.channel.id, "❌ Aucune punition configurée.", []);
            }

            const embed = new EmbedBuilder()
                .setTitle(`Échelle des Punitions - ${message.guild.name}`)
                .setColor(client.config.color || '#ff0000');

            let desc = "";
            list.forEach(p => {
                let dur = p.duration ? `(${ms(p.duration)})` : "";
                desc += `**${p.count}** strikes ➔ **${p.action.toUpperCase()}** ${dur}\n`;
            });

            embed.setDescription(desc);
            return sendV2Message(client, message.channel.id, "", [embed]);
        }

        // REMOVE
        if (sub === 'remove' || sub === 'del') {
            const count = parseInt(args[1]);
            if (isNaN(count)) return sendV2Message(client, message.channel.id, "❌ Précisez le nombre de strikes (ex: `+punish remove 3`).", []);

            const initialLen = config.moderation.strikes.punishments.length;
            config.moderation.strikes.punishments = config.moderation.strikes.punishments.filter(p => p.count !== count);

            if (config.moderation.strikes.punishments.length === initialLen) {
                return sendV2Message(client, message.channel.id, "❌ Aucune punition trouvée pour ce nombre de strikes.", []);
            }

            config.markModified('moderation');
            await config.save();
            return sendV2Message(client, message.channel.id, `✅ Punition pour **${count}** strikes supprimée.`, []);
        }

        // ADD
        if (sub === 'add' || sub === 'set') {
            // Usage: +punish add 3 mute 1h
            const count = parseInt(args[1]);
            const action = args[2]?.toLowerCase();
            const durationStr = args[3];

            const validActions = ['kick', 'ban', 'mute', 'timeout', 'warn'];

            if (isNaN(count) || !validActions.includes(action)) {
                return sendV2Message(client, message.channel.id, "**Usage:** `+punish add <count> <action> [duration]`\nActions: `kick`, `ban`, `mute`, `timeout`, `warn`", []);
            }

            let duration = null;
            if (['mute', 'timeout'].includes(action)) {
                if (!durationStr) return sendV2Message(client, message.channel.id, "❌ Durée requise pour mute/timeout (ex: 10m, 1h).", []);
                try {
                    duration = ms(durationStr);
                    if (!duration) throw new Error();
                } catch {
                    return sendV2Message(client, message.channel.id, "❌ Durée invalide.", []);
                }
            }

            // Remove existing for this count
            config.moderation.strikes.punishments = config.moderation.strikes.punishments.filter(p => p.count !== count);

            config.moderation.strikes.punishments.push({
                count,
                action,
                duration
            });

            config.markModified('moderation');
            await config.save();

            return sendV2Message(client, message.channel.id, `✅ Configuré: **${count}** strikes ➔ **${action.toUpperCase()}** ${duration ? `(${durationStr})` : ""}`, []);
        }

        return sendV2Message(client, message.channel.id, await t('punish.usage', message.guild.id), []);
    }
};
