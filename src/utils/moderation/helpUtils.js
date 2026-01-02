const { sendV2Message } = require('../componentUtils');
const { t } = require('../i18n');

/**
 * Checks if arguments are sufficient and sends a usage message if not.
 * @param {Client} client - Discord Client
 * @param {Message} message - Discord Message
 * @param {Object} command - Command Object (module.exports)
 * @param {Array} args - Command Arguments
 * @param {Number} minArgs - Minimum number of arguments required
 * @returns {Promise<boolean>} - True if usage is valid, False if usage message was sent
 */
async function checkUsage(client, message, command, args, minArgs = 1) {
    if (args.length < minArgs) {
        // Try to fetch translated description and usage
        const descriptionKey = `${command.name}.description`;
        const usageKey = `${command.name}.usage`;
        
        let description = await t(descriptionKey, message.guild.id);
        if (description === descriptionKey) {
            description = command.description || await t('help_utils.default_desc', message.guild.id);
        }

        let usageText = await t(usageKey, message.guild.id);
        if (usageText === usageKey) {
            usageText = command.usage ? `+${command.usage}` : await t('help_utils.not_specified', message.guild.id);
        } else {
             // If usage key exists, it might not have the prefix, so we check/add it if needed or assume the key contains the full usage string
             // Standardize: if the key content starts with "Usage:", we leave it. If it's just arguments, we add prefix.
             // But usually usage keys in fr.json are full strings like "**Usage:** `+cmd`".
             // Let's assume if it comes from translation, it's the full string or we present it as is.
             // But wait, the original code does `+${command.usage}`.
             // If I put "Usage: `+lock`" in fr.json, I don't want to prepend `+`.
             // If I put "lock <channel>" in fr.json, I DO want to prepend `+`.
             // Convention in this project seems to be mixed. Some keys have "**Usage:** ...", others might not.
             // Let's look at `fr.json` again.
             // "usage": "**Utilisation:** `+suggestion <message>`"
             // "usage": "Usage: `+antispam <on/off>`"
             // So if it comes from t(), it likely has the full format.
             // I will use the translated string directly if found.
        }

        const examples = command.examples || [];

        const usageTitle = await t('help_utils.usage_incorrect', message.guild.id);
        const cmdLabel = await t('help_utils.command', message.guild.id);
        const descLabel = await t('help_utils.description', message.guild.id);
        const usageLabel = await t('help_utils.usage', message.guild.id);

        // If usageText comes from t() and contains "**Usage:**" or similar, we might want to display it differently?
        // The original code constructs:
        // Usage Incorrect
        // Commande: `name`
        // Description: ...
        // Usage:
        // `+usage`
        
        // If usageText is "**Utilisation:** `+cmd`", then printing it under "Usage:" label is redundant?
        // Let's try to detect if it's a raw format or a full message.
        // Actually, for consistency with `command.usage` (which is just "cmd <args>"), I should probably stick to that format in fr.json keys if I want to keep the layout.
        // BUT, existing keys in fr.json like "suggestion.usage" have "**Utilisation:** ...".
        // So I should probably just print `usageText` and maybe omit `usageLabel` if `usageText` already has it.
        
        let content = `${usageTitle}\n\n` +
                      `${cmdLabel} \`${command.name}\`\n` +
                      `${descLabel} ${description}\n\n`;
        
        if (usageText.includes('**Utilisation:**') || usageText.includes('Usage:')) {
             content += `${usageText}`;
        } else {
             content += `${usageLabel}\n\`${usageText.startsWith('+') ? usageText : '+' + usageText}\``;
        }

        if (examples.length > 0) {
            const examplesLabel = await t('help_utils.examples', message.guild.id);
            content += `\n\n${examplesLabel}\n${examples.map(e => `\`+${e}\``).join('\n')}`;
        }

        await sendV2Message(client, message.channel.id, content, []);
        return false;
    }
    return true;
}

module.exports = { checkUsage };
