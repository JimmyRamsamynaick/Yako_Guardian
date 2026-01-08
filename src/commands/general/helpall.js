const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');
const { getCommandLevel, getUserLevel } = require('../../utils/permissionUtils');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'helpall',
    description: 'Affiche toutes les commandes par niveau de permission (Menu Interactif)',
    category: 'General',
    async run(client, message, args) {
        const isOwner = await isBotOwner(message.author.id);
        const config = await getGuildConfig(message.guild.id);
        const userLevel = getUserLevel(message.member, config, isOwner);

        const embed = createEmbed(
            await t('helpall.title', message.guild.id),
            await t('helpall.menu_description', message.guild.id, { level: userLevel }),
            'info'
        );

        const options = [
            { label: 'Niveau 0 (Public)', value: 'helpall_0', description: await t('helpall.desc_0', message.guild.id), emoji: '🌍' },
            { label: 'Niveau 1 (Support)', value: 'helpall_1', description: await t('helpall.desc_1', message.guild.id), emoji: '🎫' },
            { label: 'Niveau 2 (Moderation)', value: 'helpall_2', description: await t('helpall.desc_2', message.guild.id), emoji: '🛡️' },
            { label: 'Niveau 3 (Administration)', value: 'helpall_3', description: await t('helpall.desc_3', message.guild.id), emoji: '⚔️' },
            { label: 'Niveau 4 (Security)', value: 'helpall_4', description: await t('helpall.desc_4', message.guild.id), emoji: '🔒' },
            { label: 'Niveau 5 (Owner)', value: 'helpall_5', description: await t('helpall.desc_5', message.guild.id), emoji: '👑' }
        ];

        if (userLevel === 10) {
            options.push({ label: 'Level 10 (Bot Owner)', value: 'helpall_10', description: 'Bot Developer Commands', emoji: '🤖' });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('helpall_select_level')
                    .setPlaceholder(await t('helpall.placeholder', message.guild.id))
                    .addOptions(options)
            );

        return message.channel.send({ embeds: [embed], components: [row] });
    }
};
