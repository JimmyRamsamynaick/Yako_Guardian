const { PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'unmuteall',
    description: 'unmuteall.description',
    category: 'Moderation',
    usage: 'unmuteall.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.admin_only', message.guild.id), 'error')] });
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
            embeds: [createEmbed(await t('common.confirmation_title', message.guild.id), await t('moderation.unmuteall_confirm', message.guild.id), 'warning')],
            components: [row]
        });

        const filter = i => i.user.id === message.author.id && (i.customId === confirmId || i.customId === cancelId);
        const collector = message.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.customId === confirmId) {
                await i.update({ embeds: [createEmbed(await t('moderation.unmuteall_title', message.guild.id), `${THEME.icons.loading} ${await t('common.processing', message.guild.id)}`, 'loading')], components: [] });
                
                const config = await getGuildConfig(message.guild.id);
                const muteRoleId = config.moderation?.muteRole;

                await message.guild.members.fetch();
                const mutedMembers = message.guild.members.cache.filter(m => {
                    const isTimedOut = m.communicationDisabledUntilTimestamp > Date.now();
                    const hasMuteRole = muteRoleId && m.roles.cache.has(muteRoleId);
                    return isTimedOut || hasMuteRole;
                });

                if (mutedMembers.size === 0) {
                    return msg.edit({ embeds: [createEmbed(await t('moderation.unmuteall_title', message.guild.id), await t('moderation.unmuteall_no_mutes', message.guild.id), 'info')], components: [] });
                }

                let count = 0;
                for (const [id, member] of mutedMembers) {
                    try {
                        // Remove Timeout
                        if (member.communicationDisabledUntilTimestamp > Date.now()) {
                            if (member.moderatable) await member.timeout(null, await t('moderation.unmuteall_audit_reason', message.guild.id));
                        }
                        // Remove Role
                        if (muteRoleId && member.roles.cache.has(muteRoleId)) {
                             if (member.manageable) await member.roles.remove(muteRoleId, await t('moderation.unmuteall_audit_reason', message.guild.id));
                        }
                        count++;
                    } catch (err) {
                        console.error(`Failed to unmute ${member.user.tag}:`, err);
                    }
                }

                await msg.edit({ embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('moderation.unmuteall_success', message.guild.id, { count }), 'success')], components: [] });

            } else {
                await i.update({ embeds: [createEmbed(await t('moderation.cancelled', message.guild.id), await t('moderation.unmuteall_cancel', message.guild.id), 'error')], components: [] });
            }
        });

        collector.on('end', async collected => {
            if (collected.size === 0) msg.edit({ embeds: [createEmbed(await t('moderation.expired', message.guild.id), await t('moderation.unmuteall_timeout', message.guild.id), 'error')], components: [] }).catch(() => {});
        });
    }
};
