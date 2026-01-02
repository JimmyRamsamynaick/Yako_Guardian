const Reminder = require('../../database/models/Reminder');
const { parseDuration, formatDuration } = require('../../utils/timeUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'reminder',
    aliases: ['remind', 'rm'],
    description: 'Gérer les rappels',
    async execute(client, message, args) { // Added client
        const sub = args[0]?.toLowerCase();

        if (sub === 'list') {
            await listReminders(client, message);
        } else {
            // Create reminder: +reminder <duration> <content>
            await createReminder(client, message, args);
        }
    }
};

async function createReminder(client, message, args) {
    if (args.length < 2) {
        return message.channel.send({ embeds: [createEmbed(await t('reminder.usage', message.guild.id), '', 'info')] });
    }

    const durationStr = args[0];
    const duration = parseDuration(durationStr);

    if (!duration) {
        return message.channel.send({ embeds: [createEmbed(await t('reminder.invalid_duration', message.guild.id), '', 'error')] });
    }

    const content = args.slice(1).join(' ');
    const expiresAt = new Date(Date.now() + duration);

    try {
        await Reminder.create({
            userId: message.author.id,
            guildId: message.guild.id,
            channelId: message.channel.id,
            content: content,
            expiresAt: expiresAt
        });

        message.channel.send({ embeds: [createEmbed(await t('reminder.success', message.guild.id, { duration: formatDuration(duration), content: content }), '', 'success')] });
    } catch (e) {
        console.error(e);
        message.channel.send({ embeds: [createEmbed(await t('reminder.error', message.guild.id), '', 'error')] });
    }
}

async function listReminders(client, message) {
    const reminders = await Reminder.find({ userId: message.author.id, guildId: message.guild.id }).sort({ expiresAt: 1 });

    if (reminders.length === 0) {
        return message.channel.send({ embeds: [createEmbed(await t('reminder.empty', message.guild.id), '', 'info')] });
    }

    let content = (await t('reminder.list_title', message.guild.id)) + "\n\n";
    for (let i = 0; i < reminders.length; i++) {
        const rem = reminders[i];
        const timeLeft = rem.expiresAt - Date.now();
        const timeStr = timeLeft > 0 ? formatDuration(timeLeft) : await t('reminder.expired', message.guild.id);
        content += `**${i + 1}.** "${rem.content}" (${timeStr})\n`;
    }

    message.channel.send({ embeds: [createEmbed(content, '', 'info')] });
}
