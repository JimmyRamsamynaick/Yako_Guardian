const { createEmbed } = require('./design');
const { db } = require('../database/index');

async function sendLog(guild, title, description, color, fields = [], author = null) {
    try {
        const settings = db.prepare('SELECT raid_log_channel FROM guild_settings WHERE guild_id = ?').get(guild.id);
        if (!settings || !settings.raid_log_channel) return;

        const channel = guild.channels.cache.get(settings.raid_log_channel);
        if (!channel) return;

        const embed = createEmbed(title, description, 'default')
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: 'Yako Guardian Logs', iconURL: guild.iconURL() });

        if (author) {
            embed.setAuthor({ name: author.tag || author.name, iconURL: author.displayAvatarURL({ dynamic: true }) });
        }

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        await channel.send({ embeds: [embed] }).catch(() => {});
    } catch (e) {
        // Silent error
    }
}

module.exports = { sendLog };