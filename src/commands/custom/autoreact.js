const AutoReact = require('../../database/models/AutoReact');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'autoreact',
    description: 'Gérer les réactions automatiques',
    category: 'Personnalisation',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageChannels') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Gérer les salons` requise.", []);
        }

        const sub = args[0] ? args[0].toLowerCase() : null;

        if (!sub) {
            return sendV2Message(client, message.channel.id, 
                "**🎭 AUTO-REACT**\n" +
                "`+autoreact add <salon> <emoji>`\n" +
                "`+autoreact del <salon> <emoji>`\n" +
                "`+autoreact list`", 
                []
            );
        }

        if (sub === 'list') {
            const reacts = await AutoReact.find({ guild_id: message.guild.id });
            if (reacts.length === 0) return sendV2Message(client, message.channel.id, "Aucun auto-react configuré.", []);

            const list = reacts.map(r => `<#${r.channel_id}>: ${r.emojis.join(' ')}`).join('\n');
            return sendV2Message(client, message.channel.id, `**Auto-Reacts:**\n${list}`, []);
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
        const emoji = args[2];

        if (!channel || !emoji) {
            return sendV2Message(client, message.channel.id, "❌ Salon ou émoji manquant.", []);
        }

        // Validate emoji (basic check)
        // A proper check would try to react to a message.
        
        let doc = await AutoReact.findOne({ guild_id: message.guild.id, channel_id: channel.id });

        if (sub === 'add') {
            if (!doc) {
                doc = new AutoReact({ guild_id: message.guild.id, channel_id: channel.id, emojis: [] });
            }
            if (!doc.emojis.includes(emoji)) {
                doc.emojis.push(emoji);
                await doc.save();
                return sendV2Message(client, message.channel.id, `✅ Auto-react ${emoji} ajouté à ${channel}.`, []);
            } else {
                return sendV2Message(client, message.channel.id, "⚠️ Cet émoji est déjà configuré.", []);
            }
        }

        if (sub === 'del') {
            if (doc && doc.emojis.includes(emoji)) {
                doc.emojis = doc.emojis.filter(e => e !== emoji);
                if (doc.emojis.length === 0) {
                    await AutoReact.deleteOne({ _id: doc._id });
                } else {
                    await doc.save();
                }
                return sendV2Message(client, message.channel.id, `✅ Auto-react ${emoji} retiré de ${channel}.`, []);
            } else {
                return sendV2Message(client, message.channel.id, "⚠️ Cet émoji n'était pas configuré.", []);
            }
        }
    }
};