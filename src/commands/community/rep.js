const Reputation = require('../../database/models/Reputation');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');
const ms = require('ms');

module.exports = {
    name: 'rep',
    description: 'Donner un point de réputation à un utilisateur',
    category: 'Community',
    usage: 'rep <user>',
    async run(client, message, args) {
        const config = await getGuildConfig(message.guild.id);
        if (!config.community?.reputation?.enabled) {
             // If not explicitly enabled, maybe it is enabled by default? 
             // Let's assume enabled if not disabled, or check strict config.
             // Usually features are disabled by default.
             if (config.community?.reputation?.enabled === false) return;
        }

        const target = message.mentions.users.first();
        
        // If no target, show my rep
        if (!target) {
            const myRep = await Reputation.findOne({ guildId: message.guild.id, userId: message.author.id });
            return message.channel.send({ embeds: [createEmbed(await t('rep.check', message.guild.id, { user: message.author.username, rep: myRep ? myRep.rep : 0 }), '', 'info')] });
        }

        if (target.id === message.author.id) {
            return message.channel.send({ embeds: [createEmbed(await t('rep.self', message.guild.id), '', 'error')] });
        }
        if (target.bot) {
            return message.channel.send({ embeds: [createEmbed(await t('rep.bot', message.guild.id), '', 'error')] });
        }

        // Check Cooldown (Sender)
        // We need a place to store "Last Rep Given By User". 
        // The Reputation model has `lastRepTimestamp` but that could mean "Last Received" or "Last Given".
        // Let's assume we need a separate tracking or reuse the field if it means "Last Given".
        // If the model `Reputation` stores the rep OF the user, `lastRepTimestamp` on that doc probably means when they last RECEIVED or UPDATED their rep.
        // We need to track when `message.author` last GAVE rep.
        // I will add a `lastGivenRep` to the Reputation schema or just use a Map for simplicity (but Map resets on restart).
        // Better: Use `Reputation` model for the sender too. Add `lastRepGiven` field to Schema?
        // Or reuse `lastRepTimestamp` as "Last Interaction"? No, that's ambiguous.
        // Let's modify the schema or just use a new collection `RepCooldown`?
        // Or simpler: User `Reputation` document for the SENDER.
        
        // I'll check if I can modify the schema easily. I'd rather not change schema if possible.
        // Let's look at `Reputation.js` again.
        // `lastRepTimestamp: { type: Number, default: 0 }`
        // I will interpret this as "Last time this user GAVE rep".
        
        let senderData = await Reputation.findOne({ guildId: message.guild.id, userId: message.author.id });
        if (!senderData) {
            senderData = new Reputation({ guildId: message.guild.id, userId: message.author.id });
        }

        const cooldownTime = 12 * 60 * 60 * 1000; // 12 Hours
        const now = Date.now();

        if (now - senderData.lastRepTimestamp < cooldownTime) {
            const remaining = cooldownTime - (now - senderData.lastRepTimestamp);
            // ms to string
            // I need a formatter.
            const timeStr = ms(remaining, { long: true }); 
            return message.channel.send({ embeds: [createEmbed(await t('rep.cooldown', message.guild.id, { time: timeStr }), '', 'error')] });
        }

        // Give Rep
        let targetData = await Reputation.findOne({ guildId: message.guild.id, userId: target.id });
        if (!targetData) {
            targetData = new Reputation({ guildId: message.guild.id, userId: target.id });
        }

        targetData.rep += 1;
        await targetData.save();

        // Update Sender Cooldown
        senderData.lastRepTimestamp = now;
        await senderData.save();

        message.channel.send({ embeds: [createEmbed(await t('rep.success', message.guild.id, { user: target.username }), '', 'success')] });
    }
};
