const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectMongo = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            logger.warn('MONGO_URI absente du .env, connexion MongoDB ignorée.');
            return;
        }
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        logger.info('Connecté à MongoDB Atlas avec succès.');
    } catch (error) {
        logger.error('Erreur de connexion à MongoDB:', error);
    }
};

module.exports = connectMongo;