const AutoBackup = require('../../database/models/AutoBackup');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'autobackup',
    description: 'Configurer les sauvegardes automatiques',
    category: 'Backups',
    async run(client, message, args) {
        if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
        }

        const days = parseInt(args[0]);

        if (isNaN(days)) {
            const current = await AutoBackup.findOne({ guild_id: message.guild.id });
            if (current) {
                return sendV2Message(client, message.channel.id, 
                    `**AutoBackup Actif**\nFréquence: Tous les ${current.frequency_days} jours.\nProchaine backup: <t:${Math.floor(current.next_backup.getTime()/1000)}:R>\n\nPour désactiver: \`+autobackup 0\``, 
                    []
                );
            }
            return sendV2Message(client, message.channel.id, "**Utilisation:** `+autobackup <jours>` (ex: `+autobackup 1` pour tous les jours, `0` pour désactiver)", []);
        }

        if (days <= 0) {
            await AutoBackup.deleteOne({ guild_id: message.guild.id });
            return sendV2Message(client, message.channel.id, "✅ AutoBackup désactivé.", []);
        }

        const nextBackup = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        await AutoBackup.findOneAndUpdate(
            { guild_id: message.guild.id },
            { 
                guild_id: message.guild.id, 
                frequency_days: days, 
                next_backup: nextBackup 
            },
            { upsert: true, new: true }
        );

        sendV2Message(client, message.channel.id, `✅ AutoBackup activé ! Une sauvegarde sera créée tous les **${days}** jours.\nProchaine sauvegarde: <t:${Math.floor(nextBackup.getTime()/1000)}:R>`, []);
    }
};