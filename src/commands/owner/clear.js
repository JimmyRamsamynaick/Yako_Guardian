const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const BotOwner = require('../../database/models/BotOwner');
const GlobalBlacklist = require('../../database/models/GlobalBlacklist');
const { getGuildConfig } = require('../../utils/mongoUtils');
const CustomCommand = require('../../database/models/CustomCommand');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'clear',
    description: 'Vide des listes globales (Owners, Blacklist) ou locales (Perms, Customs)',
    category: 'Owner',
    async run(client, message, args) {
        const type = args[0]?.toLowerCase();

        // --- OWNER COMMANDS ---
        if (type === 'owners') {
            if (!await isBotOwner(message.author.id)) return;
            // Root Owner check
            if (process.env.OWNER_ID && message.author.id !== process.env.OWNER_ID) {
                return sendV2Message(client, message.channel.id, "❌ Seul le Root Owner peut vider la liste des owners.", []);
            }
            
            const deleted = await BotOwner.deleteMany({});
            return sendV2Message(client, message.channel.id, `🔥 **${deleted.deletedCount}** owners ont été supprimés (sauf Root).`, []);
        }
        else if (type === 'bl' || type === 'blacklist') {
            if (!await isBotOwner(message.author.id)) return;
            // Root Owner check (safety)
             if (process.env.OWNER_ID && message.author.id !== process.env.OWNER_ID) {
                return sendV2Message(client, message.channel.id, "❌ Seul le Root Owner peut vider la blacklist globale.", []);
            }

            const deleted = await GlobalBlacklist.deleteMany({});
            return sendV2Message(client, message.channel.id, `🔥 **${deleted.deletedCount}** utilisateurs ont été retirés de la blacklist globale.`, []);
        }
        // --- ADMIN COMMANDS ---
        else if (type === 'perms' || type === 'permissions') {
             if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !await isBotOwner(message.author.id)) {
                return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
            }

            const config = await getGuildConfig(message.guild.id);
            config.customPermissions = [];
            await config.save();
            return sendV2Message(client, message.channel.id, "✅ Toutes les permissions personnalisées ont été supprimées.", []);
        }
        else if (type === 'customs' || type === 'customcommands') {
             if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !await isBotOwner(message.author.id)) {
                return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
            }

            const deleted = await CustomCommand.deleteMany({ guildId: message.guild.id });
            return sendV2Message(client, message.channel.id, `✅ **${deleted.deletedCount}** commandes personnalisées supprimées.`, []);
        }
        else {
            return sendV2Message(client, message.channel.id, "**Usage:** `+clear <owners/bl/perms/customs>`", []);
        }
    }
};
