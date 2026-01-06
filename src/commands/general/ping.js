const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'ping',
    description: 'Affiche la latence du bot',
    category: 'General',
    usage: 'ping',
    async run(client, message, args) {
        const msg = await message.channel.send({ embeds: [createEmbed(await t('ping.calculating', message.guild.id), '', 'loading')] });
        
        const latency = msg.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        await msg.edit({ 
            embeds: [createEmbed(
                await t('ping.title', message.guild.id),
                await t('ping.result', message.guild.id, { latency, apiLatency }),
                'success'
            )] 
        });
    }
};
