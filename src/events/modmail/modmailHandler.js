const { ChannelType, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const ActiveTicket = require('../../database/models/ActiveTicket');
const GuildConfig = require('../../database/models/GuildConfig');
const { createTicket } = require('../../utils/modmailUtils');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');
const activeDiscussions = require('../../utils/activeDiscussions');

module.exports = {
    name: 'messageCreate',
    async execute(client, message) {
        if (message.author.bot) return;

        // Trigger git change
        // --- DM HANDLING (User -> Bot) ---
        if (message.channel.type === ChannelType.DM) {
            // Check if user is in an active discussion (Skip modmail/ticket)
            if (activeDiscussions.has(message.author.id)) return;

            // Check for existing active ticket
            const activeTicket = await ActiveTicket.findOne({ userId: message.author.id, closed: false });

            if (activeTicket) {
                // Forward to guild channel
                const guild = client.guilds.cache.get(activeTicket.guildId);
                if (!guild) return message.channel.send({ embeds: [createEmbed(await t('modmail.handler.guild_inaccessible', 'dm'), '', 'error')] });

                const channel = guild.channels.cache.get(activeTicket.channelId);
                if (!channel) {
                    // Channel deleted? Clean up
                    activeTicket.closed = true;
                    await activeTicket.save();
                    return message.channel.send({ embeds: [createEmbed(await t('modmail.handler.ticket_closed', guild.id), '', 'info')] });
                }

                let content = await t('modmail.handler.user_reply', guild.id, { user: message.author.tag, content: message.content });
                if (message.attachments.size > 0) {
                    content += await t('modmail.handler.attachment', guild.id, { url: message.attachments.first().url });
                }

                try {
                    await channel.send({ content });
                    await message.react('✅');
                } catch (e) {
                    message.channel.send({ embeds: [createEmbed(await t('modmail.handler.send_error', guild.id), '', 'error')] });
                }
                return;
            }

            // No active ticket: Find mutual guilds
            const mutualGuilds = [];
            for (const [id, guild] of client.guilds.cache) {
                const member = await guild.members.fetch(message.author.id).catch(() => null);
                if (member) {
                    const config = await getGuildConfig(id);
                    // Check if modmail is fully configured (enabled + category set)
                    const isEnabled = config && config.modmail && config.modmail.enabled && config.modmail.categoryId;
                    mutualGuilds.push({ guild, isEnabled });
                }
            }

            if (mutualGuilds.length === 0) {
                return message.channel.send({ embeds: [createEmbed(await t('modmail.handler.no_common_guild', 'dm'), '', 'error')] });
            }

            if (mutualGuilds.length === 1) {
                const { guild, isEnabled } = mutualGuilds[0];
                
                if (!isEnabled) {
                     return message.channel.send({ embeds: [createEmbed(await t('modmail.not_configured', 'dm'), '', 'error')] });
                }

                // Create ticket directly
                try {
                    await createTicket(client, message.author, guild, message.content);
                    message.channel.send({ embeds: [createEmbed(await t('modmail.handler.ticket_opened', 'dm', { server: guild.name }), '', 'success')] });
                } catch (e) {
                    message.channel.send({ embeds: [createEmbed(await t('modmail.handler.ticket_create_error', 'dm', { error: e.message }), '', 'error')] });
                }
            } else {
                // Ask to choose
                const options = await Promise.all(mutualGuilds.map(async ({ guild, isEnabled }) => ({
                    label: guild.name,
                    value: guild.id,
                    description: isEnabled ? await t('modmail.state_active', 'dm') : await t('modmail.state_inactive', 'dm'),
                    emoji: isEnabled ? '✅' : '❌'
                })));

                const row = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('modmail_select_guild')
                            .setPlaceholder(await t('modmail.handler.choose_server_placeholder', 'dm'))
                            .addOptions(options.slice(0, 25))
                    );

                await message.channel.send({ embeds: [createEmbed(await t('modmail.handler.choose_server', 'dm'), '', 'info')], components: [row] });
            }
            return;
        }

        // --- GUILD CHANNEL HANDLING (Staff -> User) ---
        if (message.guild) {
            // Check if this channel is an active ticket
            const ticket = await ActiveTicket.findOne({ channelId: message.channel.id, closed: false });
            if (!ticket) return;

            // Check if it is a regular ticket (ticketType is 'ticket' OR user is in channel overwrites)
            // This prevents forwarding messages from panel tickets to DM
            if (ticket.ticketType === 'ticket' || message.channel.permissionOverwrites.cache.has(ticket.userId)) return;

            // Ignore commands
            if (message.content.startsWith('+')) return; // Simple check, ideally check actual prefix

            // Forward to User
            const user = await client.users.fetch(ticket.userId).catch(() => null);
            if (!user) {
                return message.channel.send(await t('modmail.handler.user_not_found', message.guild.id));
            }

            let content = await t('modmail.handler.staff_reply', message.guild.id, { server: message.guild.name, content: message.content });
            if (message.attachments.size > 0) {
                content += await t('modmail.handler.attachment', message.guild.id, { url: message.attachments.first().url });
            }

            try {
                await user.send(content);
                await message.react('✅');
            } catch (e) {
                message.channel.send(await t('modmail.handler.dm_send_error', message.guild.id));
            }
        }
    }
};
