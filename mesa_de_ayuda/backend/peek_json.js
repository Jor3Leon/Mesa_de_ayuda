const fs = require('fs');
const content = fs.readFileSync('c:/Users/jherson.rivera/.gemini/antigravity/Mesa_de_ayuda/mesa_de_ayuda/backend/full_db.json', 'utf16le');
try {
  const data = JSON.parse(content);
  if (Array.isArray(data)) {
    console.log(`Detected array of ${data.length} items`);
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log(`Detected object with keys: ${Object.keys(data).join(', ')}`);
    if (data.assets) console.log(`Assets: ${data.assets.length}`);
  }
} catch (e) {
  console.error(e);
}
