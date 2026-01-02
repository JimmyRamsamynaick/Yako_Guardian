const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createBackup, loadBackup } = require('../../utils/backupHandler');
const { sendV2Message } = require('../../utils/componentUtils');
const Backup = require('../../database/models/Backup');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'backup',
    description: 'Système de sauvegarde du serveur',
    category: 'Administration',
    async run(client, message, args) {
        if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('backup.permission', message.guild.id), []);
        }

        const sub = args[0] ? args[0].toLowerCase() : null;
        const name = args[1];

        if (!sub) {
            return sendV2Message(client, message.channel.id, 
                await t('backup.usage', message.guild.id), 
                []
            );
        }

        try {
            if (sub === 'create') {
                if (!name) return sendV2Message(client, message.channel.id, await t('backup.create_no_name', message.guild.id), []);
                
                await sendV2Message(client, message.channel.id, await t('backup.creating', message.guild.id), []);
                await createBackup(message.guild, name);
                
                return sendV2Message(client, message.channel.id, await t('backup.create_success', message.guild.id, { name: name }), []);
            }

            if (sub === 'list') {
                const backups = await Backup.find({ guild_id: message.guild.id });
                if (backups.length === 0) {
                    return sendV2Message(client, message.channel.id, await t('backup.list_empty', message.guild.id), []);
                }

                const list = backups.map(b => `• **${b.name}** (${new Date(b.created_at).toLocaleDateString()})`).join('\n');
                return sendV2Message(client, message.channel.id, await t('backup.list_title', message.guild.id, { list: list }), []);
            }

            if (sub === 'load') {
                if (!name) return sendV2Message(client, message.channel.id, await t('backup.load_no_name', message.guild.id), []);
                
                const backup = await Backup.findOne({ guild_id: message.guild.id, name: name });
                if (!backup) return sendV2Message(client, message.channel.id, await t('backup.not_found', message.guild.id, { name: name }), []);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`backup_confirm_load_${name}`)
                        .setLabel(await t('backup.btn_load', message.guild.id))
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('backup_cancel')
                        .setLabel(await t('backup.btn_cancel', message.guild.id))
                        .setStyle(ButtonStyle.Secondary)
                );

                const msg = await sendV2Message(client, message.channel.id, 
                    await t('backup.load_warning', message.guild.id, { name: name }), 
                    [row]
                );

                // Collector
                const fetchedMsg = await message.channel.messages.fetch(msg.id);
                const collector = fetchedMsg.createMessageComponentCollector({ time: 15000 });

                collector.on('collect', async i => {
                    if (i.user.id !== message.author.id) {
                        return i.reply({ content: await t('common.not_allowed', message.guild.id), ephemeral: true });
                    }

                    if (i.customId === `backup_confirm_load_${name}`) {
                        await i.update({ content: await t('backup.loading', message.guild.id), components: [] });
                        try {
                            await loadBackup(message.guild, name);
                            await i.editReply({ content: await t('backup.loaded', message.guild.id, { name: name }) });
                        } catch (e) {
                            await i.editReply({ content: await t('backup.load_error', message.guild.id, { error: e.message }) });
                        }
                    } else if (i.customId === 'backup_cancel') {
                        await i.update({ content: await t('common.cancelled', message.guild.id), components: [] });
                    }
                });
                return;
            }

            if (sub === 'delete') {
                if (!name) return sendV2Message(client, message.channel.id, await t('backup.delete_no_name', message.guild.id), []);

                const backup = await Backup.findOne({ guild_id: message.guild.id, name: name });
                if (!backup) return sendV2Message(client, message.channel.id, await t('backup.not_found', message.guild.id, { name: name }), []);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`backup_confirm_delete_${name}`)
                        .setLabel(await t('backup.btn_delete', message.guild.id))
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('backup_cancel')
                        .setLabel(await t('backup.btn_cancel', message.guild.id))
                        .setStyle(ButtonStyle.Secondary)
                );

                const msg = await sendV2Message(client, message.channel.id, 
                    await t('backup.delete_warning', message.guild.id, { name: name }), 
                    [row]
                );

                // Collector
                const fetchedMsg = await message.channel.messages.fetch(msg.id);
                const collector = fetchedMsg.createMessageComponentCollector({ time: 15000 });

                collector.on('collect', async i => {
                    if (i.user.id !== message.author.id) {
                        return i.reply({ content: await t('common.not_allowed', message.guild.id), ephemeral: true });
                    }

                    if (i.customId === `backup_confirm_delete_${name}`) {
                        await i.update({ content: await t('common.processing', message.guild.id), components: [] });
                        try {
                            await Backup.deleteOne({ guild_id: message.guild.id, name: name });
                            await i.editReply({ content: await t('backup.deleted', message.guild.id, { name: name }) });
                        } catch (e) {
                            await i.editReply({ content: await t('backup.delete_error', message.guild.id, { error: e.message }) });
                        }
                    } else if (i.customId === 'backup_cancel') {
                        await i.update({ content: await t('common.cancelled', message.guild.id), components: [] });
                    }
                });
                return;
            }

        } catch (error) {
            console.error(error);
            return sendV2Message(client, message.channel.id, await t('backup.error', message.guild.id, { error: error.message }), []);
        }
    }
};