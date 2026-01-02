const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');

const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'soutien',
    description: 'Configure le rôle de soutien (statut)',
    category: 'Menus & Rôles',
    async execute(client, message, args) { // Added client
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('roles.soutien.permission', message.guild.id), []);
        }

        const sub = args[0]?.toLowerCase();
        // +soutien role <role>
        // +soutien status <texte>
        // +soutien on/off
        // +soutien info

        const config = await getGuildConfig(message.guild.id);
        const soutien = config.soutien || { enabled: false };

        if (!sub || sub === 'info') {
            return sendV2Message(client, message.channel.id, await t('roles.soutien.info', message.guild.id, {
                enabled: soutien.enabled ? '✅' : '❌',
                role: soutien.roleId ? `<@&${soutien.roleId}>` : 'Non défini',
                status: soutien.statusText || 'Non défini'
            }), []);
        }

        if (sub === 'on') {
            config.soutien.enabled = true;
            await config.save();
            return sendV2Message(client, message.channel.id, await t('roles.soutien.enabled', message.guild.id), []);
        }
        if (sub === 'off') {
            config.soutien.enabled = false;
            await config.save();
            return sendV2Message(client, message.channel.id, await t('roles.soutien.disabled', message.guild.id), []);
        }

        if (sub === 'role') {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
            if (!role) return sendV2Message(client, message.channel.id, await t('roles.soutien.invalid_role', message.guild.id), []);
            config.soutien.roleId = role.id;
            await config.save();
            return sendV2Message(client, message.channel.id, await t('roles.soutien.role_set', message.guild.id, { role: role.name }), []);
        }

        if (sub === 'status' || sub === 'statut') {
            const text = args.slice(1).join(' ');
            if (!text) return sendV2Message(client, message.channel.id, await t('roles.soutien.invalid_text', message.guild.id), []);
            config.soutien.statusText = text;
            await config.save();
            return sendV2Message(client, message.channel.id, await t('roles.soutien.status_set', message.guild.id, { text }), []);
        }
    }
};
