const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'leave',
    description: 'Gère les paramètres de départ ou quitte un serveur (Owner)',
    category: 'Configuration',
    usage: 'leave <settings/message> | leave <ID> (Owner)',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();
        
        // OWNER LOGIC: +leave <ID> or +leave (current)
        // If arg is a number (ID) or empty, and user is owner, treat as server leave
        if ((!sub || /^\d+$/.test(sub)) && await isBotOwner(message.author.id)) {
            const guildId = sub || message.guild.id;
            const guild = client.guilds.cache.get(guildId);
            
            if (!guild) {
                return message.channel.send({ embeds: [createEmbed('Erreur', await t('servers.server_not_found', message.guild.id), 'error')] });
            }

            try {
                await guild.leave();
                return message.channel.send({ embeds: [createEmbed('Succès', `✅ J'ai quitté le serveur **${guild.name}** (${guild.id}).`, 'success')] });
            } catch (err) {
                return message.channel.send({ embeds: [createEmbed('Erreur', `❌ Erreur: ${err.message}`, 'error')] });
            }
        }

        // CONFIG LOGIC
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.admin_only', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);

        // +leave settings
        if (sub === 'settings') {
            const goodbye = config.goodbye || {};
            const channel = goodbye.channelId ? `<#${goodbye.channelId}>` : await t('common.not_defined', message.guild.id);
            const msgState = goodbye.enabled ? await t('common.on', message.guild.id) : await t('common.off', message.guild.id);
            const msg = goodbye.message || await t('common.not_defined', message.guild.id);

            const embed = createEmbed(
                await t('leave.settings_title', message.guild.id),
                (await t('leave.settings_channel', message.guild.id, { channel })) + '\n' +
                (await t('leave.settings_message', message.guild.id)) + ` ${msgState}\n` +
                `\`${msg}\`` +
                (await t('leave.settings_help', message.guild.id)),
                'default'
            );

            return message.channel.send({ embeds: [embed] });
        }

        // +leave menu
        if (sub === 'menu') {
            return showLeaveMenu(message, config);
        }

        // +leave message <on/off>
        if (sub === 'message') {
            const state = args[1]?.toLowerCase();
            if (!['on', 'off'].includes(state)) {
                return message.channel.send({ embeds: [createEmbed('Usage', await t('leave.message_usage', message.guild.id), 'warning')] });
            }

            const replyMsg = await message.channel.send({ embeds: [createEmbed('Configuration', `${THEME.icons.loading} Sauvegarde en cours...`, 'loading')] });

            if (!config.goodbye) config.goodbye = {};
            config.goodbye.enabled = (state === 'on');
            await config.save();

            return replyMsg.edit({ embeds: [createEmbed('Succès', await t('leave.message_success', message.guild.id, { state: state.toUpperCase() }), 'success')] });
        }

        // +leave <channel> <message> (Shortcut)
        if (sub) {
            const channelId = sub.replace(/[<#>]/g, '');
            const channel = message.guild.channels.cache.get(channelId);

            if (channel) {
                const msgContent = args.slice(1).join(' ');
                if (!msgContent) {
                    return message.channel.send({ embeds: [createEmbed('Usage', await t('leave.usage', message.guild.id), 'warning')] });
                }

                const replyMsg = await message.channel.send({ embeds: [createEmbed('Configuration', `${THEME.icons.loading} Sauvegarde en cours...`, 'loading')] });

                if (!config.goodbye) config.goodbye = {};
                config.goodbye.enabled = true;
                config.goodbye.channelId = channel.id;
                config.goodbye.message = msgContent;
                await config.save();

                return replyMsg.edit({ embeds: [createEmbed('Succès', await t('common.success', message.guild.id) + ` Message de départ configuré pour ${channel}.`, 'success')] });
            }
        }

        return message.channel.send({ embeds: [createEmbed('Usage', await t('leave.usage', message.guild.id), 'warning')] });
    }
};
