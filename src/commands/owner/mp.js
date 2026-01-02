const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const GlobalSettings = require('../../database/models/GlobalSettings');
const { EmbedBuilder } = require('discord.js');
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
            const sub = args[0];

            // +mp settings
            if (sub === 'settings') {
                // Toggle global MP reception (Modmail)
                const settings = await GlobalSettings.findOne({ clientId: client.user.id });
                const currentStatus = settings?.mpEnabled ?? true; // Default true

                // Simple toggle for now, or maybe a menu later
                // If user provided on/off
                if (args[1]) {
                    const newState = args[1].toLowerCase() === 'on';
                    await GlobalSettings.findOneAndUpdate(
                        { clientId: client.user.id },
                        { mpEnabled: newState },
                        { upsert: true, new: true }
                    );
                    return sendV2Message(client, message.channel.id, await t('mp.mp_settings_success', message.guild.id, { status: newState ? 'ACTIVÉE' : 'DÉSACTIVÉE' }), []);
                }

                return sendV2Message(client, message.channel.id, await t('mp.mp_settings_status', message.guild.id, { status: currentStatus ? 'ON' : 'OFF' }), []);
            }

            // +mp <user> <message>
            const targetId = args[0];
            const content = args.slice(1).join(' ');

            if (!targetId || !content) {
                return sendV2Message(client, message.channel.id, await t('mp.usage_mp', message.guild.id), []);
            }

            const userId = targetId.replace(/[<@!>]/g, '');
            const user = await client.users.fetch(userId).catch(() => null);

            if (!user) {
                return sendV2Message(client, message.channel.id, await t('mp.user_not_found', message.guild.id), []);
            }

            try {
                const embed = new EmbedBuilder()
                    .setAuthor({ name: await t('mp.mp_author', message.guild.id, { botName: client.user.username }), iconURL: client.user.displayAvatarURL() })
                    .setDescription(content)
                    .setColor('#0099ff')
                    .setTimestamp();

                await user.send({ embeds: [embed] });
                return sendV2Message(client, message.channel.id, await t('mp.mp_sent', message.guild.id, { user: user.tag }), []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, await t('mp.mp_error', message.guild.id, { error: e.message }), []);
            }
        }

        // --- +DISCUSSION ---
        if (commandName === 'discussion') {
            // Discussion inter-serveur via le bot
            // This interprets as: "Connect to a user's DM session"
            
            const targetId = args[0];
            if (!targetId) {
                return sendV2Message(client, message.channel.id, await t('mp.usage_discussion', message.guild.id), []);
            }
            
            const userId = targetId.replace(/[<@!>]/g, '');
            const user = await client.users.fetch(userId).catch(() => null);
            
            if (!user) return sendV2Message(client, message.channel.id, await t('mp.user_not_found', message.guild.id), []);

            // Check if there's already a ticket? 
            // Or just inform the owner they can reply via +mp?
            // "Discussion inter-serveur" might imply creating a channel bound to this user.
            
            // For now, let's just show info about the user and their mutual servers
            const mutualGuilds = [];
            for (const [id, guild] of client.guilds.cache) {
                if (guild.members.cache.has(userId)) mutualGuilds.push(guild.name);
            }

            const embed = new EmbedBuilder()
                .setTitle(await t('mp.discussion_title', message.guild.id, { user: user.tag }))
                .setThumbnail(user.displayAvatarURL())
                .addFields(
                    { name: await t('mp.discussion_fields_id', message.guild.id), value: user.id, inline: true },
                    { name: await t('mp.discussion_fields_created', message.guild.id), value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: await t('mp.discussion_fields_mutuals', message.guild.id), value: mutualGuilds.join(', ') || await t('mp.discussion_none', message.guild.id), inline: false }
                )
                .setDescription(await t('mp.discussion_desc', message.guild.id))
                .setColor('#2b2d31');

            return sendV2Message(client, message.channel.id, "", [], [embed]);
        }
    }
};
