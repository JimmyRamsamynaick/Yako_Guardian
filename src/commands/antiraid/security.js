const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const GlobalSettings = require('../../database/models/GlobalSettings');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'security',
    description: 'Affiche le statut de sécurité du serveur',
    category: 'Antiraid',
    aliases: ['secur'],
    usage: 'security status | secur invite <on/off> (Owner)',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();

        // OWNER COMMAND: +secur invite <on/off>
        if (sub === 'invite' && await isBotOwner(message.author.id)) {
            const state = args[1]?.toLowerCase();
            if (!['on', 'off'].includes(state)) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('servers.usage_secur', message.guild.id),
                    '',
                    'info'
                )] });
            }
            
            await GlobalSettings.findOneAndUpdate(
                { clientId: client.user.id },
                { securInvite: (state === 'on') },
                { upsert: true, new: true }
            );

            const statusStr = (state === 'on') ? await t('common.enabled', message.guild.id) : await t('common.disabled', message.guild.id);
            return message.channel.send({ embeds: [createEmbed(
                await t('servers.secur_status', message.guild.id, { status: statusStr }),
                '',
                'success'
            )] });
        }
        
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('common.admin_only', message.guild.id),
                '',
                'error'
            )] });
        }

        const config = await getGuildConfig(message.guild.id);

        if (sub === 'status' || !sub) {
            const sec = config.security || {};
            const cap = sec.captcha || {};
            const flood = sec.antiflood || {};

            const bool = (b) => b ? "✅ ON" : "❌ OFF";
            
            const embed = createEmbed(
                await t('security.status_title', message.guild.id),
                '',
                'default'
            )
                .addFields(
                    { 
                        name: await t('security.captcha_title', message.guild.id), 
                        value: await t('security.captcha_status', message.guild.id, { 
                            state: bool(cap.enabled), 
                            diff: cap.difficulty || 'medium', 
                            role: cap.roleId ? `<@&${cap.roleId}>` : 'None',
                            bypass: cap.bypassRoles?.length || 0
                        }), 
                        inline: true 
                    },
                    { 
                        name: await t('security.antibot_title', message.guild.id), 
                        value: await t('security.antibot_status', message.guild.id, { state: bool(sec.antibot) }), 
                        inline: true 
                    },
                    { 
                        name: await t('security.antiflood_title', message.guild.id), 
                        value: await t('security.antiflood_status', message.guild.id, { 
                            state: bool(flood.enabled), 
                            limit: flood.limit || 5, 
                            time: (flood.time || 10000) / 1000 
                        }), 
                        inline: true 
                    }
                );

            return message.channel.send({ embeds: [embed] });
        }
    }
};
