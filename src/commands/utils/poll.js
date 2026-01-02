const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'poll',
    description: 'Crée un sondage simple',
    category: 'Utils',
    usage: 'poll <question>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ManageMessages' }), 'error')] });
        }

        const fullArgs = args.join(' ');
        const regex = /"([^"]+)"|'([^']+)'/g;
        const matches = [];
        let match;
        while ((match = regex.exec(fullArgs)) !== null) {
            matches.push(match[1] || match[2]);
        }

        let question;
        let options = [];

        if (matches.length > 0) {
            question = matches[0];
            options = matches.slice(1);
        } else {
            question = fullArgs;
        }

        if (!question) {
            return message.channel.send({ embeds: [createEmbed('Usage', await t('poll.usage', message.guild.id), 'warning')] });
        }

        if (options.length > 10) {
            return message.channel.send({ embeds: [createEmbed('Erreur', await t('poll.too_many_options', message.guild.id), 'error')] });
        }

        const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        let description = question;

        if (options.length > 0) {
            description = `**${question}**\n\n`;
            options.forEach((opt, index) => {
                description += `${numberEmojis[index]} ${opt}\n`;
            });
        }

        const embed = createEmbed(
            await t('poll.title', message.guild.id),
            description,
            'default',
            {
                footer: await t('poll.footer', message.guild.id, { user: message.author.tag }),
                footerIcon: message.author.displayAvatarURL()
            }
        );

        const replyMsg = await message.channel.send({ embeds: [embed] });
        
        if (replyMsg) {
            if (options.length > 0) {
                for (let i = 0; i < options.length; i++) {
                    await replyMsg.react(numberEmojis[i]);
                }
            } else {
                await replyMsg.react('✅');
                await replyMsg.react('❌');
            }
            if (message.deletable) message.delete().catch(() => {});
        }
    }
};
