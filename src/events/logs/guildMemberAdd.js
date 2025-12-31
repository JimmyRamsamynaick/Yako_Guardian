const { sendLog } = require('../../utils/logManager');

module.exports = {
    name: 'guildMemberAdd',
    async execute(client, member) {
        const description = `Le membre ${member} (\`${member.user.tag}\`) a rejoint le serveur.`;
        const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 1000 / 60 / 60 / 24);
        
        const fields = [
            { name: 'Compte créé il y a', value: `${accountAge} jours`, inline: true },
            { name: 'ID', value: member.id, inline: true }
        ];
        
        sendLog(member.guild, '📥 Membre Rejoint', description, '#00FF00', fields, member.user);
    }
};