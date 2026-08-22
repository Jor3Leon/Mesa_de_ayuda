const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restore() {
  try {
    const rawContent = fs.readFileSync('c:/Users/jherson.rivera/.gemini/antigravity/Mesa_de_ayuda/mesa_de_ayuda/backend/full_db.json', 'utf16le');
    const cleanContent = rawContent.replace(/^\ufeff/, '');
    const data = JSON.parse(cleanContent);
    
    console.log('Restaurando activos...');
    const assets = data.assets || [];
    
    for (const a of assets) {
      // Clean up data for Prisma
      const { id, metrics, customer, ...rest } = a;
      
      // Ensure customerId exists
      const finalData = {
        ...rest,
        customerId: a.customerId || 1,
        // Ensure lastSeenAt is a valid Date or null
        lastSeenAt: a.lastSeenAt ? new Date(a.lastSeenAt).toISOString() : null,
      };

      // In sqlite, we can't use complex objects in update/create without careful mapping
      // But 'rest' should mostly be fine as it's scalars.
      
      await prisma.asset.upsert({
        where: { hostname: a.hostname },
        update: finalData,
        create: finalData
      });
    }

    console.log(`Restauración completada. ${assets.length} activos procesados.`);
  } catch (e) {
    console.error('Error durante la restauración:', e);
  } finally {
    await prisma.$disconnect();
  }
}
restore();
