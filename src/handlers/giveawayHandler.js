const Giveaway = require('../database/models/Giveaway');
const { createEmbed } = require('../utils/design');
const { t } = require('../utils/i18n');

async function startGiveaway(client, guild, channel, host, duration, winners, prize) {
    const endTimestamp = Date.now() + duration;
    
    const embed = createEmbed(
        await t('giveaway.embed_title', guild.id),
        (await t('giveaway.embed_prize', guild.id, { prize })) + '\n' +
        (await t('giveaway.embed_ends', guild.id, { time: Math.floor(endTimestamp / 1000) })) + '\n' +
        (await t('giveaway.embed_host', guild.id, { host: host.toString() })) + '\n' +
        (await t('giveaway.embed_winners', guild.id, { count: winners })),
        'default'
    )
    .setColor('#FF0000')
    .setFooter({ text: await t('giveaway.embed_footer', guild.id) })
    .setTimestamp(endTimestamp);

    const message = await channel.send({ embeds: [embed] });
    await message.react('🎉');

    const giveaway = new Giveaway({
        guildId: guild.id,
        channelId: channel.id,
        messageId: message.id,
        hostId: host.id,
        prize: prize,
        winnerCount: winners,
        endTimestamp: endTimestamp,
        ended: false
    });

    await giveaway.save();
    return message;
}

async function endGiveaway(client, messageId) {
    const giveaway = await Giveaway.findOne({ messageId, ended: false });
    if (!giveaway) return null;

    const guild = client.guilds.cache.get(giveaway.guildId);
    if (!guild) return; // Guild not found
    const channel = guild.channels.cache.get(giveaway.channelId);
    if (!channel) return; // Channel not found
    
    let message;
    try {
        message = await channel.messages.fetch(messageId);
    } catch (e) {
        // Message deleted?
        giveaway.ended = true;
        await giveaway.save();
        return;
    }

    // Pick winners
    const reaction = message.reactions.cache.get('🎉');
    let winnerIds = [];
    
    if (reaction) {
        let users = await reaction.users.fetch();
        // Remove bot from users
        users = users.filter(u => !u.bot);
        
        // Random pick
        const userArray = Array.from(users.values());
        
        if (userArray.length === 0) {
            // No participants
        } else {
            for (let i = 0; i < giveaway.winnerCount; i++) {
                if (userArray.length === 0) break;
                const randomIndex = Math.floor(Math.random() * userArray.length);
                winnerIds.push(userArray[randomIndex].id);
                userArray.splice(randomIndex, 1);
            }
        }
    }

    giveaway.ended = true;
    giveaway.winners = winnerIds;
    await giveaway.save();

    // Update Message
    const winnersString = winnerIds.length > 0 ? winnerIds.map(id => `<@${id}>`).join(', ') : await t('giveaway.no_participants', guild.id);

    const embed = createEmbed(
        await t('giveaway.ended_title', guild.id),
        (await t('giveaway.embed_prize', guild.id, { prize: giveaway.prize })) + '\n' +
        (await t('giveaway.ended_winners', guild.id, { winners: winnersString })) + '\n' +
        (await t('giveaway.embed_host', guild.id, { host: `<@${giveaway.hostId}>` })),
        'default'
    )
    .setColor('#000000')
    .setFooter({ text: await t('giveaway.embed_footer', guild.id) })
    .setTimestamp(Date.now());

    await message.edit({ embeds: [embed] });
    
    if (winnerIds.length > 0) {
        await channel.send(`${await t('giveaway.ended_title', guild.id)} ${winnersString}, vous avez gagné **${giveaway.prize}** !`);
    } else {
        await channel.send(`${await t('giveaway.ended_title', guild.id)} \n${await t('giveaway.no_participants', guild.id)}`);
    }

    return winnerIds;
}

async function rerollGiveaway(client, messageId, guild) {
    const giveaway = await Giveaway.findOne({ messageId, ended: true });
    if (!giveaway) return null;

    const channel = guild.channels.cache.get(giveaway.channelId);
    if (!channel) return;

    let message;
    try {
        message = await channel.messages.fetch(messageId);
    } catch (e) {
        return;
    }

    const reaction = message.reactions.cache.get('🎉');
    if (!reaction) return;

    let users = await reaction.users.fetch();
    users = users.filter(u => !u.bot);
    const userArray = Array.from(users.values());

    if (userArray.length === 0) return;

    const randomIndex = Math.floor(Math.random() * userArray.length);
    const winner = userArray[randomIndex];

    await channel.send(`${await t('giveaway.reroll_success', guild.id, { winner: winner.toString() })} (**${giveaway.prize}**)`);
    return winner;
}

async function checkGiveaways(client) {
    const now = Date.now();
    const giveaways = await Giveaway.find({ ended: false, endTimestamp: { $lte: now } });

    for (const giveaway of giveaways) {
        try {
            await endGiveaway(client, giveaway.messageId);
        } catch (e) {
            console.error(`Failed to end giveaway ${giveaway.messageId}:`, e);
        }
    }
}

module.exports = { startGiveaway, endGiveaway, rerollGiveaway, checkGiveaways };
