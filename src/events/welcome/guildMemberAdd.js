const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const joinFloodMap = new Map(); // guildId -> [timestamps]

module.exports = {
    name: 'guildMemberAdd',
    async execute(client, member) {
        // Small delay to ensure we don't welcome raids/kicked users immediately
        await new Promise(r => setTimeout(r, 1000));
        try {
            // Check if member is still in guild (fetched fresh)
            const freshMember = await member.guild.members.fetch(member.id).catch(() => null);
            if (!freshMember) return;

            const config = await getGuildConfig(member.guild.id);
            if (!config) return;

            // 1. AntiBot
            if (config.security?.antibot && member.user.bot) {
                try {
                    await member.kick('Anti-Bot System');
                } catch(e) {
                    console.log(`Failed to kick bot ${member.user.tag}: ${e.message}`);
                }
                return;
            }

            // 2. AntiFlood
            if (config.security?.antiflood?.enabled) {
                const now = Date.now();
                const limit = config.security.antiflood.limit || 5;
                const time = config.security.antiflood.time || 10000;
                
                let joins = joinFloodMap.get(member.guild.id) || [];
                joins = joins.filter(t => now - t < time);
                joins.push(now);
                joinFloodMap.set(member.guild.id, joins);

                if (joins.length > limit) {
                    try {
                        await member.kick('Anti-Flood Join System');
                    } catch(e) {}
                    return;
                }
            }

            // 3. Captcha
            if (config.security?.captcha?.enabled) {
                const bypass = config.security.captcha.bypassRoles || [];
                // If member managed to get a role (e.g. from other bots), check bypass
                if (member.roles.cache.some(r => bypass.includes(r.id))) {
                    // Bypass Captcha -> Proceed to Welcome/Autorole
                } else {
                    const diff = config.security.captcha.difficulty || 'medium';
                    try {
                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`captcha_start_${member.guild.id}_${diff}`)
                                .setLabel('Vérifier / Verify')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('🛡️')
                        );
                        
                        await member.send({
                            content: `**${member.guild.name}**: Veuillez compléter le captcha pour accéder au serveur.\nPlease complete the captcha to access the server.`,
                            components: [row]
                        });
                    } catch(e) {
                        // If DM fails, maybe notify in welcome channel if configured?
                        // For now, silent fail implies user cannot verify.
                    }
                    return; // Stop here, do not give autorole or welcome yet
                }
            }

            // 4. Welcome Process (Standard or Post-Bypass)
            
            // Welcome Channel
            if (config.welcome?.enabled && config.welcome.channelId) {
                const channel = member.guild.channels.cache.get(config.welcome.channelId);
                if (channel && channel.isTextBased()) {
                    let message = config.welcome.message || await t('welcome.default_message', member.guild.id);
                    message = message
                        .replace(/{user}/g, member.toString())
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{count}/g, member.guild.memberCount.toString());
                    
                    await channel.send({ content: message }).catch(() => {});
                }
            }

            // Welcome DM
            if (config.welcome?.dm) {
                try {
                    let message = config.welcome.message || `Bienvenue sur ${member.guild.name} !`;
                    message = message
                        .replace(/{user}/g, member.toString())
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{count}/g, member.guild.memberCount.toString());
                    
                    await member.send(message);
                } catch(e) {}
            }

            // Autorole
            if (config.automations?.autorole?.enabled) {
                // Member Role
                if (!member.user.bot && config.automations.autorole.roleId) {
                    const role = member.guild.roles.cache.get(config.automations.autorole.roleId);
                    if (role && role.editable) {
                        await member.roles.add(role).catch(() => {});
                    }
                }
                // Bot Role
                if (member.user.bot && config.automations.autorole.botRoleId) {
                    const role = member.guild.roles.cache.get(config.automations.autorole.botRoleId);
                    if (role && role.editable) {
                        await member.roles.add(role).catch(() => {});
                    }
                }
            }
            // Legacy/Welcome Autorole (fallback)
            else if (config.welcome?.roleId) {
                const role = member.guild.roles.cache.get(config.welcome.roleId);
                if (role && role.editable) {
                    await member.roles.add(role).catch(() => {});
                }
            }

        } catch (error) {
            console.error(`Error in welcome event for guild ${member.guild.id}:`, error);
        }
    }
};
