const { sendV2Message } = require('../../utils/componentUtils');
const math = require('mathjs');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'calc',
    description: 'Résout des calculs mathématiques',
    category: 'Utils',
    async run(client, message, args) {
        const expr = args.join(' ');
        if (!expr) return sendV2Message(client, message.channel.id, await t('calc.usage', message.guild.id), []);

        try {
            const result = math.evaluate(expr);
            await sendV2Message(client, message.channel.id, await t('calc.success', message.guild.id, { expr: expr, result: result }), []);
        } catch (e) {
            return sendV2Message(client, message.channel.id, await t('calc.error', message.guild.id), []);
        }
    }
};