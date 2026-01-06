const { createEmbed } = require('../../utils/design');
const { ChannelType } = require('discord.js');
const { t } = require('../../utils/i18n');
const activeDiscussions = require('../../utils/activeDiscussions');

module.exports = {
    name: 'discussion',
    description: 'Envoie un MP et attend une réponse',
    category: 'Administration',
    aliases: ['chat'],
    async run(client, message, args) {
        const targetId = args[0]?.replace(/[<@!>]/g, '');
        if (!targetId) return message.channel.send({ embeds: [createEmbed(
            await t('discussion.usage', message.guild.id),
            '',
            'info'
        )] });

        try {
            const user = await client.users.fetch(targetId);
            
            // Add user to active discussions
            activeDiscussions.add(user.id);
            
            await message.channel.send({ embeds: [createEmbed(
                await t('discussion.started', message.guild.id, { user: user.tag }),
                '',
                'success'
            )] });
            
            // Start Collector
            const filter = m => m.author.id === message.author.id && m.channel.id === message.channel.id;
            const collector = message.channel.createMessageCollector({ filter, time: 300000 }); // 5 mins

            // Temporary listener for User DMs
            const dmListener = async (msg) => {
                // Check if message is from target user AND is in DM
                if (msg.author.id === user.id && msg.channel.type === ChannelType.DM) {
                     message.channel.send({ embeds: [createEmbed(
                        await t('discussion.dm_received', message.guild.id, { user: user.tag, content: msg.content }),
                        '',
                        'info'
                    )] });
                }
            };
            client.on('messageCreate', dmListener);

            collector.on('collect', async m => {
                if (m.content.toLowerCase() === 'stop') {
                    collector.stop();
                } else {
                    try {
                        await user.send(m.content);
                        m.react('✅').catch(() => {});
                    } catch (e) {
                        message.channel.send({ embeds: [createEmbed(
                            await t('discussion.send_error', message.guild.id),
                            '',
                            'error'
                        )] });
                    }
                }
            });

            collector.on('end', async () => {
                client.removeListener('messageCreate', dmListener);
                activeDiscussions.delete(user.id);
                message.channel.send({ embeds: [createEmbed(
                    await t('discussion.stopped', message.guild.id),
                    '',
                    'info'
                )] });
            });

        } catch (e) {
            return message.channel.send({ embeds: [createEmbed(
                await t('discussion.open_error', message.guild.id, { error: e.message }),
                '',
                'error'
            )] });
        }
    }
};
