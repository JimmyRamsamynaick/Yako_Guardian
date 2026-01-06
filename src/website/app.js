const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');
const { generateKey } = require('../utils/subscription');
const logger = require('../utils/logger');
const Database = require('better-sqlite3');
const db = new Database(path.join(process.cwd(), 'data', 'database.sqlite'));
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail', // Default to Gmail, can be changed via host/port if needed
    auth: {
        user: process.env.SMTP_EMAIL, // Your email address
        pass: process.env.SMTP_PASSWORD // Your email password or App Password
    }
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Request License Route
app.post('/request-license', async (req, res) => {
    const { email, paypal_username } = req.body;
    
    // Store request in DB
    try {
        db.prepare('INSERT INTO purchase_requests (email, paypal_username, created_at) VALUES (?, ?, ?)').run(email, paypal_username, Date.now());
        
        logger.info(`📝 Nouvelle demande de licence : Email=${email}, Pseudo=${paypal_username}`);

        // Send Email Notification
        if (process.env.SMTP_EMAIL && process.env.SMTP_EMAIL.includes('@') && process.env.SMTP_PASSWORD && !process.env.SMTP_PASSWORD.includes('votre_mot_de_passe')) {
             const mailOptions = {
                from: process.env.SMTP_EMAIL,
                to: 'jimmyramsamynaick@gmail.com',
                subject: '💰 Nouvelle demande de licence Yako Guardian',
                text: `Une nouvelle demande de paiement a été reçue !\n\n👤 Pseudo PayPal : ${paypal_username}\n📧 Email : ${email}\n\nVérifiez votre PayPal et générez une clé si le paiement est valide.`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    logger.error('Erreur lors de l\'envoi de l\'email:', error);
                } else {
                    logger.info('Email de notification envoyé: ' + info.response);
                }
            });
        } else {
            logger.warn('⚠️ Notification Email non envoyée : Identifiants SMTP non configurés dans .env');
        }
        
        // Redirect to confirmation
        res.redirect('/confirm.html');
    } catch (error) {
        logger.error('Error saving request:', error);
        res.status(500).send("Erreur interne lors de l'enregistrement.");
    }
});

function startServer() {
    app.listen(PORT, () => {
        logger.info(`🌐 Website running on http://localhost:${PORT} (Accessible via http://payement-guardian.myddns.me:${PORT})`);
    });
}

module.exports = { startServer };
