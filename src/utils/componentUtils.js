const { Routes } = require('discord.js');

/**
 * Wraps content and components into a V2 Container (Type 17) payload.
 * @param {string} content - The text content (will be converted to Type 10 Text Display).
 * @param {Array} componentRows - Array of ActionRowBuilders or raw component objects.
 * @param {string|null} imageUrl - Optional URL for an image (Type 11 Media Display).
 * @returns {Object} The raw message body compatible with Discord API.
 */
function createV2Payload(content, componentRows, imageUrl = null) {
    // Convert builders to JSON if necessary
    const rawComponents = componentRows.map(row => 
        typeof row.toJSON === 'function' ? row.toJSON() : row
    );

    const containerComponents = [
        {
            type: 10, // Text Display
            content: content
        }
    ];

    // Add Image if provided
    if (imageUrl) {
        containerComponents.push({
            type: 12, // Media Gallery
            items: [
                {
                    media: {
                        url: imageUrl
                    }
                }
            ]
        });
    }

    // Add Action Rows (Buttons/Selects)
    containerComponents.push(...rawComponents);

    return {
        flags: 1 << 15, // IS_COMPONENTS_V2
        components: [
            {
                type: 17, // Container
                components: containerComponents
            }
        ]
    };
}

/**
 * Sends a V2 message to a channel via REST API.
 * @param {Client} client - Discord Client.
 * @param {string} channelId - Target Channel ID.
 * @param {string} content - Text content.
 * @param {Array} components - Array of ActionRowBuilders.
 * @param {string|null} imageUrl - Optional Image URL.
 */
async function sendV2Message(client, channelId, content, components, imageUrl = null) {
    const body = createV2Payload(content, components, imageUrl);
    return client.rest.post(Routes.channelMessages(channelId), { body });
}

/**
 * Edits a V2 message in a channel via REST API.
 * @param {Client} client - Discord Client.
 * @param {string} channelId - Target Channel ID.
 * @param {string} messageId - Target Message ID.
 * @param {string} content - New text content.
 * @param {Array} components - New components.
 */
async function editV2Message(client, channelId, messageId, content, components) {
    const body = createV2Payload(content, components);
    return client.rest.patch(Routes.channelMessage(channelId, messageId), { body });
}

/**
 * Updates a message interaction with V2 components via REST API.
 * @param {Client} client - Discord Client.
 * @param {Interaction} interaction - The interaction object.
 * @param {string} content - New text content.
 * @param {Array} components - New components.
 * @param {Array} embeds - Array of embeds (optional) - WARNING: V2 (Type 17) does NOT support embeds directly in the same message container usually.
 */
async function updateV2Interaction(client, interaction, content, components, embeds = []) {
    // Strategy: Defer Update (Type 6) then Edit Message (PATCH)
    // Using Webhook endpoint is safer and supports Ephemeral messages.
    
    try {
        // 1. Defer Update (only if not already deferred/replied)
        if (!interaction.deferred && !interaction.replied) {
            try {
                await client.rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
                    body: { type: 6 } // DEFERRED_UPDATE_MESSAGE
                });
            } catch (ignore) {
                // If it fails (e.g. already ack), just proceed to edit
            }
        }

        // 2. Edit Message via Webhook
        const payload = createV2Payload(content, components);
        return client.rest.patch(Routes.webhookMessage(client.application.id, interaction.token, '@original'), { body: payload });
    } catch (error) {
        console.error('Error in updateV2Interaction:', error); // Ensure this logs
        // Check for Legacy Content conflict error
        if (error.code === 50035 || (error.rawError && error.rawError.code === 50035)) {
             // Specific check for MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2
             const isLegacyError = JSON.stringify(error).includes('MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2');
             
             if (isLegacyError) {
                 console.log("Detected Legacy to V2 conversion failure. Re-creating message.");
                 // Delete the original message (if possible/owned)
                 try {
                     // We can't delete via webhook easily if it's the original response, but we can try channelMessage delete
                     if (interaction.message) {
                        await client.rest.delete(Routes.channelMessage(interaction.channelId, interaction.message.id)).catch(() => {});
                     }
                 } catch (e) {}
                 
                 // Send a new V2 message
                 return sendV2Message(client, interaction.channelId, content, components);
             }
        }

        console.error('Error in updateV2Interaction:', error);
        throw error;
    }
}

/**
 * Replies to an interaction with V2 components via REST API.
 * @param {Client} client - Discord Client.
 * @param {Interaction} interaction - The interaction object.
 * @param {string} content - Text content.
 * @param {Array} components - Components (optional).
 * @param {boolean} ephemeral - Whether the message is ephemeral.
 * @param {Array} embeds - Array of embeds (optional) - STRIPPED for V2.
 */
async function replyV2Interaction(client, interaction, content, components = [], ephemeral = false, embeds = []) {
    const payload = createV2Payload(content, components);
    if (ephemeral) {
        payload.flags = (payload.flags || 0) | 64; // Add EPHEMERAL flag
    }
    
    try {
        // If already deferred, we must EDIT the original response
        if (interaction.deferred) {
            return client.rest.patch(Routes.webhookMessage(client.application.id, interaction.token, '@original'), { body: payload });
        }
        
        // If already replied, we must send a FOLLOW-UP
        if (interaction.replied) {
            return client.rest.post(Routes.webhook(client.application.id, interaction.token), { body: payload });
        }

        // Otherwise, send initial response
        const body = {
            type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
            data: payload
        };
        
        return client.rest.post(Routes.interactionCallback(interaction.id, interaction.token), { body });
    } catch (error) {
        console.error("Error in replyV2Interaction:", error);
        throw error;
    }
}

/**
 * Extracts ActionRows (Type 1) from a component structure (potentially V2).
 * @param {Array} components - The components array from a message.
 * @returns {Array} Array of ActionRow objects.
 */
function extractActionRows(components) {
    let rows = [];
    for (const comp of components) {
        if (comp.type === 1) {
            rows.push(comp);
        } else if (comp.type === 17 && comp.components) {
            // Recursively find ActionRows in Container
            rows = rows.concat(extractActionRows(comp.components));
        }
    }
    return rows;
}

module.exports = { createV2Payload, sendV2Message, editV2Message, updateV2Interaction, replyV2Interaction, extractActionRows };
