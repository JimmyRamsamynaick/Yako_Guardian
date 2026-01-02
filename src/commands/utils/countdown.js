const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'countdown',
    description: 'Crée un compte à rebours',
    category: 'Utils',
    usage: 'countdown <date/heure> [event]',
    async run(client, message, args) {
        if (!args[0]) {
            return message.channel.send({ embeds: [createEmbed('Usage', await t('countdown.usage', message.guild.id), 'warning')] });
        }

        const timeInput = args[0];
        const event = args.slice(1).join(' ') || 'Événement';
        
        // Try to parse date
        let targetDate = new Date(timeInput);
        
        // If invalid date, try to parse as relative (not implemented fully here without moment/ms, assuming user passes ISO or valid date string)
        // For simplicity in this env without new deps, we assume standard Date constructor works or we accept timestamp.
        
        if (isNaN(targetDate.getTime())) {
             return message.channel.send({ embeds: [createEmbed('Erreur', await t('countdown.invalid_date', message.guild.id), 'error')] });
        }

        const timestamp = Math.floor(targetDate.getTime() / 1000);
        const now = Math.floor(Date.now() / 1000);

        if (timestamp < now) {
            return message.channel.send({ embeds: [createEmbed('Erreur', await t('countdown.past_date', message.guild.id), 'error')] });
        }

        const embed = createEmbed(
            `⏳ ${event}`,
            `${await t('countdown.ends_in', message.guild.id)} <t:${timestamp}:R>\n(<t:${timestamp}:F>)`,
            'default'
        );

        await message.channel.send({ embeds: [embed] });
    }
};
