const { ChannelType, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const ActiveTicket = require('../../database/models/ActiveTicket');
const GuildConfig = require('../../database/models/GuildConfig');
const { createTicket } = require('../../utils/modmailUtils');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'messageCreate',
    async execute(client, message) {
        if (message.author.bot) return;

        // --- DM HANDLING (User -> Bot) ---
        if (message.channel.type === ChannelType.DM) {
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

            // No active ticket: Find mutual guilds with modmail ON
            const mutualGuilds = [];
            for (const [id, guild] of client.guilds.cache) {
                const member = await guild.members.fetch(message.author.id).catch(() => null);
                if (member) {
                    const config = await getGuildConfig(id);
                    if (config && config.modmail && config.modmail.enabled) {
                        mutualGuilds.push(guild);
                    }
                }
            }

            if (mutualGuilds.length === 0) {
                return message.channel.send({ embeds: [createEmbed(await t('modmail.handler.no_common_guild', 'dm'), '', 'error')] });
            }

            if (mutualGuilds.length === 1) {
                // Create ticket directly
                try {
                    await createTicket(client, message.author, mutualGuilds[0], message.content);
                    message.channel.send({ embeds: [createEmbed(await t('modmail.handler.ticket_opened', 'dm', { server: mutualGuilds[0].name }), '', 'success')] });
                } catch (e) {
                    message.channel.send({ embeds: [createEmbed(await t('modmail.handler.ticket_create_error', 'dm', { error: e.message }), '', 'error')] });
                }
            } else {
                // Ask to choose
                // We need to resolve descriptions before building the menu
                const options = await Promise.all(mutualGuilds.map(async g => ({
                    label: g.name,
                    value: g.id,
                    description: await t('modmail.handler.choose_server_desc', 'dm', { server: g.name })
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
