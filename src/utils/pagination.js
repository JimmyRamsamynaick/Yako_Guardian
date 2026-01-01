const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { sendV2Message, updateV2Interaction, replyV2Interaction } = require('./componentUtils');

async function createPagination(client, message, items, itemsPerPage = 10, title = 'Liste', formatter = (i) => i) {
    if (!items || items.length === 0) {
        return sendV2Message(client, message.channel.id, `**${title}**\n\nAucune donnée trouvée.`, []);
    }

    let page = 0;
    const maxPages = Math.ceil(items.length / itemsPerPage);

    const generateContent = (p) => {
        const start = p * itemsPerPage;
        const end = start + itemsPerPage;
        const currentItems = items.slice(start, end);
        const list = currentItems.map((item, i) => formatter(item, start + i + 1)).join('\n');
        return `**${title}** (Page ${p + 1}/${maxPages})\n\n${list}`;
    };

    const generateRows = (p) => {
        const row = new ActionRowBuilder();
        
        if (maxPages > 1) {
             row.addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('◀️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId('close_page')
                    .setLabel('❌')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === maxPages - 1)
            );
            return [row];
        } else {
             row.addComponents(
                new ButtonBuilder()
                    .setCustomId('close_page')
                    .setLabel('Fermer')
                    .setStyle(ButtonStyle.Danger)
            );
            return [row];
        }
    };

    const sentMsg = await sendV2Message(client, message.channel.id, generateContent(page), generateRows(page));
    
    const channel = message.channel;
    const collector = channel.createMessageComponentCollector({ 
        componentType: ComponentType.Button, 
        time: 120000 
    });

    collector.on('collect', async i => {
        if (i.message.id !== sentMsg.id) return; 
        
        if (i.user.id !== message.author.id) {
            return replyV2Interaction(client, i, '❌ Vous ne pouvez pas utiliser ces boutons.', [], true);
        }

        if (i.customId === 'prev_page') {
            page = page > 0 ? page - 1 : page;
        } else if (i.customId === 'next_page') {
            page = page < maxPages - 1 ? page + 1 : page;
        } else if (i.customId === 'close_page') {
            await i.message.delete();
            collector.stop();
            return;
        }

        await updateV2Interaction(client, i, generateContent(page), generateRows(page));
    });

    collector.on('end', async () => {
        // Optional: remove buttons or delete message
    });
}

module.exports = { createPagination };