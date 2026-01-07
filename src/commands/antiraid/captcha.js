const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'captcha',
    description: 'Configure le système de Captcha',
    category: 'Antiraid',
    usage: 'captcha <difficulty/role/bypass>',
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

        // Show menu if no args or invalid args (implied by falling through)
        if (!sub) {
            if (!config.security) config.security = {};
            if (!config.security.captcha) config.security.captcha = {};

            const status = config.security.captcha.enabled ? '✅ ON' : '❌ OFF';
            const diff = config.security.captcha.difficulty || 'medium';
            const channelId = config.security.captcha.channelId;
            const channel = channelId ? `<#${channelId}>` : 'Aucun (DM)';
            
            const description = (await t('captcha.menu_description', message.guild.id))
                .replace('{status}', status)
                .replace('{difficulty}', diff)
                .replace('{channel}', channel);

            return message.channel.send({ embeds: [createEmbed(
                await t('captcha.menu_title', message.guild.id),
                description,
                'info'
            )] });
        }

        // +captcha difficulty <easy/medium/hard>
        if (sub === 'difficulty' || sub === 'diff') {
            const level = args[1]?.toLowerCase();
            if (!['easy', 'medium', 'hard'].includes(level)) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('captcha.diff_usage', message.guild.id),
                    '',
                    'info'
                )] });
            }
            
            if (!config.security) config.security = {};
            if (!config.security.captcha) config.security.captcha = {};
            config.security.captcha.difficulty = level;
            // Auto-enable if setting diff? Maybe not, keep explicit enable separate or implied? 
            // Usually setting a config implies enabling or at least prepping. 
            // But let's stick to just config.
            await config.save();
            return message.channel.send({ embeds: [createEmbed(
                await t('captcha.diff_success', message.guild.id, { diff: level }),
                '',
                'success'
            )] });
        }

        // +captcha role <role>
        if (sub === 'role') {
            const roleId = args[1]?.replace(/[<@&>]/g, '');
            if (!roleId) return message.channel.send({ embeds: [createEmbed(
                await t('captcha.role_usage', message.guild.id),
                '',
                'info'
            )] });
            
            const role = message.guild.roles.cache.get(roleId);
            if (!role) return message.channel.send({ embeds: [createEmbed(
                await t('common.role_not_found', message.guild.id),
                '',
                'error'
            )] });

            if (!config.security) config.security = {};
            if (!config.security.captcha) config.security.captcha = {};
            config.security.captcha.roleId = role.id;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(
                await t('captcha.role_success', message.guild.id, { role: role.toString() }),
                '',
                'success'
            )] });
        }

        // +captcha channel <channel>
        if (sub === 'channel') {
            const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
            
            if (!channel) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('captcha.channel_usage', message.guild.id), // You might need to add this key
                    '',
                    'info'
                )] });
            }

            if (!config.security) config.security = {};
            if (!config.security.captcha) config.security.captcha = {};
            config.security.captcha.channelId = channel.id;
            await config.save();
            
            return message.channel.send({ embeds: [createEmbed(
                await t('captcha.channel_success', message.guild.id, { channel: channel.toString() }), // You might need to add this key
                '',
                'success'
            )] });
        }

        // +captcha bypass <add/del> <role>
        if (sub === 'bypass') {
            const action = args[1]?.toLowerCase();
            const roleId = args[2]?.replace(/[<@&>]/g, '');
            
            if (!['add', 'del'].includes(action) || !roleId) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('captcha.bypass_usage', message.guild.id),
                    '',
                    'info'
                )] });
            }
            
            const role = message.guild.roles.cache.get(roleId);
            if (!role) return message.channel.send({ embeds: [createEmbed(
                await t('common.role_not_found', message.guild.id),
                '',
                'error'
            )] });

            if (!config.security) config.security = {};
            if (!config.security.captcha) config.security.captcha = {};
            if (!config.security.captcha.bypassRoles) config.security.captcha.bypassRoles = [];

            if (action === 'add') {
                if (!config.security.captcha.bypassRoles.includes(role.id)) {
                    config.security.captcha.bypassRoles.push(role.id);
                    await config.save();
                }
                return message.channel.send({ embeds: [createEmbed(
                    await t('captcha.bypass_added', message.guild.id, { role: role.toString() }),
                    '',
                    'success'
                )] });
            } else {
                config.security.captcha.bypassRoles = config.security.captcha.bypassRoles.filter(id => id !== role.id);
                await config.save();
                return message.channel.send({ embeds: [createEmbed(
                    await t('captcha.bypass_removed', message.guild.id, { role: role.toString() }),
                    '',
                    'success'
                )] });
            }
        }
        
        // Toggle on/off if just +captcha? Or show usage?
        // User asked for "+captcha" separately.
        // I'll make +captcha toggle enabled state if no args, OR show status.
        // Let's make it toggle to be quick.
        if (!sub) {
             if (!config.security) config.security = {};
             if (!config.security.captcha) config.security.captcha = {};
             
             const newState = !config.security.captcha.enabled;
             config.security.captcha.enabled = newState;
             await config.save();
             
             const stateStr = newState ? await t('common.on', message.guild.id) : await t('common.off', message.guild.id);
             return message.channel.send({ embeds: [createEmbed(
                `✅ Captcha: **${stateStr}**`,
                '',
                newState ? 'success' : 'error'
             )] });
        }

        return message.channel.send({ embeds: [createEmbed(
            await t('captcha.usage', message.guild.id),
            '',
            'info'
        )] });
    }
};
