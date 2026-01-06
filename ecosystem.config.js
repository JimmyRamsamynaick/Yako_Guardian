module.exports = {
  apps: [{
    name: "YakoGuardian",
    script: "./src/index.js",
    env: {
      NODE_ENV: "production",
    },
    // Redémarrer si la mémoire dépasse 1Go (sécurité)
    max_memory_restart: "1G",
    // Logs avec horodatage
    time: true
  }]
};