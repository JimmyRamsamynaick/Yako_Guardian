const AutoBackup = require('../../database/models/AutoBackup');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'autobackup',
    description: 'Configurer les sauvegardes automatiques',
    category: 'Administration',
    async run(client, message, args) {
        if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(
                await t('autobackup.permission', message.guild.id),
                '',
                'error'
            )] });
        }

        const days = parseInt(args[0]);

        if (isNaN(days)) {
            const current = await AutoBackup.findOne({ guild_id: message.guild.id });
            if (current) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('autobackup.status', message.guild.id, { 
                        days: current.frequency_days,
                        time: Math.floor(current.next_backup.getTime()/1000)
                    }),
                    '',
                    'info'
                )] });
            }
            return message.channel.send({ embeds: [createEmbed(
                await t('autobackup.usage', message.guild.id),
                '',
                'info'
            )] });
        }

        if (days <= 0) {
            await AutoBackup.deleteOne({ guild_id: message.guild.id });
            return message.channel.send({ embeds: [createEmbed(
                await t('autobackup.disabled', message.guild.id),
                '',
                'success'
            )] });
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

        return message.channel.send({ embeds: [createEmbed(
            await t('autobackup.enabled', message.guild.id, { 
                days: days,
                time: Math.floor(nextBackup.getTime()/1000)
            }),
            '',
            'success'
        )] });
    }
};