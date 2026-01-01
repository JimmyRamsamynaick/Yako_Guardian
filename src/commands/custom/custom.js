const CustomCommand = require('../../database/models/CustomCommand');
const { PermissionsBitField } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'custom',
    description: 'Crée, modifie, supprime ou transfère une commande personnalisée',
    aliases: ['cc'],
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission (Administrator requis).", []);
        }

        if (args.length < 1) {
            return sendV2Message(client, message.channel.id, "Utilisation:\n`+custom <mot-clé> <réponse>` : Créer/Modifier\n`+custom delete <mot-clé>` : Supprimer\n`+custom transfer <ancien> <nouveau>` : Renommer", []);
        }

        const sub = args[0].toLowerCase();

        // Delete Subcommand
        if (sub === 'delete' || sub === 'del' || sub === 'remove') {
            if (args.length < 2) return sendV2Message(client, message.channel.id, "Utilisation: `+custom delete <mot-clé>`", []);
            const trigger = args[1].toLowerCase();

            const deleted = await CustomCommand.findOneAndDelete({ guildId: message.guild.id, trigger });
            if (deleted) {
                return sendV2Message(client, message.channel.id, `✅ Commande \`${trigger}\` supprimée.`, []);
            } else {
                return sendV2Message(client, message.channel.id, `❌ La commande \`${trigger}\` n'existe pas.`, []);
            }
        }

        // Transfer Subcommand
        if (sub === 'transfer') {
            if (args.length < 3) return sendV2Message(client, message.channel.id, "Utilisation: `+custom transfer <ancien_nom> <nouveau_nom>`", []);
            const oldName = args[1].toLowerCase();
            const newName = args[2].toLowerCase();

            const cmd = await CustomCommand.findOne({ guildId: message.guild.id, trigger: oldName });
            if (!cmd) return sendV2Message(client, message.channel.id, `❌ La commande \`${oldName}\` n'existe pas.`, []);

            const exists = await CustomCommand.findOne({ guildId: message.guild.id, trigger: newName });
            if (exists) return sendV2Message(client, message.channel.id, `❌ La commande \`${newName}\` existe déjà.`, []);

            cmd.trigger = newName;
            await cmd.save();

            return sendV2Message(client, message.channel.id, `✅ Commande transférée de \`${oldName}\` vers \`${newName}\`.`, []);
        }

        // Create/Update Logic
        const trigger = args[0].toLowerCase();
        if (args.length < 2) return sendV2Message(client, message.channel.id, "❌ Vous devez fournir une réponse pour la commande.", []);
        
        const response = args.slice(1).join(' ');

        try {
            const existing = await CustomCommand.findOne({ guildId: message.guild.id, trigger });
            
            if (existing) {
                existing.response = response;
                await existing.save();
                sendV2Message(client, message.channel.id, `✅ Commande \`${trigger}\` mise à jour.`, []);
            } else {
                await CustomCommand.create({
                    guildId: message.guild.id,
                    trigger,
                    response
                });
                sendV2Message(client, message.channel.id, `✅ Commande \`${trigger}\` créée.`, []);
            }
        } catch (e) {
            console.error(e);
            sendV2Message(client, message.channel.id, "❌ Erreur lors de la sauvegarde.", []);
        }
    }
};
