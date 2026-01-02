const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'join',
    description: 'Gère les paramètres d\'arrivée (Welcome, Autorole)',
    category: 'Configuration',
    usage: 'join <settings/dm/role>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.admin_only', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        const sub = args[0]?.toLowerCase();

        // +join settings
        if (sub === 'settings') {
            const welcome = config.welcome || {};
            const channel = welcome.channelId ? `<#${welcome.channelId}>` : await t('common.not_defined', message.guild.id);
            const role = welcome.roleId ? `<@&${welcome.roleId}>` : await t('common.not_defined', message.guild.id);
            const dmState = welcome.dm ? await t('common.on', message.guild.id) : await t('common.off', message.guild.id);
            const msg = welcome.message || await t('common.not_defined', message.guild.id);

            const embed = createEmbed(
                await t('join.settings_title', message.guild.id),
                (await t('join.settings_channel', message.guild.id, { channel })) + '\n' +
                (await t('join.settings_role', message.guild.id, { role })) + '\n' +
                (await t('join.settings_dm', message.guild.id, { state: dmState })) + '\n\n' +
                (await t('join.settings_message', message.guild.id)) + '\n' +
                `\`${msg}\``,
                'default'
            );

            return message.channel.send({ embeds: [embed] });
        }

        // +join dm <on/off>
        if (sub === 'dm') {
            const state = args[1]?.toLowerCase();
            if (!['on', 'off'].includes(state)) {
                return message.channel.send({ embeds: [createEmbed('Usage', await t('join.dm_usage', message.guild.id), 'warning')] });
            }

            const replyMsg = await message.channel.send({ embeds: [createEmbed('Configuration', `${THEME.icons.loading} Sauvegarde en cours...`, 'loading')] });

            if (!config.welcome) config.welcome = {};
            config.welcome.dm = (state === 'on');
            await config.save();

            return replyMsg.edit({ embeds: [createEmbed('Succès', await t('join.dm_success', message.guild.id, { state: state.toUpperCase() }), 'success')] });
        }

        // +join role <role/off>
        if (sub === 'role') {
            const input = args[1];
            if (!input) {
                return message.channel.send({ embeds: [createEmbed('Usage', await t('join.role_usage', message.guild.id), 'warning')] });
            }

            const replyMsg = await message.channel.send({ embeds: [createEmbed('Configuration', `${THEME.icons.loading} Sauvegarde en cours...`, 'loading')] });

            if (input.toLowerCase() === 'off') {
                if (config.welcome) config.welcome.roleId = null;
                await config.save();
                return replyMsg.edit({ embeds: [createEmbed('Succès', await t('join.role_disabled', message.guild.id), 'success')] });
            }

            const roleId = input.replace(/[<@&>]/g, '');
            const role = message.guild.roles.cache.get(roleId);
            if (!role) {
                await replyMsg.delete().catch(() => {});
                return message.channel.send({ embeds: [createEmbed('Erreur', await t('common.role_not_found', message.guild.id), 'error')] });
            }

            // Check hierarchy
            if (role.position >= message.guild.members.me.roles.highest.position) {
                await replyMsg.delete().catch(() => {});
                 return message.channel.send({ embeds: [createEmbed('Erreur', await t('moderation.role_higher_bot', message.guild.id), 'error')] });
            }

            if (!config.welcome) config.welcome = {};
            config.welcome.roleId = role.id;
            await config.save();

            return replyMsg.edit({ embeds: [createEmbed('Succès', await t('join.role_success', message.guild.id, { role: role.toString() }), 'success')] });
        }

        return message.channel.send({ embeds: [createEmbed('Usage', await t('join.usage', message.guild.id), 'warning')] });
    }
};
