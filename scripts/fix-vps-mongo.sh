#!/bin/bash
set -e
cd /root/Yako_Guardian

echo "=== 1) Sync MONGO_URI depuis MONGODB_URI ==="
if ! grep -q '^MONGO_URI=' .env 2>/dev/null; then
  if grep -q '^MONGODB_URI=' .env 2>/dev/null; then
    echo "MONGO_URI=$(grep '^MONGODB_URI=' .env | cut -d= -f2-)" >> .env
    echo "MONGO_URI ajoute."
  else
    echo "ERREUR: ni MONGO_URI ni MONGODB_URI dans .env"
    exit 1
  fi
else
  echo "MONGO_URI deja present."
fi

echo "=== 2) Patch mongo.js pour lire les 2 noms ==="
python3 - <<'PY'
from pathlib import Path
p = Path("src/database/mongo.js")
text = p.read_text(encoding="utf-8")
old = "process.env.MONGO_URI"
new = "(process.env.MONGO_URI || process.env.MONGODB_URI)"
if new in text:
    print("mongo.js deja patché.")
elif old in text:
    p.write_text(text.replace(old, new, 1), encoding="utf-8")
    print("mongo.js patché.")
else:
    print("ATTENTION: pattern MONGO_URI introuvable dans mongo.js")
PY

echo "=== 3) Test connexion Mongo ==="
cat > /tmp/test-mongo.js <<'EOF'
require('dotenv').config({ path: '/root/Yako_Guardian/.env' });
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
console.log('URI presente?', Boolean(uri));
if (!uri) {
  console.error('FAIL: aucune URI');
  process.exit(1);
}
mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  .then(async () => {
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log('OK: Mongo connecte');
    process.exit(0);
  })
  .catch((e) => {
    console.error('FAIL:', e.message);
    process.exit(1);
  });
EOF

node /tmp/test-mongo.js

echo "=== 4) Restart PM2 ==="
pm2 restart Yako_Guardian --update-env
pm2 logs Yako_Guardian --lines 30 --nostream
echo "=== FIN ==="
