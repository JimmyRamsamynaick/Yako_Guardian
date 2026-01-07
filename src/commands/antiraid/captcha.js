const { PermissionsBitField, ChannelType } = require('discord.js');
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
        
        // +captcha isolation
        if (sub === 'isolation') {
            const action = args[1] ? args[1].toLowerCase() : null;

            // STATUS CHECK
            if (!action) {
                const isEnabled = config.security?.captcha?.isolationEnabled || false;
                return message.channel.send({ embeds: [createEmbed(
                    await t('captcha.isolation_status_title', message.guild.id),
                    await t('captcha.isolation_status_desc', message.guild.id, { 
                        status: isEnabled ? '✅ ON' : '❌ OFF',
                        prefix: config.prefix || '+'
                    }),
                    'info'
                )] });
            }

            // DISABLE
            if (action === 'off') {
                 if (!config.security) config.security = {};
                 if (!config.security.captcha) config.security.captcha = {};
                 config.security.captcha.isolationEnabled = false;
                 await config.save();
                 return message.channel.send({ embeds: [createEmbed(
                     await t('captcha.isolation_disabled', message.guild.id),
                     '',
                     'success'
                 )] });
            }

            // ENABLE (AND SETUP)
            if (action === 'on') {
                const processingMsg = await message.channel.send({ embeds: [createEmbed(
                    await t('captcha.isolation_processing', message.guild.id),
                    '',
                    'info'
                )] });

                try {
                    // Set enabled = true
                    if (!config.security) config.security = {};
                    if (!config.security.captcha) config.security.captcha = {};
                    config.security.captcha.isolationEnabled = true;
                    // We save later after getting roleId
                    
                    // 1. Create or find "Unverified" role
                    let unverifiedRole;
                    if (config.security?.captcha?.unverifiedRoleId) {
                        unverifiedRole = message.guild.roles.cache.get(config.security.captcha.unverifiedRoleId);
                    }
                    
                    if (!unverifiedRole) {
                        // Check if role exists by name to avoid dupes
                        unverifiedRole = message.guild.roles.cache.find(r => r.name === 'Unverified');
                        
                        if (!unverifiedRole) {
                             unverifiedRole = await message.guild.roles.create({
                                name: 'Unverified',
                                color: '#808080',
                                reason: 'Captcha Isolation System',
                                permissions: [] // No permissions
                            });
                        }
                        
                        config.security.captcha.unverifiedRoleId = unverifiedRole.id;
                        await config.save();
                    } else {
                        await config.save();
                    }

                    // 2. Deny ViewChannel on ALL Channels (Categories and Children)
                    const allChannels = message.guild.channels.cache.filter(c => 
                        c.type !== ChannelType.GuildDirectory && 
                        !c.isThread()
                    );
                    let updatedCount = 0;

                    for (const [id, channel] of allChannels) {
                        try {
                            await channel.permissionOverwrites.edit(unverifiedRole, {
                                ViewChannel: false,
                                SendMessages: false,
                                Connect: false
                            }, { reason: 'Captcha Isolation Setup' });
                            updatedCount++;
                        } catch (e) {
                            console.warn(`Failed to update channel ${channel.name}: ${e.message}`);
                        }
                    }
                    
                    // 3. Setup Captcha Channel Permit
                    if (config.security?.captcha?.channelId) {
                        const captchaChannel = message.guild.channels.cache.get(config.security.captcha.channelId);
                        if (captchaChannel) {
                            await captchaChannel.permissionOverwrites.edit(unverifiedRole, {
                                ViewChannel: true,
                                SendMessages: true,
                                ReadMessageHistory: true
                            }, { reason: 'Captcha Channel Access' });
                        }
                    }

                    const embed = createEmbed(
                        await t('captcha.isolation_success_title', message.guild.id),
                        await t('captcha.isolation_info_desc', message.guild.id),
                        'success'
                    ).addFields(
                        { name: await t('captcha.isolation_role_label', message.guild.id), value: unverifiedRole.toString(), inline: true },
                        { name: await t('captcha.isolation_cats_label', message.guild.id), value: `${updatedCount}`, inline: true }
                    );

                    await processingMsg.edit({ 
                        content: unverifiedRole.toString(),
                        embeds: [embed] 
                    });

                } catch (error) {
                    console.error(error);
                    await processingMsg.edit({ embeds: [createEmbed(
                        await t('common.error', message.guild.id),
                        error.message,
                        'error'
                    )] });
                }
                return;
            }
        }

        return message.channel.send({ embeds: [createEmbed(
            await t('captcha.usage', message.guild.id),
            '',
            'info'
        )] });
    }
};
