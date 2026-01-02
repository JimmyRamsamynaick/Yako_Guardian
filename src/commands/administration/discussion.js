const { sendV2Message } = require('../../utils/componentUtils');
const { ChannelType } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'discussion',
    description: 'Envoie un MP et attend une réponse',
    category: 'Administration',
    aliases: ['chat'],
    async run(client, message, args) {
        const targetId = args[0]?.replace(/[<@!>]/g, '');
        if (!targetId) return sendV2Message(client, message.channel.id, await t('discussion.usage', message.guild.id), []);

        try {
            const user = await client.users.fetch(targetId);
            
            await sendV2Message(client, message.channel.id, await t('discussion.started', message.guild.id, { user: user.tag }), []);
            
            // Start Collector
            const filter = m => m.author.id === message.author.id && m.channel.id === message.channel.id;
            const collector = message.channel.createMessageCollector({ filter, time: 300000 }); // 5 mins

            // Temporary listener for User DMs
            const dmListener = async (msg) => {
                // Check if message is from target user AND is in DM
                if (msg.author.id === user.id && msg.channel.type === ChannelType.DM) {
                     sendV2Message(client, message.channel.id, await t('discussion.dm_received', message.guild.id, { user: user.tag, content: msg.content }), []);
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
                        sendV2Message(client, m.channel.id, await t('discussion.send_error', message.guild.id), []);
                    }
                }
            });

            collector.on('end', async () => {
                client.removeListener('messageCreate', dmListener);
                sendV2Message(client, message.channel.id, await t('discussion.stopped', message.guild.id), []);
            });

        } catch (e) {
            return sendV2Message(client, message.channel.id, await t('discussion.open_error', message.guild.id, { error: e.message }), []);
        }
    }
};
