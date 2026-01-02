const { PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'derank',
    description: 'Retire tous les rôles d\'un membre',
    category: 'Moderation',
    usage: 'derank <user>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ManageRoles' }), []);
        }

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!targetMember) {
            return sendV2Message(client, message.channel.id, await t('moderation.member_not_found', message.guild.id), []);
        }

        if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('moderation.role_hierarchy', message.guild.id), []);
        }

        // Confirmation
        const confirmId = `confirm_derank_${message.id}`;
        const cancelId = `cancel_derank_${message.id}`;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(confirmId)
                    .setLabel(await t('moderation.derank_confirm_btn', message.guild.id))
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(cancelId)
                    .setLabel(await t('moderation.derank_cancel_btn', message.guild.id))
                    .setStyle(ButtonStyle.Secondary)
            );

        const msg = await message.channel.send({
            content: await t('moderation.derank_confirm', message.guild.id, { user: targetMember.user.tag }),
            components: [row]
        });

        const filter = i => i.user.id === message.author.id && (i.customId === confirmId || i.customId === cancelId);
        const collector = message.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.customId === confirmId) {
                try {
                    const rolesToRemove = targetMember.roles.cache.filter(role => 
                        role.name !== '@everyone' && 
                        !role.managed && 
                        role.position < message.guild.members.me.roles.highest.position
                    );

                    await targetMember.roles.remove(rolesToRemove);
                    await i.update({ content: await t('moderation.derank_success', message.guild.id, { user: targetMember.user.tag, count: rolesToRemove.size }), components: [] });
                } catch (err) {
                    console.error(err);
                    await i.update({ content: await t('moderation.derank_error', message.guild.id), components: [] });
                }
            } else {
                await i.update({ content: await t('moderation.derank_cancelled', message.guild.id), components: [] });
            }
        });

        collector.on('end', async collected => {
            if (collected.size === 0) msg.edit({ content: await t('moderation.derank_timeout', message.guild.id), components: [] }).catch(() => {});
        });
    }
};
