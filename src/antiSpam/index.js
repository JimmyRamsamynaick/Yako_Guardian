const { AntiSpamManager, shouldIgnoreMessage } = require('./AntiSpamManager');

const manager = new AntiSpamManager();

module.exports = {
    handleAntiSpam: manager.handleMessage.bind(manager),
    shouldIgnoreMessage
};
