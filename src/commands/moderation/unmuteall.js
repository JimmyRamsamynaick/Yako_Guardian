const { PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'unmuteall',
    description: 'Retire tous les mutes (Timeout et Rôle) du serveur',
    category: 'Moderation',
    usage: 'unmuteall',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('common.admin_only', message.guild.id), []);
        }

        // Confirmation
        const confirmId = `confirm_unmuteall_${message.id}`;
        const cancelId = `cancel_unmuteall_${message.id}`;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(confirmId)
                    .setLabel(await t('moderation.unmuteall_btn_confirm', message.guild.id))
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(cancelId)
                    .setLabel(await t('moderation.unmuteall_btn_cancel', message.guild.id))
                    .setStyle(ButtonStyle.Secondary)
            );

        const msg = await message.channel.send({
            content: await t('moderation.unmuteall_confirm', message.guild.id),
            components: [row]
        });

        const filter = i => i.user.id === message.author.id && (i.customId === confirmId || i.customId === cancelId);
        const collector = message.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.customId === confirmId) {
                await i.deferUpdate();
                
                const config = await getGuildConfig(message.guild.id);
                const muteRoleId = config.moderation?.muteRole;

                await message.guild.members.fetch();
                const mutedMembers = message.guild.members.cache.filter(m => {
                    const isTimedOut = m.communicationDisabledUntilTimestamp > Date.now();
                    const hasMuteRole = muteRoleId && m.roles.cache.has(muteRoleId);
                    return isTimedOut || hasMuteRole;
                });

                if (mutedMembers.size === 0) {
                    return i.editReply({ content: await t('moderation.unmuteall_no_mutes', message.guild.id), components: [] });
                }

                let count = 0;
                for (const [id, member] of mutedMembers) {
                    try {
                        // Remove Timeout
                        if (member.communicationDisabledUntilTimestamp > Date.now()) {
                            if (member.moderatable) await member.timeout(null, "Unmute All");
                        }
                        // Remove Role
                        if (muteRoleId && member.roles.cache.has(muteRoleId)) {
                             if (member.manageable) await member.roles.remove(muteRoleId, "Unmute All");
                        }
                        count++;
                    } catch (err) {
                        console.error(`Failed to unmute ${member.user.tag}:`, err);
                    }
                }

                await i.editReply({ content: await t('moderation.unmuteall_success', message.guild.id, { count }), components: [] });

            } else {
                await i.update({ content: await t('moderation.unmuteall_cancel', message.guild.id), components: [] });
            }
        });

        collector.on('end', async collected => {
            if (collected.size === 0) msg.edit({ content: await t('moderation.unmuteall_timeout', message.guild.id), components: [] }).catch(() => {});
        });
    }
};
