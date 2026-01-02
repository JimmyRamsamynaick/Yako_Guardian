const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'helpall',
    description: 'Affiche toutes les commandes par niveau de permission',
    category: 'General',
    async run(client, message, args) {
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
            let requiredLevel = cmd.permLevel || 0;
            if (cmd.permLevel === undefined) {
                const cat = cmd.category ? cmd.category.toLowerCase() : 'general';
                if (cat === 'owner') requiredLevel = 10;
                else if (cat === 'antiraid' || cat === 'secur' || cmd.name === 'backup') requiredLevel = 4;
                else if (cat === 'configuration' || cat === 'administration') requiredLevel = 3;
                else if (cat === 'moderation' || cat === 'modmail') requiredLevel = 2;
                else if (cat === 'roles' || cat === 'tickets') requiredLevel = 1;
                else requiredLevel = 0;
            }
            
            if (levels[requiredLevel.toString()]) {
                levels[requiredLevel.toString()].push(cmd.name);
            }
        });

        let content = (await t('helpall.title', message.guild.id)) + "\n\n";

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
        
        return message.channel.send({ embeds: [createEmbed('Help All', content, 'info')] });
    }
};