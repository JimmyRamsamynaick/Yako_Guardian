const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Routes } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'button',
    description: 'Ajouter un bouton URL à un message',
    category: 'Personnalisation',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageMessages') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('button.permission', message.guild.id), []);
        }

        const sub = args[0] ? args[0].toLowerCase() : null;

        if (!sub || !['link', 'role', 'del', 'add'].includes(sub)) {
            return sendV2Message(client, message.channel.id, await t('button.usage', message.guild.id), []);
        }

        if (!message.reference) {
            return sendV2Message(client, message.channel.id, await t('button.no_reference', message.guild.id), []);
        }

        const targetMsg = await message.channel.messages.fetch(message.reference.messageId);
        if (!targetMsg.editable && targetMsg.author.id !== client.user.id) {
            return sendV2Message(client, message.channel.id, await t('button.not_editable', message.guild.id), []);
        }

        if (sub === 'link' || sub === 'add') {
            const url = args[1];
            const label = args.slice(2).join(' ');

            if (!url || !label) {
                return sendV2Message(client, message.channel.id, await t('button.link_missing_args', message.guild.id), []);
            }

            if (!url.startsWith('http')) {
                return sendV2Message(client, message.channel.id, await t('button.invalid_url', message.guild.id), []);
            }

            await addButton(client, message, targetMsg, label, ButtonStyle.Link, url);
        }

        if (sub === 'role') {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
            const label = args.slice(2).join(' ') || (role ? role.name : null);

            if (!role) {
                return sendV2Message(client, message.channel.id, await t('button.role_not_found', message.guild.id), []);
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
                const confirmMsg = await sendV2Message(client, message.channel.id, await t('button.deleted', message.guild.id), []);
                setTimeout(() => {
                    client.rest.delete(Routes.channelMessage(message.channel.id, confirmMsg.id)).catch(() => {});
                }, 3000);
                
                return;
            } catch (e) {
                 const errorMsg = await sendV2Message(client, message.channel.id, await t('button.delete_error', message.guild.id), []);
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
                return sendV2Message(client, message.channel.id, await t('button.limit_reached', message.guild.id), []);
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
        return sendV2Message(client, message.channel.id, await t('button.add_error', message.guild.id), []);
    }
}