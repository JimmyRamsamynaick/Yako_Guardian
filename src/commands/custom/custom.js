const CustomCommand = require('../../database/models/CustomCommand');
const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'custom',
    description: 'Crée, modifie, supprime ou transfère une commande personnalisée',
    aliases: ['cc'],
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('custom.permission', message.guild.id), '', 'error')] });
        }

        if (args.length < 1) {
            return message.channel.send({ embeds: [createEmbed(await t('custom.help_title', message.guild.id), await t('custom.help_description', message.guild.id), 'info')] });
        }

        const sub = args[0].toLowerCase();

        // Delete Subcommand
        if (sub === 'delete' || sub === 'del' || sub === 'remove') {
            if (args.length < 2) return message.channel.send({ embeds: [createEmbed(await t('custom.usage_delete', message.guild.id), '', 'info')] });
            const trigger = args[1].toLowerCase();

            const deleted = await CustomCommand.findOneAndDelete({ guildId: message.guild.id, trigger });
            if (deleted) {
                return message.channel.send({ embeds: [createEmbed(await t('custom.deleted', message.guild.id, { trigger }), '', 'success')] });
            } else {
                return message.channel.send({ embeds: [createEmbed(await t('custom.not_found', message.guild.id, { trigger }), '', 'error')] });
            }
        }

        // Transfer Subcommand
        if (sub === 'transfer') {
            if (args.length < 3) return message.channel.send({ embeds: [createEmbed(await t('custom.usage_transfer', message.guild.id), '', 'info')] });
            const oldName = args[1].toLowerCase();
            const newName = args[2].toLowerCase();

            const cmd = await CustomCommand.findOne({ guildId: message.guild.id, trigger: oldName });
            if (!cmd) return message.channel.send({ embeds: [createEmbed(await t('custom.not_found', message.guild.id, { trigger: oldName }), '', 'error')] });

            const exists = await CustomCommand.findOne({ guildId: message.guild.id, trigger: newName });
            if (exists) return message.channel.send({ embeds: [createEmbed(await t('custom.exists', message.guild.id, { name: newName }), '', 'error')] });

            cmd.trigger = newName;
            await cmd.save();

            return message.channel.send({ embeds: [createEmbed(await t('custom.transferred', message.guild.id, { old: oldName, new: newName }), '', 'success')] });
        }

        // Create/Update Logic
        const trigger = args[0].toLowerCase();
        if (args.length < 2) return message.channel.send({ embeds: [createEmbed(await t('custom.no_response', message.guild.id), '', 'info')] });
        
        const response = args.slice(1).join(' ');

        try {
            const existing = await CustomCommand.findOne({ guildId: message.guild.id, trigger });
            
            if (existing) {
                existing.response = response;
                await existing.save();
                message.channel.send({ embeds: [createEmbed(await t('custom.updated', message.guild.id, { trigger }), '', 'success')] });
            } else {
                await CustomCommand.create({
                    guildId: message.guild.id,
                    trigger,
                    response
                });
                message.channel.send({ embeds: [createEmbed(await t('custom.created', message.guild.id, { trigger }), '', 'success')] });
            }
        } catch (e) {
            console.error(e);
            message.channel.send({ embeds: [createEmbed(await t('custom.save_error', message.guild.id), '', 'error')] });
        }
    }
};
