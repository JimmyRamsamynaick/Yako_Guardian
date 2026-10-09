module.exports = {
  apps: [{
    name: "YakoGuardian",
    script: "./src/index.js",
    cwd: __dirname,
    env: {
      NODE_ENV: "production",
    },
    // Charge le .env du projet (MONGO_URI / MONGODB_URI / TOKEN…)
    env_file: ".env",
    // Redémarrer si la mémoire dépasse 1Go (sécurité)
    max_memory_restart: "1G",
    // Logs avec horodatage
    time: true
  }]
};