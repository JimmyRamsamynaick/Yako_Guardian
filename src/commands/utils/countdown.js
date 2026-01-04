const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'countdown',
    description: 'Crée un compte à rebours',
    category: 'Utils',
    usage: 'countdown <JJ/MM/AAAA> [event]',
    async run(client, message, args) {
        if (!args[0]) {
            return message.channel.send({ embeds: [createEmbed('Usage', await t('countdown.usage', message.guild.id), 'warning')] });
        }

        const timeInput = args[0];
        const event = args.slice(1).join(' ') || 'Événement';
        
        // Try to parse date
        let targetDate;
        
        // Support DD/MM/YYYY format (French)
        const frDateRegex = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/;
        const match = timeInput.match(frDateRegex);

        if (match) {
            const day = parseInt(match[1]);
            const month = parseInt(match[2]) - 1; // Months are 0-indexed in JS
            const year = parseInt(match[3]);
            targetDate = new Date(year, month, day);
        } else {
            targetDate = new Date(timeInput);
        }
        
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
