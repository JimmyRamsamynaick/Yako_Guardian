const { PermissionsBitField } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/design');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const ms = require('ms');

module.exports = {
    name: 'flags',
    description: 'flags.description',
    category: 'Configuration',
    usage: 'flags.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'Administrator' }), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        const sub = args[0]?.toLowerCase();

        if (sub === 'add') {
            const type = args[1]?.toLowerCase();
            const action = args[2]?.toLowerCase();
            const value = args[3];

            const validTypes = ['link', 'spam', 'everyone', 'mention', 'badwords', 'invite', 'caps'];
            const validActions = ['warn', 'mute', 'kick', 'ban', 'timeout'];

            if (!validTypes.includes(type)) {
                return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('flags.invalid_type', message.guild.id), 'error')] });
            }

            if (!validActions.includes(action)) {
                return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('flags.invalid_action', message.guild.id), 'error')] });
            }

            let amount = 1;
            let duration = null;

            if (action === 'warn') {
                amount = parseInt(value) || 1;
            } else if (action === 'mute' || action === 'timeout') {
                if (!value) return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('flags.invalid_value', message.guild.id), 'error')] });
                try {
                    duration = ms(value);
                    if (!duration) throw new Error();
                } catch (e) {
                    return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('flags.invalid_value', message.guild.id), 'error')] });
                }
            }

            // Update or Add
            if (!config.moderation.flags) config.moderation.flags = [];
            const existingIndex = config.moderation.flags.findIndex(f => f.type === type);
            
            const flagData = { type, action, amount, duration, enabled: true };
            
            if (existingIndex > -1) {
                config.moderation.flags[existingIndex] = flagData;
            } else {
                config.moderation.flags.push(flagData);
            }

            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('flags.success_add', message.guild.id, { type, action, value: value || amount }), 'success')] });

        } else if (sub === 'remove') {
            const type = args[1]?.toLowerCase();
            if (!config.moderation.flags) return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('flags.list_empty', message.guild.id), 'error')] });
            
            const initialLength = config.moderation.flags.length;
            config.moderation.flags = config.moderation.flags.filter(f => f.type !== type);
            
            if (config.moderation.flags.length === initialLength) {
                return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('flags.invalid_type', message.guild.id), 'error')] });
            }

            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('flags.success_remove', message.guild.id, { type }), 'success')] });

        } else if (sub === 'toggle') {
            const type = args[1]?.toLowerCase();
            if (!config.moderation.flags) return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('flags.list_empty', message.guild.id), 'error')] });
            
            const flag = config.moderation.flags.find(f => f.type === type);
            if (!flag) {
                return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('flags.invalid_type', message.guild.id), 'error')] });
            }

            flag.enabled = !flag.enabled;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('flags.success_toggle', message.guild.id, { type, status: flag.enabled ? 'ON' : 'OFF' }), 'success')] });

        } else {
            // List
            if (!config.moderation.flags || config.moderation.flags.length === 0) {
                return message.channel.send({ embeds: [createEmbed(await t('flags.title', message.guild.id), await t('flags.list_empty', message.guild.id), 'info')] });
            }

            const embed = createEmbed(await t('flags.title', message.guild.id), '', 'info');
            
            config.moderation.flags.forEach(f => {
                const val = f.action === 'warn' ? `${f.amount} strikes` : (f.duration ? ms(f.duration) : '-');
                const status = f.enabled ? '✅' : '❌';
                embed.addFields({ name: `${status} ${f.type.toUpperCase()}`, value: `**Action:** ${f.action}\n**Value:** ${val}`, inline: true });
            });

            return message.channel.send({ embeds: [embed] });
        }
    }
};
