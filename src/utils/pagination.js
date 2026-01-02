const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createEmbed } = require('./design');
const { t } = require('./i18n');

async function createPagination(client, message, items, itemsPerPage = 10, title = 'Liste', formatter = (i) => i) {
    if (!items || items.length === 0) {
        return message.channel.send({ 
            embeds: [createEmbed(title, await t('common.no_data', message.guild.id), 'info')] 
        });
    }

    let page = 0;
    const maxPages = Math.ceil(items.length / itemsPerPage);

    const generateEmbed = async (p) => {
        const start = p * itemsPerPage;
        const end = start + itemsPerPage;
        const currentItems = items.slice(start, end);
        const list = currentItems.map((item, i) => formatter(item, start + i + 1)).join('\n');
        
        return createEmbed(
            `${title} (${await t('common.page', message.guild.id)} ${p + 1}/${maxPages})`,
            list,
            'info'
        );
    };

    const generateRows = async (p) => {
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
                    .setLabel(await t('common.close', message.guild.id))
                    .setStyle(ButtonStyle.Danger)
            );
            return [row];
        }
    };

    const sentMsg = await message.channel.send({ 
        embeds: [await generateEmbed(page)], 
        components: await generateRows(page) 
    });
    
    const collector = sentMsg.createMessageComponentCollector({ 
        componentType: ComponentType.Button, 
        time: 120000 
    });

    collector.on('collect', async i => {
        if (i.user.id !== message.author.id) {
            return i.reply({ 
                embeds: [createEmbed('Erreur', await t('common.button_no_permission', message.guild.id), 'error')], 
                ephemeral: true 
            });
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

        await i.update({ 
            embeds: [await generateEmbed(page)], 
            components: await generateRows(page) 
        });
    });

    collector.on('end', async () => {
        // Optional: remove buttons or delete message
        if (sentMsg.editable) {
            try {
                await sentMsg.edit({ components: [] });
            } catch (e) {
                // Ignore if message deleted
            }
        }
    });
}

module.exports = { createPagination };