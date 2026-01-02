const { createEmbed } = require('../../utils/design');
const { isBotOwner } = require('../../utils/ownerUtils');
const GlobalSettings = require('../../database/models/GlobalSettings');
const MPBlock = require('../../database/models/MPBlock');
const MPLog = require('../../database/models/MPLog');

const { t } = require('../../utils/i18n');

module.exports = {
    name: 'mp',
    description: 'Gestion des messages privés et interactions',
    category: 'Owner',
    aliases: [],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        
        // --- +MP COMMANDS ---
        if (commandName === 'mp') {
            const sub = args[0]?.toLowerCase();

            // +mp settings
            if (sub === 'settings') {
                const settings = await GlobalSettings.findOne({ clientId: client.user.id });
                
                const mpEnabled = settings?.mpEnabled ?? true;
                const autoReply = settings?.mpAutoReplyEnabled ?? false;
                const autoReplyMsg = settings?.mpAutoReplyMessage ?? 'Je suis un bot, je ne lis pas les MP.';

                const embed = createEmbed(await t('mp.settings_title', message.guild.id), '', 'info')
                    .addFields(
                        { name: await t('mp.setting_enabled', message.guild.id), value: mpEnabled ? '✅ ON' : '❌ OFF', inline: true },
                        { name: await t('mp.setting_autoreply', message.guild.id), value: autoReply ? '✅ ON' : '❌ OFF', inline: true },
                        { name: await t('mp.setting_message', message.guild.id), value: `\`${autoReplyMsg}\``, inline: false }
                    );
                
                return message.channel.send({ embeds: [embed] });
            }

            // +mp blacklist <add/del> <user>
            if (sub === 'blacklist') {
                const action = args[1]?.toLowerCase();
                const targetId = args[2]?.replace(/[<@!>]/g, '');

                if (!['add', 'del'].includes(action) || !targetId) {
                     return message.channel.send({ embeds: [createEmbed(
                         await t('mp.usage_blacklist', message.guild.id),
                         '',
                         'error'
                     )] });
                }

                if (action === 'add') {
                    await MPBlock.create({ userId: targetId, addedAt: new Date() }).catch(() => {});
                    return message.channel.send({ embeds: [createEmbed(
                        await t('mp.blacklist_added', message.guild.id, { user: targetId }),
                        '',
                        'success'
                    )] });
                } else {
                    await MPBlock.deleteOne({ userId: targetId });
                    return message.channel.send({ embeds: [createEmbed(
                        await t('mp.blacklist_removed', message.guild.id, { user: targetId }),
                        '',
                        'success'
                    )] });
                }
            }

            // +mp autoreply <on/off> [message]
            if (sub === 'autoreply') {
                const state = args[1]?.toLowerCase();
                if (!['on', 'off'].includes(state)) {
                     return message.channel.send({ embeds: [createEmbed(
                         await t('mp.usage_autoreply', message.guild.id),
                         '',
                         'error'
                     )] });
                }

                const msg = args.slice(2).join(' ');
                const update = { mpAutoReplyEnabled: state === 'on' };
                if (msg) update.mpAutoReplyMessage = msg;

                await GlobalSettings.findOneAndUpdate({ clientId: client.user.id }, update, { upsert: true });
                return message.channel.send({ embeds: [createEmbed(
                    await t('mp.autoreply_updated', message.guild.id, { state: state.toUpperCase() }),
                    '',
                    'success'
                )] });
            }

            // +mp history <user>
            if (sub === 'history') {
                const targetId = args[1]?.replace(/[<@!>]/g, '');
                if (!targetId) return message.channel.send({ embeds: [createEmbed(
                    await t('mp.usage_history', message.guild.id),
                    '',
                    'error'
                )] });

                const logs = await MPLog.find({ userId: targetId }).sort({ timestamp: -1 }).limit(10);
                if (logs.length === 0) return message.channel.send({ embeds: [createEmbed(
                    await t('mp.history_empty', message.guild.id),
                    '',
                    'info'
                )] });

                const description = logs.map(l => {
                    const arrow = l.direction === 'in' ? '📥' : '📤';
                    const time = `<t:${Math.floor(l.timestamp.getTime() / 1000)}:R>`;
                    return `${arrow} **${time}** : ${l.content.substring(0, 50)}${l.content.length > 50 ? '...' : ''}`;
                }).join('\n');

                const embed = createEmbed(
                    await t('mp.history_title', message.guild.id, { user: targetId }),
                    description,
                    'info'
                )
                    .setColor('#2b2d31');

                return message.channel.send({ embeds: [embed] });
            }

            // +mp <user> <message> (Default behavior)
            const targetId = args[0];
            const content = args.slice(1).join(' ');

            if (!targetId || !content) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('mp.usage_mp', message.guild.id),
                    '',
                    'info'
                )] });
            }

            const userId = targetId.replace(/[<@!>]/g, '');
            const user = await client.users.fetch(userId).catch(() => null);

            if (!user) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('mp.user_not_found', message.guild.id),
                    '',
                    'error'
                )] });
            }

            try {
                const embed = createEmbed('', content, 'info')
                    .setAuthor({ name: await t('mp.mp_author', message.guild.id, { botName: client.user.username }), iconURL: client.user.displayAvatarURL() })
                    .setColor('#0099ff')
                    .setTimestamp();

                await user.send({ embeds: [embed] });
                
                // Log
                await MPLog.create({ userId: user.id, content: content, direction: 'out' });

                return message.channel.send({ embeds: [createEmbed(
                    await t('mp.mp_sent', message.guild.id, { user: user.tag }),
                    '',
                    'success'
                )] });
            } catch (e) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('mp.mp_error', message.guild.id, { error: e.message }),
                    '',
                    'error'
                )] });
            }
        }
        
        // --- +DISCUSSION ---
        if (commandName === 'discussion') {
            // Discussion inter-serveur via le bot
            // This interprets as: "Connect to a user's DM session"
            
            const targetId = args[0];
            if (!targetId) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('mp.usage_discussion', message.guild.id),
                    '',
                    'error'
                )] });
            }
            
            const userId = targetId.replace(/[<@!>]/g, '');
            const user = await client.users.fetch(userId).catch(() => null);
            
            if (!user) return message.channel.send({ embeds: [createEmbed(
                await t('mp.user_not_found', message.guild.id),
                '',
                'error'
            )] });
            
            const mutualGuilds = [];
            for (const [id, guild] of client.guilds.cache) {
                if (guild.members.cache.has(userId)) mutualGuilds.push(guild.name);
            }

            const embed = createEmbed(await t('mp.discussion_title', message.guild.id, { user: user.tag }), await t('mp.discussion_desc', message.guild.id), 'info')
                .setThumbnail(user.displayAvatarURL())
                .addFields(
                    { name: await t('mp.discussion_fields_id', message.guild.id), value: user.id, inline: true },
                    { name: await t('mp.discussion_fields_created', message.guild.id), value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: await t('mp.discussion_fields_mutuals', message.guild.id), value: mutualGuilds.join(', ') || await t('mp.discussion_none', message.guild.id), inline: false }
                );

            return message.channel.send({ embeds: [embed] });
        }
    }
};
