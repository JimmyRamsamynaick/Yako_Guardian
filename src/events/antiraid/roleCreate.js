const { AuditLogEvent } = require('discord.js');
const { checkAntiraid } = require('../../utils/antiraid');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'roleCreate',
    async execute(client, role) {
        const executor = await getExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
        if (!executor) return;

        const member = await role.guild.members.fetch(executor.id).catch(() => null);
        if (!member) return;

        const triggered = await checkAntiraid(client, role.guild, member, 'antirole');
        if (triggered) {
            role.delete(await t('antiraid.reasons.anti_role', role.guild.id)).catch(() => {});
        }
    }
};
