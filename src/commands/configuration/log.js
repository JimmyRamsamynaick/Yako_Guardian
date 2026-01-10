const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'log',
    description: 'Gère le système de logs avancé',
    category: 'Configuration',
    usage: 'log <status/test/ignore/export/config>',
    aliases: ['logs'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('common.admin_only', message.guild.id),
                '',
                'error'
            )] });
        }

        const config = await getGuildConfig(message.guild.id);
        const sub = args[0]?.toLowerCase();

        // --- STATUS ---
        if (sub === 'status') {
            const logs = config.logs || {};
            const formatStatus = async (key) => {
                const log = logs[key];
                if (!log || !log.enabled) return await t('logs.status_inactive', message.guild.id);
                const channel = message.guild.channels.cache.get(log.channelId);
                return channel ? await t('logs.status_active', message.guild.id, { channel: channel.toString() }) : await t('logs.status_inactive', message.guild.id);
            };

            const embed = createEmbed(await t('logs.status_title', message.guild.id), '', 'info')
                .addFields(
                    { name: 'ModLog', value: await formatStatus('mod'), inline: true },
                    { name: 'MessageLog', value: await formatStatus('message'), inline: true },
                    { name: 'VoiceLog', value: await formatStatus('voice'), inline: true },
                    { name: 'BoostLog', value: await formatStatus('boost'), inline: true },
                    { name: 'RoleLog', value: await formatStatus('role'), inline: true },
                    { name: 'RaidLog', value: await formatStatus('raid'), inline: true },
                    { name: 'ServerLog', value: await formatStatus('server'), inline: true },
                    { name: 'MemberLog', value: await formatStatus('member'), inline: true }
                )
                .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() });

            return message.channel.send({ embeds: [embed] });
        }

        // --- TEST ---
        if (sub === 'test') {
            const type = args[1]?.toLowerCase();
            const validTypes = ['mod', 'message', 'voice', 'boost', 'role', 'raid', 'server', 'member'];
            
            if (!validTypes.includes(type)) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('logs.usage', message.guild.id),
                    '',
                    'info'
                )] });
            }

            const log = config.logs?.[type];
            if (!log || !log.enabled || !log.channelId) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('logs.status_inactive', message.guild.id),
                    '',
                    'warning'
                )] });
            }

            const channel = message.guild.channels.cache.get(log.channelId);
            if (!channel) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('logs.test_error', message.guild.id),
                    '',
                    'error'
                )] });
            }

            try {
                const embed = createEmbed(
                    `Test Log: ${type.toUpperCase()}`,
                    `Ceci est un test pour le log **${type}**.`,
                    'success'
                ).setTimestamp();
                
                await channel.send({ embeds: [embed] });
                return message.channel.send({ embeds: [createEmbed(
                    await t('logs.test_sent', message.guild.id, { channel: channel.toString() }),
                    '',
                    'success'
                )] });
            } catch (e) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('logs.test_error', message.guild.id),
                    '',
                    'error'
                )] });
            }
        }

        // --- IGNORE ---
        if (sub === 'ignore') {
            const action = args[1]?.toLowerCase(); // add/del
            const target = args[2];
            
            if (!['add', 'del'].includes(action) || !target) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('logs.ignore_usage', message.guild.id),
                    '',
                    'info'
                )] });
            }

            // Determine if user or role
            let targetId = target.replace(/[<@&>]/g, '');
            let isRole = target.includes('&');
            let type = isRole ? 'ignoredRoles' : 'ignoredUsers';
            
            const types = ['mod', 'message', 'voice', 'boost', 'role', 'raid', 'server', 'member'];
            let modified = false;

            if (!config.logs) config.logs = {};

            for (const logType of types) {
                if (!config.logs[logType]) config.logs[logType] = { enabled: false, ignoredUsers: [], ignoredRoles: [] };
                
                const list = config.logs[logType][type] || [];
                
                if (action === 'add') {
                    if (!list.includes(targetId)) {
                        list.push(targetId);
                        modified = true;
                    }
                } else {
                    const idx = list.indexOf(targetId);
                    if (idx > -1) {
                        list.splice(idx, 1);
                        modified = true;
                    }
                }
                config.logs[logType][type] = list;
            }

            if (modified) {
                config.markModified('logs');
                await config.save();
                const key = action === 'add' ? 'logs.ignore_added' : 'logs.ignore_removed';
                return message.channel.send({ embeds: [createEmbed(
                    await t(key, message.guild.id, { target: target }),
                    '',
                    'success'
                )] });
            } else {
                return message.channel.send({ embeds: [createEmbed(
                    await t('common.no_action', message.guild.id),
                    '',
                    'info'
                )] });
            }
        }

        // --- EXPORT ---
        if (sub === 'export') {
            return message.channel.send({ embeds: [createEmbed(
                await t('logs.export_feature', message.guild.id),
                '',
                'info'
            )] });
        }

        // --- CONFIG (Interactive) ---
        if (sub === 'config' || !sub) {
             const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
             
             const menu = new StringSelectMenuBuilder()
                .setCustomId(`log_select_${message.guild.id}`)
                .setPlaceholder('Sélectionnez un type de log')
                .addOptions([
                    { label: 'Modération', value: 'mod', description: 'Logs de modération (ban, kick, mute)', emoji: '🔨' },
                    { label: 'Messages', value: 'message', description: 'Logs de messages (edit, delete)', emoji: '💬' },
                    { label: 'Vocal', value: 'voice', description: 'Logs vocaux (join, leave, move)', emoji: '🎤' },
                    { label: 'Boost', value: 'boost', description: 'Logs de boost', emoji: '🚀' },
                    { label: 'Rôles', value: 'role', description: 'Logs de rôles (add, remove)', emoji: '🛡️' },
                    { label: 'Raid', value: 'raid', description: 'Logs anti-raid', emoji: '🚨' },
                    { label: 'Serveur', value: 'server', description: 'Logs serveur (update, emoji)', emoji: '🏛️' },
                    { label: 'Membres', value: 'member', description: 'Logs membres (join, leave)', emoji: '👤' }
                ]);

            const row = new ActionRowBuilder().addComponents(menu);
            
            const embed = createEmbed(await t('logs.config_title', message.guild.id), await t('logs.config_desc', message.guild.id), 'info');

            return message.channel.send({ embeds: [embed], components: [row] });
        }

        return message.channel.send({ embeds: [createEmbed(
            await t('logs.usage', message.guild.id),
            '',
            'info'
        )] });
    }
};
