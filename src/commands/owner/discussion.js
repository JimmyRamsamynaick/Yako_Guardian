const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const { ChannelType } = require('discord.js');

module.exports = {
    name: 'discussion',
    description: 'Envoie un MP et attend une réponse',
    category: 'Owner',
    aliases: ['chat'],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const targetId = args[0]?.replace(/[<@!>]/g, '');
        if (!targetId) return sendV2Message(client, message.channel.id, "**Usage:** `+discussion <ID/User>`", []);

        try {
            const user = await client.users.fetch(targetId);
            
            await sendV2Message(client, message.channel.id, `✅ **Discussion ouverte avec ${user.tag}**\n\n- Tout ce que vous écrivez ici sera envoyé à l'utilisateur.\n- Les réponses de l'utilisateur apparaîtront ici.\n- Tapez \`stop\` pour fermer la session.`, []);
            
            // Start Collector
            const filter = m => m.author.id === message.author.id && m.channel.id === message.channel.id;
            const collector = message.channel.createMessageCollector({ filter, time: 300000 }); // 5 mins

            // Temporary listener for User DMs
            const dmListener = async (msg) => {
                // Check if message is from target user AND is in DM
                if (msg.author.id === user.id && msg.channel.type === ChannelType.DM) {
                     message.channel.send(`📩 **${user.tag}:** ${msg.content}`);
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
                        m.reply("❌ Échec de l'envoi.");
                    }
                }
            });

            collector.on('end', () => {
                client.removeListener('messageCreate', dmListener);
                sendV2Message(client, message.channel.id, "⏹️ **Discussion terminée.**", []);
            });

        } catch (e) {
            return sendV2Message(client, message.channel.id, `❌ Impossible d'ouvrir la discussion: ${e.message}`, []);
        }
    }
};
