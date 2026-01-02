const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ComponentType 
} = require('discord.js');
const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const GlobalSettings = require('../../database/models/GlobalSettings');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'secur',
    aliases: ['security', 'panel'],
    run: async (client, message, args) => {
        // --- OWNER COMMAND: +secur invite <on/off> ---
        if (args[0]?.toLowerCase() === 'invite') {
            if (!await isBotOwner(message.author.id)) return;
            
            const state = args[1]?.toLowerCase();
            if (!['on', 'off'].includes(state)) {
                return sendV2Message(client, message.channel.id, await t('secur.owner_usage', message.guild.id), []);
            }
            
            await GlobalSettings.findOneAndUpdate({ clientId: client.user.id }, { securInvite: state === 'on' }, { upsert: true });
            return sendV2Message(client, message.channel.id, await t('secur.owner_success', message.guild.id, { state: state.toUpperCase() }), []);
        }

        // Only whitelisted users should access this (to be implemented)
        
        // Initial State
        const settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(message.guild.id) || {
            guild_id: message.guild.id,
            raid_log_channel: null,
            antitoken_level: 'off',
            antiupdate: 'off',
            antichannel: 'off',
            antirole: 'off',
            antiwebhook: 'off',
            antiunban: 'off',
            antibot: 'off',
            antiban: 'off',
            antieveryone: 'off',
            antideco: 'off'
        };

        // If no settings exist, create them
        if (!db.prepare('SELECT guild_id FROM guild_settings WHERE guild_id = ?').get(message.guild.id)) {
            db.prepare('INSERT INTO guild_settings (guild_id) VALUES (?)').run(message.guild.id);
        }

        const generateStatusText = async (s) => {
            const title = await t('secur.panel_title', message.guild.id);
            const modules = await t('secur.modules_title', message.guild.id);
            const footer = await t('secur.footer', message.guild.id);
            
            const tr = async (key) => {
                if (key === 'on') return await t('common.state_on', message.guild.id);
                if (key === 'off') return await t('common.state_off', message.guild.id);
                if (key === 'max') return await t('common.state_max', message.guild.id);
                return key;
            };

            return `${title}
            
${modules}
\`${await t('secur.module_antitoken', message.guild.id)}\` : ${await tr(s.antitoken_level)}
\`${await t('secur.module_antiupdate', message.guild.id)}\` : ${await tr(s.antiupdate)}
\`${await t('secur.module_antichannel', message.guild.id)}\` : ${await tr(s.antichannel)}
\`${await t('secur.module_antirole', message.guild.id)}\` : ${await tr(s.antirole)}
\`${await t('secur.module_antiwebhook', message.guild.id)}\` : ${await tr(s.antiwebhook)}
\`${await t('secur.module_antiunban', message.guild.id)}\` : ${await tr(s.antiunban)}
\`${await t('secur.module_antibot', message.guild.id)}\` : ${await tr(s.antibot)}
\`${await t('secur.module_antiban', message.guild.id)}\` : ${await tr(s.antiban)}
\`${await t('secur.module_antieveryone', message.guild.id)}\` : ${await tr(s.antieveryone)}
\`${await t('secur.module_antideco', message.guild.id)}\` : ${await tr(s.antideco)}


${footer}`;
        };

        const rowSelect = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('secur_select_module')
                    .setPlaceholder(await t('secur.placeholder', message.guild.id))
                    .addOptions([
                        { label: await t('secur.module_antitoken', message.guild.id), value: 'antitoken_level', description: await t('secur.desc_antitoken', message.guild.id), emoji: '🚪' },
                        { label: await t('secur.module_antibot', message.guild.id), value: 'antibot', description: await t('secur.desc_antibot', message.guild.id), emoji: '🤖' },
                        { label: await t('secur.module_antiban', message.guild.id), value: 'antiban', description: await t('secur.desc_antiban', message.guild.id), emoji: '🔨' },
                        { label: await t('secur.module_antichannel', message.guild.id), value: 'antichannel', description: await t('secur.desc_antichannel', message.guild.id), emoji: '📺' },
                        { label: await t('secur.module_antirole', message.guild.id), value: 'antirole', description: await t('secur.desc_antirole', message.guild.id), emoji: '🎭' },
                        { label: await t('secur.module_antiwebhook', message.guild.id), value: 'antiwebhook', description: await t('secur.desc_antiwebhook', message.guild.id), emoji: '🔗' },
                        { label: await t('secur.module_antieveryone', message.guild.id), value: 'antieveryone', description: await t('secur.desc_antieveryone', message.guild.id), emoji: '📢' },
                        { label: await t('secur.module_antiupdate', message.guild.id), value: 'antiupdate', description: await t('secur.desc_antiupdate', message.guild.id), emoji: '⚙️' },
                        { label: await t('secur.module_antideco', message.guild.id), value: 'antideco', description: await t('secur.desc_antideco', message.guild.id), emoji: '🔌' },
                    ])
            );

        const rowButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('secur_toggle_all_on')
                    .setLabel(await t('secur.btn_all_on', message.guild.id))
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('secur_toggle_all_max')
                    .setLabel(await t('secur.btn_all_max', message.guild.id))
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('secur_toggle_all_off')
                    .setLabel(await t('secur.btn_all_off', message.guild.id))
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('secur_refresh')
                    .setLabel(await t('secur.btn_refresh', message.guild.id))
                    .setStyle(ButtonStyle.Secondary)
            );

        try {
            await sendV2Message(client, message.channel.id, await generateStatusText(settings), [rowSelect, rowButtons]);
        } catch (error) {
            console.error("Error sending V2 secur panel:", error);
            await sendV2Message(client, message.channel.id, await t('secur.error_display', message.guild.id), []);
        }
    }
};
