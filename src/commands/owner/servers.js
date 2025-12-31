const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const { PermissionsBitField, ChannelType } = require('discord.js');
const GlobalSettings = require('../../database/models/GlobalSettings');

module.exports = {
    name: 'server',
    description: 'Gestion des serveurs (Owner)',
    category: 'Owner',
    aliases: ['servers', 'invite', 'leave', 'secur'],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        const sub = args[0];

        // --- SECUR INVITE ---
        if (commandName === 'secur' && sub === 'invite') {
            const state = args[1];
            if (!state || !['on', 'off'].includes(state.toLowerCase())) {
                return sendV2Message(client, message.channel.id, "❌ Usage: `+secur invite <on/off>`\n*(Quitte automatiquement les serveurs ajoutés par quelqu'un d'autre que l'Owner)*", []);
            }

            const isEnabled = state.toLowerCase() === 'on';
            await GlobalSettings.findOneAndUpdate(
                { clientId: client.user.id },
                { securInvite: isEnabled },
                { upsert: true, new: true }
            );

            return sendV2Message(client, message.channel.id, `✅ **Secur Invite** est maintenant **${isEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}**.\nLe bot quittera automatiquement les serveurs s'il n'est pas ajouté par un Owner ou le Propriétaire du serveur.`, []);
        }

        // --- SERVER LIST ---
        if (commandName === 'server' && (!sub || sub === 'list')) {
            const guilds = client.guilds.cache.map(g => `• **${g.name}** (\`${g.id}\`) | 👥 ${g.memberCount} | 👑 <@${g.ownerId}>`);
            
            // Pagination if needed, but for now simple join
            // Split into chunks if too long
            const chunks = [];
            let currentChunk = '';
            
            guilds.forEach(line => {
                if (currentChunk.length + line.length > 1900) {
                    chunks.push(currentChunk);
                    currentChunk = '';
                }
                currentChunk += line + '\n';
            });
            if (currentChunk) chunks.push(currentChunk);

            for (let i = 0; i < chunks.length; i++) {
                await sendV2Message(client, message.channel.id, `**🌍 LISTE DES SERVEURS (${client.guilds.cache.size})** [${i+1}/${chunks.length}]\n\n${chunks[i]}`, []);
            }
            return;
        }

        // --- INVITE ---
        if (commandName === 'invite') {
            const guildId = args[0];
            if (!guildId) return sendV2Message(client, message.channel.id, "❌ Usage: `+invite <ID>`", []);

            const guild = client.guilds.cache.get(guildId);
            if (!guild) return sendV2Message(client, message.channel.id, "❌ Serveur introuvable.", []);

            try {
                // Try to find a channel to create invite
                const channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.CreateInstantInvite));
                
                if (!channel) return sendV2Message(client, message.channel.id, "❌ Impossible de créer une invitation (Pas de permissions ou pas de salon textuel accessible).", []);

                const invite = await channel.createInvite({ maxAge: 300, maxUses: 1, unique: true });
                return sendV2Message(client, message.channel.id, `✅ **Invitation pour ${guild.name}**\n${invite.url}`, []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, `❌ Erreur: ${e.message}`, []);
            }
        }

        // --- LEAVE ---
        if (commandName === 'leave') {
            const guildId = args[0];
            if (!guildId) return sendV2Message(client, message.channel.id, "❌ Usage: `+leave <ID>`", []);

            const guild = client.guilds.cache.get(guildId);
            if (!guild) return sendV2Message(client, message.channel.id, "❌ Serveur introuvable.", []);

            try {
                await guild.leave();
                return sendV2Message(client, message.channel.id, `✅ J'ai quitté **${guild.name}**.`, []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, `❌ Erreur: ${e.message}`, []);
            }
        }
    }
};
