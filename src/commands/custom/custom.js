const CustomCommand = require('../../database/models/CustomCommand');
const { PermissionsBitField } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'custom',
    description: 'Crée, modifie, supprime ou transfère une commande personnalisée',
    aliases: ['cc'],
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('custom.permission', message.guild.id), []);
        }

        if (args.length < 1) {
            return sendV2Message(client, message.channel.id, await t('custom.usage', message.guild.id), []);
        }

        const sub = args[0].toLowerCase();

        // Delete Subcommand
        if (sub === 'delete' || sub === 'del' || sub === 'remove') {
            if (args.length < 2) return sendV2Message(client, message.channel.id, await t('custom.usage_delete', message.guild.id), []);
            const trigger = args[1].toLowerCase();

            const deleted = await CustomCommand.findOneAndDelete({ guildId: message.guild.id, trigger });
            if (deleted) {
                return sendV2Message(client, message.channel.id, await t('custom.deleted', message.guild.id, { trigger }), []);
            } else {
                return sendV2Message(client, message.channel.id, await t('custom.not_found', message.guild.id, { trigger }), []);
            }
        }

        // Transfer Subcommand
        if (sub === 'transfer') {
            if (args.length < 3) return sendV2Message(client, message.channel.id, await t('custom.usage_transfer', message.guild.id), []);
            const oldName = args[1].toLowerCase();
            const newName = args[2].toLowerCase();

            const cmd = await CustomCommand.findOne({ guildId: message.guild.id, trigger: oldName });
            if (!cmd) return sendV2Message(client, message.channel.id, await t('custom.not_found', message.guild.id, { trigger: oldName }), []);

            const exists = await CustomCommand.findOne({ guildId: message.guild.id, trigger: newName });
            if (exists) return sendV2Message(client, message.channel.id, await t('custom.exists', message.guild.id, { name: newName }), []);

            cmd.trigger = newName;
            await cmd.save();

            return sendV2Message(client, message.channel.id, await t('custom.transferred', message.guild.id, { old: oldName, new: newName }), []);
        }

        // Create/Update Logic
        const trigger = args[0].toLowerCase();
        if (args.length < 2) return sendV2Message(client, message.channel.id, await t('custom.no_response', message.guild.id), []);
        
        const response = args.slice(1).join(' ');

        try {
            const existing = await CustomCommand.findOne({ guildId: message.guild.id, trigger });
            
            if (existing) {
                existing.response = response;
                await existing.save();
                sendV2Message(client, message.channel.id, await t('custom.updated', message.guild.id, { trigger }), []);
            } else {
                await CustomCommand.create({
                    guildId: message.guild.id,
                    trigger,
                    response
                });
                sendV2Message(client, message.channel.id, await t('custom.created', message.guild.id, { trigger }), []);
            }
        } catch (e) {
            console.error(e);
            sendV2Message(client, message.channel.id, await t('custom.save_error', message.guild.id), []);
        }
    }
};
