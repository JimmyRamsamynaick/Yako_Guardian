const { getGuildConfig } = require('./mongoUtils');

/**
 * Checks and handles automatic deletion of bot responses based on guild configuration.
 * @param {Message} message - The original command message (to get guild ID).
 * @param {Message} replyMsg - The bot's response message to be deleted.
 * @param {string} category - The command category (default: 'moderation').
 */
async function checkAutodeleteResponse(message, replyMsg, category = 'moderation') {
    try {
        if (!replyMsg) return;
        
        const config = await getGuildConfig(message.guild.id);
        const categoryConfig = config.autodelete?.[category.toLowerCase()];
        
        if (categoryConfig?.response && categoryConfig.response > 0) {
            setTimeout(() => {
                replyMsg.delete().catch(() => {
                    // Ignore error if message is already deleted or permissions missing
                });
            }, categoryConfig.response);
        }
    } catch (e) {
        console.error("Autodelete error:", e);
    }
}

module.exports = { checkAutodeleteResponse };
