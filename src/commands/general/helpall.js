const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');
const { getCommandLevel, getUserLevel } = require('../../utils/permissionUtils');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { isBotOwner } = require('../../utils/ownerUtils');

module.exports = {
    name: 'helpall',
    description: 'Affiche toutes les commandes par niveau de permission',
    category: 'General',
    async run(client, message, args) {
        const isOwner = await isBotOwner(message.author.id);
        const config = await getGuildConfig(message.guild.id);
        const userLevel = getUserLevel(message.member, config, isOwner);

        const levels = {
            '0': [], // Public
            '1': [], // Support
            '2': [], // Mod
            '3': [], // Admin
            '4': [], // High Admin
            '5': [], // Owner (Guild)
            '10': [] // Bot Owner
        };

        client.commands.forEach(cmd => {
            const requiredLevel = getCommandLevel(cmd);
            
            // Only show commands that the user can access (requiredLevel <= userLevel)
            // Exception: Bot Owner sees everything (userLevel 10)
            if (requiredLevel <= userLevel) {
                 if (levels[requiredLevel.toString()]) {
                    levels[requiredLevel.toString()].push(cmd.name);
                }
            }
        });

        let content = (await t('helpall.title', message.guild.id)) + "\n\n";
        content += `**Votre Niveau : ${userLevel}**\n\n`;

        // Level 0
        if (levels['0'].length > 0) content += (await t('helpall.level0', message.guild.id)) + `\n${levels['0'].map(c => `\`${c}\``).join(', ')}\n\n`;
        // Level 1
        if (levels['1'].length > 0) content += (await t('helpall.level1', message.guild.id)) + `\n${levels['1'].map(c => `\`${c}\``).join(', ')}\n\n`;
        // Level 2
        if (levels['2'].length > 0) content += (await t('helpall.level2', message.guild.id)) + `\n${levels['2'].map(c => `\`${c}\``).join(', ')}\n\n`;
        // Level 3
        if (levels['3'].length > 0) content += (await t('helpall.level3', message.guild.id)) + `\n${levels['3'].map(c => `\`${c}\``).join(', ')}\n\n`;
        // Level 4
        if (levels['4'].length > 0) content += (await t('helpall.level4', message.guild.id)) + `\n${levels['4'].map(c => `\`${c}\``).join(', ')}\n\n`;
        // Level 5
        if (levels['5'].length > 0) content += (await t('helpall.level5', message.guild.id)) + `\n${levels['5'].map(c => `\`${c}\``).join(', ')}\n\n`;
        
        // Level 10 (Bot Owner) - Only show if user is bot owner
        if (userLevel === 10 && levels['10'].length > 0) {
             content += `**👑 Bot Owner**\n${levels['10'].map(c => `\`${c}\``).join(', ')}\n\n`;
        }

        return message.channel.send({ embeds: [createEmbed('Help All', content, 'info')] });
    }
};
