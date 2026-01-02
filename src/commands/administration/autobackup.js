const AutoBackup = require('../../database/models/AutoBackup');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'autobackup',
    description: 'Configurer les sauvegardes automatiques',
    category: 'Backups',
    async run(client, message, args) {
        if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('autobackup.permission', message.guild.id), []);
        }

        const days = parseInt(args[0]);

        if (isNaN(days)) {
            const current = await AutoBackup.findOne({ guild_id: message.guild.id });
            if (current) {
                return sendV2Message(client, message.channel.id, 
                    await t('autobackup.status', message.guild.id, { 
                        days: current.frequency_days,
                        time: Math.floor(current.next_backup.getTime()/1000)
                    }), 
                    []
                );
            }
            return sendV2Message(client, message.channel.id, await t('autobackup.usage', message.guild.id), []);
        }

        if (days <= 0) {
            await AutoBackup.deleteOne({ guild_id: message.guild.id });
            return sendV2Message(client, message.channel.id, await t('autobackup.disabled', message.guild.id), []);
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

        sendV2Message(client, message.channel.id, await t('autobackup.enabled', message.guild.id, { 
            days: days,
            time: Math.floor(nextBackup.getTime()/1000)
        }), []);
    }
};