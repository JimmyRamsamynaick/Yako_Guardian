const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'settings',
    description: 'Affiche le tableau de bord de configuration complet',
    category: 'Configuration',
    aliases: ['conf', 'dashboard', 'config'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && message.author.id !== message.guild.ownerId) {
             return message.channel.send({ embeds: [createEmbed(
                 await t('common.admin_only', message.guild.id),
                 '',
                 'error'
             )] });
        }

        const config = await getGuildConfig(message.guild.id);
        const prefix = config.prefix || client.config.prefix;
        const bool = (b) => b ? "✅" : "❌";

        // General
        const general = [
            `**Prefix:** \`${prefix}\``,
            `**Lang:** \`${config.language || 'fr'}\``,
            `**Public:** ${bool(config.public?.enabled)}`,
            `**AutoPublish:** ${bool(config.autoPublish)}`
        ].join('\n');

        // Moderation
        const mod = [
            `**Timeout:** ${bool(config.moderation?.timeoutEnabled)}`,
            `**MuteRole:** ${config.moderation?.muteRole ? `<@&${config.moderation.muteRole}>` : 'Non défini'}`,
            `**ClearLimit:** \`${config.moderation?.clearLimit || 100}\``,
            `**AntiSpam:** ${bool(config.moderation?.antispam?.enabled)}`,
            `**AntiLink:** ${bool(config.moderation?.antilink?.enabled)}`,
            `**MassMention:** ${bool(config.moderation?.massmention?.enabled)}`,
            `**BadWords:** ${bool(config.moderation?.badwords?.enabled)}`
        ].join('\n');

        // Logs
        const logsObj = config.logs || {};
        const logs = [
            `**Mod:** ${bool(logsObj.mod?.enabled)} ${logsObj.mod?.channelId ? `<#${logsObj.mod.channelId}>` : ''}`,
            `**Message:** ${bool(logsObj.message?.enabled)} ${logsObj.message?.channelId ? `<#${logsObj.message.channelId}>` : ''}`,
            `**Voice:** ${bool(logsObj.voice?.enabled)} ${logsObj.voice?.channelId ? `<#${logsObj.voice.channelId}>` : ''}`,
            `**Boost:** ${bool(logsObj.boost?.enabled)} ${logsObj.boost?.channelId ? `<#${logsObj.boost.channelId}>` : ''}`,
            `**Role:** ${bool(logsObj.role?.enabled)} ${logsObj.role?.channelId ? `<#${logsObj.role.channelId}>` : ''}`,
            `**Raid:** ${bool(logsObj.raid?.enabled)} ${logsObj.raid?.channelId ? `<#${logsObj.raid.channelId}>` : ''}`
        ].join('\n');

        // Community / Other
        const other = [
            `**Welcome:** ${bool(config.welcome?.enabled)}`,
            `**Goodbye:** ${bool(config.goodbye?.enabled)}`,
            `**Suggestion:** ${bool(config.suggestion?.enabled)}`,
            `**Soutien:** ${bool(config.soutien?.enabled)}`
        ].join('\n');

        const embed = createEmbed(await t('settings.title', message.guild.id, { guild: message.guild.name }), '', 'default')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: await t('settings.category_general', message.guild.id), value: general, inline: true },
                { name: await t('settings.category_moderation', message.guild.id), value: mod, inline: true },
                { name: await t('settings.category_logs', message.guild.id), value: logs, inline: true },
                { name: 'Communauté', value: other, inline: true }
            )
            .setFooter({ text: await t('settings.footer', message.guild.id), iconURL: message.author.displayAvatarURL() });

        return message.channel.send({ embeds: [embed] });
    }
};
