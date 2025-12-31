const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectMongo = async () => {
    try {
        const uri = "mongodb+srv://jimmybcorpo_db_user:Ze11mb15XydyBcKe@cluster0.ulalyre.mongodb.net/?appName=Cluster0";
        await mongoose.connect(uri);
        logger.info('Connecté à MongoDB Atlas avec succès.');
    } catch (error) {
        logger.error('Erreur de connexion à MongoDB:', error);
    }
};

module.exports = connectMongo;