/**
 * One-shot data migration: normalize event categories to EventCategory enum values.
 *
 * Run BEFORE the Prisma migration that changes category from String? to EventCategory.
 *
 * Mapping (case-insensitive):
 *   music / concert / live music → MUSIC
 *   sports / sport / football / rugby / athletics → SPORTS
 *   conference / summit / seminar / symposium → CONFERENCE
 *   theater / theatre / drama / play → THEATER
 *   festival / fest / carnival → FESTIVAL
 *   comedy / stand-up / standup → COMEDY
 *   exhibition / expo / gallery / art → EXHIBITION
 *   workshop / training / bootcamp / hackathon → WORKSHOP
 *   everything else / null → OTHER
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const CATEGORY_MAP: Record<string, string> = {
  // MUSIC
  music: 'MUSIC', concert: 'MUSIC', 'live music': 'MUSIC', 'live-music': 'MUSIC',
  // SPORTS
  sports: 'SPORTS', sport: 'SPORTS', football: 'SPORTS', rugby: 'SPORTS',
  athletics: 'SPORTS', basketball: 'SPORTS', cricket: 'SPORTS', tennis: 'SPORTS',
  // CONFERENCE
  conference: 'CONFERENCE', summit: 'CONFERENCE', seminar: 'CONFERENCE',
  symposium: 'CONFERENCE', meetup: 'CONFERENCE', networking: 'CONFERENCE',
  // THEATER
  theater: 'THEATER', theatre: 'THEATER', drama: 'THEATER', play: 'THEATER',
  performance: 'THEATER',
  // FESTIVAL
  festival: 'FESTIVAL', fest: 'FESTIVAL', carnival: 'FESTIVAL', celebration: 'FESTIVAL',
  // COMEDY
  comedy: 'COMEDY', 'stand-up': 'COMEDY', standup: 'COMEDY', 'stand up': 'COMEDY',
  // EXHIBITION
  exhibition: 'EXHIBITION', expo: 'EXHIBITION', gallery: 'EXHIBITION', art: 'EXHIBITION',
  'art show': 'EXHIBITION',
  // WORKSHOP
  workshop: 'WORKSHOP', training: 'WORKSHOP', bootcamp: 'WORKSHOP', hackathon: 'WORKSHOP',
  class: 'WORKSHOP', course: 'WORKSHOP',
};

const VALID_ENUM_VALUES = new Set([
  'MUSIC', 'SPORTS', 'CONFERENCE', 'THEATER', 'FESTIVAL',
  'COMEDY', 'EXHIBITION', 'WORKSHOP', 'OTHER',
]);

function normalizeCategory(raw: string | null): string {
  if (!raw) return 'OTHER';
  // Already a valid enum value
  if (VALID_ENUM_VALUES.has(raw.toUpperCase())) return raw.toUpperCase();
  // Try case-insensitive map lookup
  const lower = raw.toLowerCase().trim();
  return CATEGORY_MAP[lower] || 'OTHER';
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL not set');

  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);

  console.log('🔄  Normalizing event categories...\n');

  // Fetch all events (id + current category)
  const events = await (prisma as any).event.findMany({
    select: { id: true, category: true },
  });

  console.log(`  Found ${events.length} events total`);

  const counts: Record<string, number> = {};
  let updated = 0;

  for (const event of events) {
    const normalized = normalizeCategory(event.category);
    counts[normalized] = (counts[normalized] || 0) + 1;

    // Only update if value changes
    if (event.category !== normalized) {
      await (prisma as any).event.update({
        where: { id: event.id },
        data: { category: normalized },
      });
      updated++;
    }
  }

  console.log(`\n  Updated ${updated} rows`);
  console.log('\n  Category distribution after normalization:');
  for (const [cat, count] of Object.entries(counts).sort()) {
    console.log(`    ${cat.padEnd(12)} ${count}`);
  }

  console.log('\n✅  Category normalization complete.');

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('❌  Migration failed:', err);
  process.exit(1);
});
