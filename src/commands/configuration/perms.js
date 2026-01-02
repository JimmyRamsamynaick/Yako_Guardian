const { sendV2Message } = require('../../utils/componentUtils');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'perms',
    description: 'Gère le système de permissions par niveaux (1-5)',
    category: 'Configuration',
    aliases: ['perm'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('perms.permission', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        const prefix = config.prefix || client.config.prefix;
        
        // Ensure default structure exists if old config
        if (!config.permissionLevels) {
            config.permissionLevels = { '1': [], '2': [], '3': [], '4': [], '5': [] };
        }
        
        const sub = args[0]?.toLowerCase();

        if (!sub) {
            // List View
            let content = "";
            for (let i = 1; i <= 5; i++) {
                const lvl = i.toString();
                const ids = config.permissionLevels[lvl] || [];
                const roles = [];
                const users = [];

                ids.forEach(id => {
                    const role = message.guild.roles.cache.get(id);
                    if (role) roles.push(`<@&${id}>`);
                    else users.push(`<@${id}>`);
                });

                const list = [...roles, ...users].join(', ') || await t('perms.none', message.guild.id);
                content += `**Perm${i}**\n${list}\n`;
            }

            content += await t('perms.footer', message.guild.id, { prefix });
            return sendV2Message(client, message.channel.id, content, []);
        }

        if (sub === 'set') {
            const level = args[1];
            const target = args[2];

            if (!level || !['1', '2', '3', '4', '5'].includes(level) || !target) {
                return sendV2Message(client, message.channel.id, await t('perms.usage_set', message.guild.id, { prefix }), []);
            }

            let id;
            if (message.mentions.roles.size > 0) id = message.mentions.roles.first().id;
            else if (message.mentions.users.size > 0) id = message.mentions.users.first().id;
            else id = target.replace(/[<@&>]/g, '');

            // Add ID to level
            if (!config.permissionLevels[level]) config.permissionLevels[level] = [];
            
            // Check if already exists in this level
            if (!config.permissionLevels[level].includes(id)) {
                config.permissionLevels[level].push(id);
                config.markModified('permissionLevels');
                await config.save();
            }

            const targetName = message.guild.roles.cache.get(id)?.name || 'Utilisateur';
            return sendV2Message(client, message.channel.id, await t('perms.added', message.guild.id, { target: targetName, level }), []);
        }

        if (sub === 'del' || sub === 'remove') {
            const level = args[1];
            const target = args[2];

            if (!level || !['1', '2', '3', '4', '5'].includes(level) || !target) {
                return sendV2Message(client, message.channel.id, await t('perms.usage_del', message.guild.id, { prefix }), []);
            }

            let id;
            if (message.mentions.roles.size > 0) id = message.mentions.roles.first().id;
            else if (message.mentions.users.size > 0) id = message.mentions.users.first().id;
            else id = target.replace(/[<@&>]/g, '');

            if (config.permissionLevels[level] && config.permissionLevels[level].includes(id)) {
                config.permissionLevels[level] = config.permissionLevels[level].filter(x => x !== id);
                config.markModified('permissionLevels');
                await config.save();
            }

            return sendV2Message(client, message.channel.id, await t('perms.removed', message.guild.id, { level }), []);
        }

        if (sub === 'reset' || sub === 'clear') {
             config.permissionLevels = { '1': [], '2': [], '3': [], '4': [], '5': [] };
             config.markModified('permissionLevels');
             await config.save();
             return sendV2Message(client, message.channel.id, await t('perms.reset_success', message.guild.id), []);
        }
        
        return sendV2Message(client, message.channel.id, await t('perms.unknown_sub', message.guild.id, { prefix }), []);
    }
};