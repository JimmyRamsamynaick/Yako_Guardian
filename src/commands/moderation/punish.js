const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');
const ms = require('ms');

module.exports = {
    name: 'punish',
    description: 'punish.description',
    category: 'Moderation',
    usage: 'punish.usage',
    aliases: ['setpunish', 'punishment'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.admin_only', message.guild.id), 'error')] });
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
                return message.channel.send({ embeds: [createEmbed(await t('moderation.punish_title', message.guild.id), await t('moderation.punish_list_empty', message.guild.id), 'info')] });
            }

            let desc = "";
            for (const p of list) {
                let dur = p.duration ? `(${ms(p.duration)})` : "";
                desc += (await t('moderation.punish_list_item', message.guild.id, { count: p.count, action: p.action.toUpperCase(), duration: dur })) + "\n";
            }

            const embed = createEmbed(
                await t('moderation.punish_list_title', message.guild.id, { guild: message.guild.name }),
                desc,
                'primary'
            );
            return message.channel.send({ embeds: [embed] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.punish_loading_title', message.guild.id), `${THEME.icons.loading} ${await t('moderation.punish_loading', message.guild.id)}`, 'loading')] });

        // REMOVE
        if (sub === 'remove' || sub === 'del') {
            const count = parseInt(args[1]);
            if (isNaN(count)) return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.punish_remove_usage', message.guild.id), 'error')] });

            const initialLen = config.moderation.strikes.punishments.length;
            config.moderation.strikes.punishments = config.moderation.strikes.punishments.filter(p => p.count !== count);

            if (config.moderation.strikes.punishments.length === initialLen) {
                return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.punish_remove_not_found', message.guild.id), 'error')] });
            }

            config.markModified('moderation');
            await config.save();
            return replyMsg.edit({ embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('moderation.punish_remove_success', message.guild.id, { count }), 'success')] });
        }

        // ADD
        if (sub === 'add' || sub === 'set') {
            // Usage: +punish add 3 mute 1h
            const count = parseInt(args[1]);
            const action = args[2]?.toLowerCase();
            const durationStr = args[3];

            const validActions = ['kick', 'ban', 'mute', 'timeout', 'warn'];

            if (isNaN(count) || !validActions.includes(action)) {
                return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.punish_add_usage', message.guild.id), 'error')] });
            }

            let duration = null;
            if (['mute', 'timeout'].includes(action)) {
                if (!durationStr) return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.punish_duration_required', message.guild.id), 'error')] });
                try {
                    duration = ms(durationStr);
                    if (!duration) throw new Error();
                } catch {
                    return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.duration_invalid', message.guild.id), 'error')] });
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

            return replyMsg.edit({ embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('moderation.punish_add_success', message.guild.id, { count, action: action.toUpperCase(), duration: duration ? `(${durationStr})` : "" }), 'success')] });
        }
    }
};
