const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Routes } = require('discord.js');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'button',
    description: 'Ajouter un bouton URL à un message',
    category: 'Personnalisation',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageMessages') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('button.permission', message.guild.id), '', 'error')] });
        }

        const sub = args[0] ? args[0].toLowerCase() : null;

        if (!sub || !['link', 'role', 'del', 'add'].includes(sub)) {
            return message.channel.send({ embeds: [createEmbed(await t('button.usage', message.guild.id), '', 'info')] });
        }

        if (!message.reference) {
            return message.channel.send({ embeds: [createEmbed(await t('button.no_reference', message.guild.id), '', 'error')] });
        }

        const targetMsg = await message.channel.messages.fetch(message.reference.messageId);
        if (!targetMsg.editable && targetMsg.author.id !== client.user.id) {
            return message.channel.send({ embeds: [createEmbed(await t('button.not_editable', message.guild.id), '', 'error')] });
        }

        if (sub === 'link' || sub === 'add') {
            const url = args[1];
            const label = args.slice(2).join(' ');

            if (!url || !label) {
                return message.channel.send({ embeds: [createEmbed(await t('button.link_missing_args', message.guild.id), '', 'error')] });
            }

            if (!url.startsWith('http')) {
                return message.channel.send({ embeds: [createEmbed(await t('button.invalid_url', message.guild.id), '', 'error')] });
            }

            await addButton(client, message, targetMsg, label, ButtonStyle.Link, url);
        }

        if (sub === 'role') {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
            const label = args.slice(2).join(' ') || (role ? role.name : null);

            if (!role) {
                return message.channel.send({ embeds: [createEmbed(await t('button.role_not_found', message.guild.id), '', 'error')] });
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
                const confirmMsg = await message.channel.send({ embeds: [createEmbed(await t('button.deleted', message.guild.id), '', 'success')] });
                setTimeout(() => {
                    confirmMsg.delete().catch(() => {});
                }, 3000);
                
                return;
            } catch (e) {
                 const errorMsg = await message.channel.send({ embeds: [createEmbed(await t('button.delete_error', message.guild.id), '', 'error')] });
                 setTimeout(() => {
                    errorMsg.delete().catch(() => {});
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
                return message.channel.send({ embeds: [createEmbed(await t('button.limit_reached', message.guild.id), '', 'error')] });
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
        return message.channel.send({ embeds: [createEmbed(await t('button.add_error', message.guild.id), '', 'error')] });
    }
}