const { createEmbed } = require('../../utils/design');
const math = require('mathjs');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'calc',
    description: 'Résout des calculs mathématiques',
    category: 'Utils',
    async run(client, message, args) {
        const expr = args.join(' ');
        if (!expr) return message.channel.send({ embeds: [createEmbed(await t('calc.usage', message.guild.id), '', 'info')] });

        try {
            const result = math.evaluate(expr);
            await message.channel.send({ embeds: [createEmbed(await t('calc.success', message.guild.id, { expr: expr, result: result }), '', 'success')] });
        } catch (e) {
            return message.channel.send({ embeds: [createEmbed(await t('calc.error', message.guild.id), '', 'error')] });
        }
    }
};