const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'muterole',
    description: 'muterole.description',
    category: 'Moderation',
    usage: 'muterole.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('muterole.admin_only', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};

        // 1. Direct Set (Backward Compatibility)
        if (args[0]) {
            let roleId;
            if (message.mentions.roles.size > 0) roleId = message.mentions.roles.first().id;
            else roleId = args[0].replace(/[<@&>]/g, '');

            const role = message.guild.roles.cache.get(roleId);
            if (!role) {
                return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('common.role_not_found', message.guild.id), 'error')] });
            }

            const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('common.configuration_title', message.guild.id), `${THEME.icons.loading} ${await t('common.processing', message.guild.id)}`, 'loading')] });

            config.moderation.muteRole = roleId;
            config.markModified('moderation');
            await config.save();

            return replyMsg.edit({ embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('muterole.success', message.guild.id, { role: role.name }), 'success')] });
        }

        // 2. Interactive Mode
        const currentRole = config.moderation.muteRole ? `<@&${config.moderation.muteRole}>` : await t('muterole.no_role', message.guild.id);
        
        const embed = createEmbed(
            await t('muterole.panel_title', message.guild.id),
            await t('muterole.panel_desc', message.guild.id, { current: currentRole }),
            'default'
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('muterole_generate')
                .setLabel(await t('muterole.btn_generate', message.guild.id))
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚙️'),
            new ButtonBuilder()
                .setCustomId('muterole_select')
                .setLabel(await t('muterole.btn_select', message.guild.id))
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🖱️')
        );

        const msg = await message.channel.send({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({ 
            filter: i => i.user.id === message.author.id, 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'muterole_generate') {
                await i.deferUpdate();
                
                // Start generation
                await msg.edit({ 
                embeds: [createEmbed(await t('muterole.generation_title', message.guild.id), `${THEME.icons.loading} ${await t('muterole.generation_process', message.guild.id)}`, 'loading')],
                components: [] 
            });

                try {
                    // Create Role
                    const muteRoleName = await t('muterole.role_name_default', message.guild.id);
                    const muteRole = await message.guild.roles.create({
                        name: muteRoleName,
                        color: '#818386', // Greyish
                        permissions: [],
                        reason: 'Auto-generated Mute Role'
                    });

                    // Update Channels
                    const channels = message.guild.channels.cache;
                    for (const [id, channel] of channels) {
                        try {
                            await channel.permissionOverwrites.edit(muteRole, {
                                SendMessages: false,
                                AddReactions: false,
                                Speak: false,
                                RequestToSpeak: false,
                                CreatePublicThreads: false,
                                CreatePrivateThreads: false,
                                SendMessagesInThreads: false
                            });
                        } catch (err) {
                            // Ignore errors for channels we can't see/edit
                        }
                    }

                    // Save to DB
                    config.moderation.muteRole = muteRole.id;
                    config.markModified('moderation');
                    await config.save();

                    await msg.edit({ embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('muterole.generated_success', message.guild.id, { role: muteRole.name }), 'success')] });
                } catch (error) {
                    console.error(error);
                    await msg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('muterole.interaction_error', message.guild.id), 'error')] });
                }
                collector.stop();
            }

            if (i.customId === 'muterole_select') {
                await i.deferUpdate();

                // Filter roles (exclude managed and @everyone)
                const roles = message.guild.roles.cache
                    .filter(r => !r.managed && r.id !== message.guild.id)
                    .sort((a, b) => b.position - a.position)
                    .first(25); // Max 25 for select menu

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('muterole_selection')
                    .setPlaceholder(await t('muterole.select_placeholder', message.guild.id))
                    .addOptions(roles.map(r => ({
                        label: r.name,
                        value: r.id,
                        description: `ID: ${r.id}`
                    })));

                const selectRow = new ActionRowBuilder().addComponents(selectMenu);

                await msg.edit({ components: [selectRow] });
            }

            if (i.customId === 'muterole_selection') {
                await i.deferUpdate();
                const selectedId = i.values[0];
                const selectedRole = message.guild.roles.cache.get(selectedId);

                if (!selectedRole) {
                     return msg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('common.role_not_found', message.guild.id), 'error')], components: [] });
                }

                config.moderation.muteRole = selectedId;
                config.markModified('moderation');
                await config.save();

                await msg.edit({ 
                    embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('muterole.selected_success', message.guild.id, { role: selectedRole.name }), 'success')],
                    components: [] 
                });
                collector.stop();
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                msg.edit({ components: [] }).catch(() => {});
            }
        });
    }
};
