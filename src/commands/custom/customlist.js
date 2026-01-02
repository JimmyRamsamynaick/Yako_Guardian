const CustomCommand = require('../../database/models/CustomCommand');
const { createPagination } = require('../../utils/pagination');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'customlist',
    description: 'Liste les commandes personnalisées',
    aliases: ['cclist'],
    async execute(client, message, args) {
        const commands = await CustomCommand.find({ guildId: message.guild.id }).sort({ trigger: 1 });

        if (commands.length === 0) {
            return sendV2Message(client, message.channel.id, await t('customlist.empty', message.guild.id), []);
        }

        const formatter = (cmd) => {
            let resp = cmd.response;
            if (resp.length > 50) resp = resp.substring(0, 47) + "...";
            return `• **${cmd.trigger}** : ${resp}`;
        };

        await createPagination(client, message, commands, 10, await t('customlist.title', message.guild.id), formatter);
    }
};
