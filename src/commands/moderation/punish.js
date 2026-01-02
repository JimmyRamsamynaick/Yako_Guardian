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
                return sendV2Message(client, message.channel.id, await t('moderation.punish_list_empty', message.guild.id), []);
            }

            const embed = new EmbedBuilder()
                .setTitle(await t('moderation.punish_list_title', message.guild.id, { guild: message.guild.name }))
                .setColor(client.config.color || '#ff0000');

            let desc = "";
            for (const p of list) {
                let dur = p.duration ? `(${ms(p.duration)})` : "";
                desc += (await t('moderation.punish_list_item', message.guild.id, { count: p.count, action: p.action.toUpperCase(), duration: dur })) + "\n";
            }

            embed.setDescription(desc);
            return sendV2Message(client, message.channel.id, "", [embed]);
        }

        // REMOVE
        if (sub === 'remove' || sub === 'del') {
            const count = parseInt(args[1]);
            if (isNaN(count)) return sendV2Message(client, message.channel.id, await t('moderation.punish_remove_usage', message.guild.id), []);

            const initialLen = config.moderation.strikes.punishments.length;
            config.moderation.strikes.punishments = config.moderation.strikes.punishments.filter(p => p.count !== count);

            if (config.moderation.strikes.punishments.length === initialLen) {
                return sendV2Message(client, message.channel.id, await t('moderation.punish_remove_not_found', message.guild.id), []);
            }

            config.markModified('moderation');
            await config.save();
            return sendV2Message(client, message.channel.id, await t('moderation.punish_remove_success', message.guild.id, { count }), []);
        }

        // ADD
        if (sub === 'add' || sub === 'set') {
            // Usage: +punish add 3 mute 1h
            const count = parseInt(args[1]);
            const action = args[2]?.toLowerCase();
            const durationStr = args[3];

            const validActions = ['kick', 'ban', 'mute', 'timeout', 'warn'];

            if (isNaN(count) || !validActions.includes(action)) {
                return sendV2Message(client, message.channel.id, await t('moderation.punish_add_usage', message.guild.id), []);
            }

            let duration = null;
            if (['mute', 'timeout'].includes(action)) {
                if (!durationStr) return sendV2Message(client, message.channel.id, await t('moderation.punish_duration_required', message.guild.id), []);
                try {
                    duration = ms(durationStr);
                    if (!duration) throw new Error();
                } catch {
                    return sendV2Message(client, message.channel.id, await t('moderation.duration_invalid', message.guild.id), []);
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

            return sendV2Message(client, message.channel.id, await t('moderation.punish_add_success', message.guild.id, { count, action: action.toUpperCase(), duration: duration ? `(${durationStr})` : "" }), []);
        }

        return sendV2Message(client, message.channel.id, await t('punish.usage', message.guild.id), []);
    }
};
