const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'say',
    description: 'Fait parler le bot',
    category: 'Utils',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

        const content = args.join(' ');
        if (!content) return sendV2Message(client, message.channel.id, "**Usage:** `+say <message>`", []);

        message.delete().catch(() => {});
        // message.channel.send(content);
        await sendV2Message(client, message.channel.id, content, []);
    }
};
