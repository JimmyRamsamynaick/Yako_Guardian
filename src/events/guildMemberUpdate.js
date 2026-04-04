const { getGuildConfig } = require('../utils/mongoUtils');
const { t } = require('../utils/i18n');
const { createEmbed } = require('../utils/design');
const { sendBoostThanks } = require('../utils/boostUtils');

// Cooldown to avoid double-sending (messageCreate + guildMemberUpdate)
const boostCooldown = new Map();

module.exports = {
    name: 'guildMemberUpdate',
    async execute(client, oldMember, newMember) {
        // Check if boost status changed or number of boosts changed
        const oldBoosts = oldMember.premiumSubscriptionCount || 0;
        const newBoosts = newMember.premiumSubscriptionCount || 0;

        // If user just boosted (was not boosting, now is boosting) OR added more boosts
        if (newBoosts > oldBoosts) {
            const boostDiff = newBoosts - oldBoosts;
            const cooldownKey = `${newMember.guild.id}-${newMember.id}`;
            
            // If already handled via messageCreate recently, skip
            if (boostCooldown.has(cooldownKey) && Date.now() - boostCooldown.get(cooldownKey) < 5000) {
                return;
            }
            boostCooldown.set(cooldownKey, Date.now());

            try {
                // Send one message per new boost
                for (let i = 1; i <= boostDiff; i++) {
                    // Current count at this step of the loop
                    const currentCount = newMember.guild.premiumSubscriptionCount - (boostDiff - i);
                    await sendBoostThanks(client, newMember.guild, newMember, currentCount);
                    
                    // Small delay between messages if multiple boosts
                    if (boostDiff > 1 && i < boostDiff) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            } catch (error) {
                console.error(`Error in guildMemberUpdate (Boost detection) for guild ${newMember.guild.id}:`, error);
            }
        }
    }
};
