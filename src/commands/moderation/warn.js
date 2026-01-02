const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const UserStrike = require('../../database/models/UserStrike');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { applyPunishment } = require('../../utils/moderation/punishmentSystem');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'warn',
    description: 'Avertit un membre (Ajoute un strike)',
    category: 'Moderation',
    usage: 'warn <user> [raison] | warn list [user]',
    async run(client, message, args) {
        // Handle "list" subcommand
        if (args[0] && args[0].toLowerCase() === 'list') {
            // 1. If a user is specified, redirect to `strikes` (Single User View)
            if (args[1]) {
                const strikesCommand = client.commands.get('strikes');
                if (strikesCommand) {
                    return strikesCommand.run(client, message, args.slice(1));
                }
            }

            // 2. If NO user specified, show Global Warn List (All Members)
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return sendV2Message(client, message.channel.id, "❌ Permission refusée.", []);
            }

            const allStrikes = await UserStrike.find({ guildId: message.guild.id });
            const validStrikes = allStrikes.filter(doc => doc.strikes && doc.strikes.length > 0);

            if (validStrikes.length === 0) {
                return sendV2Message(client, message.channel.id, "✅ Aucun avertissement enregistré sur ce serveur.", []);
            }

            // Fetch ONLY relevant members to avoid Rate Limit (Opcode 8)
            const userIds = validStrikes.map(doc => doc.userId);
            let members;
            try {
                // Fetch only users in the list
                members = await message.guild.members.fetch({ user: userIds });
            } catch (e) {
                console.error("Failed to fetch members for warn list:", e);
                return sendV2Message(client, message.channel.id, "❌ Erreur lors de la récupération des membres (Rate Limit possible). Réessayez dans quelques secondes.", []);
            }
            
            const list = validStrikes
                .map(doc => {
                    const member = members.get(doc.userId);
                    return {
                        user: member ? member.user : null,
                        count: doc.strikes.length,
                        lastStrike: doc.strikes[doc.strikes.length - 1].timestamp
                    };
                })
                .filter(item => item.user !== null) // Filter out members who left
                .sort((a, b) => b.count - a.count); // Sort by count descending

            if (list.length === 0) {
                return sendV2Message(client, message.channel.id, "✅ Aucun membre actuellement présent n'a d'avertissement.", []);
            }

            // Create Standard Embed (Not V2 Component)
            const embed = new EmbedBuilder()
                .setTitle(`📋 Liste des Avertissements - ${message.guild.name}`)
                .setColor('#ff9900')
                .setThumbnail(message.guild.iconURL({ dynamic: true }));

            // Display top 20 (to avoid message limit)
            const topList = list.slice(0, 20);
            const description = topList.map((item, index) => {
                return `**${index + 1}.** ${item.user.tag} — **${item.count}** warns\n   └ *Dernier: ${new Date(item.lastStrike).toLocaleDateString()}*`;
            }).join('\n\n');

            embed.setDescription(description);

            let footerText = `${list.length} membres avertis`;
            if (list.length > 20) {
                footerText += ` (Affichage des 20 premiers)`;
            }
            embed.setFooter({ text: footerText });

            // USE STANDARD SEND FOR EMBEDS (V2 components don't support Embeds directly in the same way)
            return message.channel.send({ embeds: [embed] });
        }

        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), []);
        }

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!targetMember) {
            return sendV2Message(client, message.channel.id, "❌ Membre introuvable.", []);
        }

        if (targetMember.id === message.author.id || targetMember.id === client.user.id) {
            return sendV2Message(client, message.channel.id, "❌ Vous ne pouvez pas avertir ce membre.", []);
        }

        if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Vous ne pouvez pas avertir ce membre (Rôle supérieur ou égal).", []);
        }

        const reason = args.slice(1).join(' ') || "Aucune raison fournie";

        // Add Strike
        try {
            await UserStrike.updateOne(
                { guildId: message.guild.id, userId: targetMember.id },
                { $push: { strikes: { reason, moderatorId: message.author.id, type: 'manual' } } },
                { upsert: true }
            );

            // Notify User
            targetMember.send(`⚠️ Vous avez été averti sur **${message.guild.name}**\nRaison: ${reason}`).catch(() => {});

            // Confirm
            await sendV2Message(client, message.channel.id, `✅ **${targetMember.user.tag}** a été averti.\nRaison: *${reason}*`, []);

            // Trigger Auto Punishment Check
            const config = await getGuildConfig(message.guild.id);
            await applyPunishment(client, message, targetMember.id, config);

        } catch (err) {
            console.error(err);
            return sendV2Message(client, message.channel.id, "❌ Erreur lors de l'ajout de l'avertissement.", []);
        }
    }
};
