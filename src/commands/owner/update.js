const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const GlobalSettings = require('../../database/models/GlobalSettings');
const { exec } = require('child_process');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'updatebot',
    description: 'Mise à jour du bot',
    category: 'Owner',
    aliases: ['update', 'autoupdate'],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();

        // --- AUTOUPDATE ---
        if (commandName === 'autoupdate') {
            const state = args[0];
            if (!state || !['on', 'off'].includes(state.toLowerCase())) {
                return sendV2Message(client, message.channel.id, await t('update.usage_autoupdate', message.guild.id), []);
            }

            const isEnabled = state.toLowerCase() === 'on';
            await GlobalSettings.findOneAndUpdate(
                { clientId: client.user.id },
                { autoUpdate: isEnabled },
                { upsert: true, new: true }
            );

            const statusStr = isEnabled ? await t('common.enabled', message.guild.id) : await t('common.disabled', message.guild.id);
            return sendV2Message(client, message.channel.id, await t('update.autoupdate_status', message.guild.id, { status: statusStr }), []);
        }

        // --- UPDATEBOT ---
        if (commandName === 'updatebot' || commandName === 'update') {
            await sendV2Message(client, message.channel.id, await t('update.checking_updates', message.guild.id), []);
            
            // Simulation or real git pull
            exec('git pull', async (error, stdout, stderr) => {
                if (error) {
                    return sendV2Message(client, message.channel.id, await t('update.update_error', message.guild.id, { error: error.message }), []);
                }
                
                if (stdout.includes('Already up to date')) {
                    return sendV2Message(client, message.channel.id, await t('update.already_updated', message.guild.id), []);
                }

                await sendV2Message(client, message.channel.id, await t('update.update_downloaded', message.guild.id, { output: stdout }), []);
                
                // Restart process (if managed by PM2 or similar)
                process.exit(0); 
            });
        }
    }
};
