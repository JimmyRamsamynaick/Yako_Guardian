const { createEmbed } = require('../../utils/design');
const { isBotOwner } = require('../../utils/ownerUtils');
const BotOwner = require('../../database/models/BotOwner');
const GlobalBlacklist = require('../../database/models/GlobalBlacklist');
const { getGuildConfig } = require('../../utils/mongoUtils');
const CustomCommand = require('../../database/models/CustomCommand');
const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'dbclear',
    description: 'Vide des listes globales (Owners, Blacklist) ou locales (Perms, Customs)',
    category: 'Owner',
    aliases: ['cleardb'],
    async run(client, message, args) {
        const type = args[0]?.toLowerCase();

        // --- OWNER COMMANDS ---
        if (type === 'owners') {
            if (!await isBotOwner(message.author.id)) return;
            // Root Owner check
            if (process.env.OWNER_ID && message.author.id !== process.env.OWNER_ID) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('dbclear.root_owner_only', message.guild.id),
                    '',
                    'error'
                )] });
            }
            
            const deleted = await BotOwner.deleteMany({});
            return message.channel.send({ embeds: [createEmbed(
                await t('dbclear.owners_deleted', message.guild.id, { count: deleted.deletedCount }),
                '',
                'success'
            )] });
        }
        else if (type === 'bl' || type === 'blacklist') {
            if (!await isBotOwner(message.author.id)) return;
            // Root Owner check (safety)
             if (process.env.OWNER_ID && message.author.id !== process.env.OWNER_ID) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('dbclear.root_owner_only', message.guild.id),
                    '',
                    'error'
                )] });
            }

            const deleted = await GlobalBlacklist.deleteMany({});
            return message.channel.send({ embeds: [createEmbed(
                await t('dbclear.bl_deleted', message.guild.id, { count: deleted.deletedCount }),
                '',
                'success'
            )] });
        }
        // --- ADMIN COMMANDS ---
        else if (type === 'perms' || type === 'permissions') {
             if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !await isBotOwner(message.author.id)) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('dbclear.admin_only', message.guild.id),
                    '',
                    'error'
                )] });
            }

            const config = await getGuildConfig(message.guild.id);
            config.customPermissions = [];
            await config.save();
            return message.channel.send({ embeds: [createEmbed(
                await t('dbclear.perms_deleted', message.guild.id),
                '',
                'success'
            )] });
        }
        else if (type === 'customs' || type === 'customcommands') {
             if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !await isBotOwner(message.author.id)) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('dbclear.admin_only', message.guild.id),
                    '',
                    'error'
                )] });
            }

            const deleted = await CustomCommand.deleteMany({ guildId: message.guild.id });
            return message.channel.send({ embeds: [createEmbed(
                await t('dbclear.customs_deleted', message.guild.id, { count: deleted.deletedCount }),
                '',
                'success'
            )] });
        }
        else {
            return message.channel.send({ embeds: [createEmbed(
                await t('dbclear.usage', message.guild.id),
                '',
                'info'
            )] });
        }
    }
};
