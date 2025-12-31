const { sendLog } = require('../../utils/logManager');

module.exports = {
    name: 'guildMemberRemove',
    async execute(client, member) {
        const description = `Le membre ${member} (\`${member.user.tag}\`) a quitté le serveur.`;
        
        const fields = [
            { name: 'ID', value: member.id, inline: true }
        ];
        
        sendLog(member.guild, '📤 Membre Parti', description, '#FF0000', fields, member.user);
    }
};