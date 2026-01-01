const Reminder = require('../../database/models/Reminder');
const { parseDuration, formatDuration } = require('../../utils/timeUtils');
const { sendV2Message } = require('../../utils/componentUtils');

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
        return sendV2Message(client, message.channel.id, "Utilisation: `+reminder <durée> <message>`\nExemple: `+reminder 10m Sortir les poubelles`", []);
    }

    const durationStr = args[0];
    const duration = parseDuration(durationStr);

    if (!duration) {
        return sendV2Message(client, message.channel.id, "⚠️ Durée invalide. Formats acceptés: `10s`, `5m`, `2h`, `1d`.", []);
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

        sendV2Message(client, message.channel.id, `✅ Rappel défini pour dans **${formatDuration(duration)}** : "${content}"`, []);
    } catch (e) {
        console.error(e);
        sendV2Message(client, message.channel.id, "❌ Une erreur est survenue lors de la création du rappel.", []);
    }
}

async function listReminders(client, message) {
    const reminders = await Reminder.find({ userId: message.author.id, guildId: message.guild.id }).sort({ expiresAt: 1 });

    if (reminders.length === 0) {
        return sendV2Message(client, message.channel.id, "Vous n'avez aucun rappel en attente.", []);
    }

    let content = "**⏰ Vos rappels :**\n\n";
    reminders.forEach((rem, index) => {
        const timeLeft = rem.expiresAt - Date.now();
        const timeStr = timeLeft > 0 ? formatDuration(timeLeft) : "Expiré";
        content += `**${index + 1}.** "${rem.content}" (Dans: ${timeStr})\n`;
    });

    sendV2Message(client, message.channel.id, content, []);
}
