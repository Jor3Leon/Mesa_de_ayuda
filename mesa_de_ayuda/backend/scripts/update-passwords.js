const crypto = require('crypto');

const NEON_HTTP_URL = 'https://ep-late-violet-avbxxfr1.c-11.us-east-1.aws.neon.tech/sql';
const CONN_STRING = 'postgresql://neondb_owner:npg_PYJx4QFCUXc6@ep-late-violet-avbxxfr1.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function sql(query, params = []) {
  const res = await fetch(NEON_HTTP_URL, {
    method: 'POST',
    headers: {
      'Neon-Connection-String': CONN_STRING,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, params }),
  });

  const data = await res.json();
  if (!res.ok || data.message) {
    throw new Error(data.message || JSON.stringify(data));
  }
  return data;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function updatePasswords() {
  const newPassword = 'Leon8424*';
  console.log('🔄 Actualizando contraseñas de todos los usuarios a:', newPassword);

  // Get all users
  const usersRes = await sql('SELECT "id", "name", "username" FROM "User" ORDER BY "id" ASC;');
  console.log(`Encontrados ${usersRes.rows.length} usuarios:`);

  for (const user of usersRes.rows) {
    const newHash = hashPassword(newPassword);
    await sql('UPDATE "User" SET "passwordHash" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2;', [newHash, user.id]);
    console.log(`  ✅ [${user.username}] ${user.name} - Contraseña actualizada con éxito.`);
  }

  console.log('\n🎉 ¡Todas las contraseñas han sido actualizadas en la base de datos Neon!');
}

updatePasswords().catch(err => {
  console.error('❌ Error actualizando contraseñas:', err);
  process.exit(1);
});
