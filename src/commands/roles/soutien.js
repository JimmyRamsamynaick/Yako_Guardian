const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'soutien',
    description: 'Configure le rôle de soutien (statut)',
    category: 'Roles',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.soutien.permission', message.guild.id), '', 'error')] });
        }

        const sub = args[0]?.toLowerCase();
        // +soutien role <role>
        // +soutien status <texte>
        // +soutien on/off
        // +soutien info

        const config = await getGuildConfig(message.guild.id);
        const soutien = config.soutien || { enabled: false };

        if (!sub || sub === 'info') {
            const content = await t('roles.soutien.info', message.guild.id, {
                enabled: soutien.enabled ? '✅' : '❌',
                role: soutien.roleId ? `<@&${soutien.roleId}>` : await t('common.not_defined', message.guild.id),
                status: soutien.statusText || await t('common.not_defined', message.guild.id)
            });
            return message.channel.send({ embeds: [createEmbed(await t('roles.soutien.title', message.guild.id), content, 'info')] });
        }

        if (sub === 'on') {
            config.soutien.enabled = true;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('roles.soutien.enabled', message.guild.id), '', 'success')] });
        }
        if (sub === 'off') {
            config.soutien.enabled = false;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('roles.soutien.disabled', message.guild.id), '', 'success')] });
        }

        if (sub === 'role') {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
            if (!role) return message.channel.send({ embeds: [createEmbed(await t('roles.soutien.invalid_role', message.guild.id), '', 'error')] });
            config.soutien.roleId = role.id;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('roles.soutien.role_set', message.guild.id, { role: role.name }), '', 'success')] });
        }

        if (sub === 'status' || sub === 'statut') {
            const text = args.slice(1).join(' ');
            if (!text) return message.channel.send({ embeds: [createEmbed(await t('roles.soutien.invalid_text', message.guild.id), '', 'error')] });
            config.soutien.statusText = text;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('roles.soutien.status_set', message.guild.id, { text }), '', 'success')] });
        }
    }
};
