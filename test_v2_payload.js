const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createV2Payload } = require('./src/utils/componentUtils');

const row = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId('test_btn')
            .setLabel('Test')
            .setStyle(ButtonStyle.Primary)
    );

const payload = createV2Payload("Test Content", [row]);

console.log(JSON.stringify(payload, null, 2));

if (payload.content) {
    console.error("FAIL: Root 'content' field present!");
} else {
    console.log("PASS: No root 'content' field.");
}

if (payload.flags !== (1 << 15)) {
    console.error("FAIL: Incorrect flags!");
} else {
    console.log("PASS: Flags correct.");
}

const container = payload.components[0];
if (container.type !== 17) {
    console.error("FAIL: Top component is not type 17 Container");
}

const textDisplay = container.components[0];
if (textDisplay.type !== 10) {
    console.error("FAIL: First child is not type 10 Text Display");
}

if (textDisplay.content !== "Test Content") {
    console.error("FAIL: Content not in Text Display");
}

console.log("Validation complete.");
