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

module.exports = {
    name: 'secur',
    aliases: ['security', 'panel'],
    run: async (client, message, args) => {
        // --- OWNER COMMAND: +secur invite <on/off> ---
        if (args[0]?.toLowerCase() === 'invite') {
            if (!await isBotOwner(message.author.id)) return;
            
            const state = args[1]?.toLowerCase();
            if (!['on', 'off'].includes(state)) {
                return sendV2Message(client, message.channel.id, "❌ Usage: `+secur invite <on/off>`", []);
            }
            
            await GlobalSettings.findOneAndUpdate({ clientId: client.user.id }, { securInvite: state === 'on' }, { upsert: true });
            return sendV2Message(client, message.channel.id, `✅ Sécurité Invite (Auto-Leave) : **${state.toUpperCase()}**`, []);
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

        const generateStatusText = (s) => {
            return `**YAKO GUARDIAN - PANNEAU DE SÉCURITÉ**
            
**🛡️ Modules Antiraid**
\`Anti-Token\` : ${s.antitoken_level}
\`Anti-Update\` : ${s.antiupdate}
\`Anti-Channel\` : ${s.antichannel}
\`Anti-Role\` : ${s.antirole}
\`Anti-Webhook\` : ${s.antiwebhook}
\`Anti-Unban\` : ${s.antiunban}
\`Anti-Bot\` : ${s.antibot}
\`Anti-Ban\` : ${s.antiban}
\`Anti-Everyone\` : ${s.antieveryone}
\`Anti-Deco\` : ${s.antideco}

_Utilisez le menu ci-dessous pour configurer un module._`;
        };

        const rowSelect = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('secur_select_module')
                    .setPlaceholder('Choisir un module à configurer')
                    .addOptions([
                        { label: 'Anti-Token', value: 'antitoken_level', description: 'Protection contre les tokens/selfbots', emoji: '🚪' },
                        { label: 'Anti-Bot', value: 'antibot', description: 'Empêche l\'ajout de bots non vérifiés', emoji: '🤖' },
                        { label: 'Anti-Ban', value: 'antiban', description: 'Limite les bannissements massifs', emoji: '🔨' },
                        { label: 'Anti-Channel', value: 'antichannel', description: 'Protection des salons', emoji: '📺' },
                        { label: 'Anti-Role', value: 'antirole', description: 'Protection des rôles', emoji: '🎭' },
                        { label: 'Anti-Webhook', value: 'antiwebhook', description: 'Protection des webhooks', emoji: '🔗' },
                        { label: 'Anti-Everyone', value: 'antieveryone', description: 'Anti @everyone / @here', emoji: '📢' },
                        { label: 'Anti-Update', value: 'antiupdate', description: 'Anti modification serveur', emoji: '⚙️' },
                        { label: 'Anti-Deco', value: 'antideco', description: 'Anti déconnexion', emoji: '🔌' },
                    ])
            );

        const rowButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('secur_toggle_all_on')
                    .setLabel('Tout Activer')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('secur_toggle_all_max')
                    .setLabel('Tout Max')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('secur_toggle_all_off')
                    .setLabel('Tout Désactiver')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('secur_refresh')
                    .setLabel('Rafraîchir')
                    .setStyle(ButtonStyle.Secondary)
            );

        try {
            await sendV2Message(client, message.channel.id, generateStatusText(settings), [rowSelect, rowButtons]);
        } catch (error) {
            console.error("Error sending V2 secur panel:", error);
            await sendV2Message(client, message.channel.id, "❌ Erreur lors de l'affichage du panneau V2.", []);
        }
    }
};
