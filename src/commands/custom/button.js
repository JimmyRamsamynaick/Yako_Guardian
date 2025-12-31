const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Routes } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'button',
    description: 'Ajouter un bouton URL à un message',
    category: 'Personnalisation',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageMessages') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Gérer les messages` requise.", []);
        }

        const sub = args[0] ? args[0].toLowerCase() : null;

        if (!sub || !['link', 'role', 'del', 'add'].includes(sub)) {
            return sendV2Message(client, message.channel.id, "**Utilisation:**\n`+button link <url> <label>` : Bouton URL\n`+button role <@role> [label]` : Bouton Rôle\n`+button del` : Supprimer les boutons", []);
        }

        if (!message.reference) {
            return sendV2Message(client, message.channel.id, "❌ Vous devez répondre au message à modifier.", []);
        }

        const targetMsg = await message.channel.messages.fetch(message.reference.messageId);
        if (!targetMsg.editable && targetMsg.author.id !== client.user.id) {
            return sendV2Message(client, message.channel.id, "❌ Je ne peux pas modifier ce message (ce n'est pas le mien).", []);
        }

        if (sub === 'link' || sub === 'add') {
            const url = args[1];
            const label = args.slice(2).join(' ');

            if (!url || !label) {
                return sendV2Message(client, message.channel.id, "❌ URL et Label requis. Ex: `+button link https://google.com Site Web`", []);
            }

            if (!url.startsWith('http')) {
                return sendV2Message(client, message.channel.id, "❌ URL invalide (doit commencer par http).", []);
            }

            await addButton(client, message, targetMsg, label, ButtonStyle.Link, url);
        }

        if (sub === 'role') {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
            const label = args.slice(2).join(' ') || (role ? role.name : null);

            if (!role) {
                return sendV2Message(client, message.channel.id, "❌ Rôle introuvable.", []);
            }

            // CustomID format: btn_role_ROLEID
            await addButton(client, message, targetMsg, label, ButtonStyle.Primary, null, `btn_role_${role.id}`);
        }

        if (sub === 'del') {
            try {
                await targetMsg.edit({ components: [] });
                await message.delete().catch(() => {});
                
                // Note: Ephemeral messages are not possible with text commands (+button).
                // We simulate it by deleting the confirmation after 3 seconds.
                const confirmMsg = await sendV2Message(client, message.channel.id, "🗑️ Boutons supprimés.", []);
                setTimeout(() => {
                    client.rest.delete(Routes.channelMessage(message.channel.id, confirmMsg.id)).catch(() => {});
                }, 3000);
                
                return;
            } catch (e) {
                 const errorMsg = await sendV2Message(client, message.channel.id, "❌ Erreur lors de la suppression.", []);
                 setTimeout(() => {
                    client.rest.delete(Routes.channelMessage(message.channel.id, errorMsg.id)).catch(() => {});
                }, 5000);
                return;
            }
        }
    }
};

async function addButton(client, message, targetMsg, label, style, url = null, customId = null) {
    try {
        const components = targetMsg.components.map(c => ActionRowBuilder.from(c));
        
        let row = components.find(r => r.components.length < 5);
        if (!row) {
            if (components.length >= 5) {
                return sendV2Message(client, message.channel.id, "❌ Limite de 5 rangées atteinte.", []);
            }
            row = new ActionRowBuilder();
            components.push(row);
        }

        const btn = new ButtonBuilder()
            .setLabel(label)
            .setStyle(style);

        if (url) btn.setURL(url);
        if (customId) btn.setCustomId(customId);

        row.addComponents(btn);

        await targetMsg.edit({ components: components });
        await message.delete().catch(() => {});
    } catch (e) {
        console.error(e);
        return sendV2Message(client, message.channel.id, "❌ Erreur lors de l'ajout du bouton.", []);
    }
}