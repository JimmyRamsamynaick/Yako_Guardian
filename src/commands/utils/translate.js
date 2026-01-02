const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');
const axios = require('axios');

module.exports = {
    name: 'translate',
    description: 'Traduit un message',
    category: 'Utils',
    usage: 'translate <lang> <texte>',
    aliases: ['tr'],
    async run(client, message, args) {
        if (!args[0] || !args[1]) {
            return message.channel.send({ embeds: [createEmbed('Usage', await t('translate.usage', message.guild.id), 'warning')] });
        }

        const targetLang = args[0];
        const text = args.slice(1).join(' ');

        // Loading state
        const replyMsg = await message.channel.send({ embeds: [createEmbed('Traduction', `${THEME.icons.loading} Traduction en cours...`, 'loading')] });

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await axios.get(url);
            
            // Response format: [[["translated_text", "original_text", ...], ...], ...]
            const translatedText = response.data[0].map(item => item[0]).join('');
            const detectedLang = response.data[2];

            const embed = createEmbed(
                '🌍 Traduction',
                '',
                'default',
                { footer: `Demandé par ${message.author.tag}`, footerIcon: message.author.displayAvatarURL() }
            );

            embed.addFields(
                { name: `Original (${detectedLang})`, value: text },
                { name: `Traduction (${targetLang})`, value: translatedText }
            );

            await replyMsg.edit({ embeds: [embed] });

        } catch (e) {
            console.error(e);
            await replyMsg.edit({ embeds: [createEmbed('Erreur', await t('translate.error', message.guild.id), 'error')] });
        }
    }
};
