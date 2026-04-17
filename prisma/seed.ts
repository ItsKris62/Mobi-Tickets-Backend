import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as argon2 from 'argon2'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// OWASP-recommended argon2id params — must match auth.service.ts
const ARGON2_PARAMS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MB
  timeCost: 2,
  parallelism: 1,
} as const

async function main() {
  const databaseUrl = process.env['DATABASE_URL']
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Use the same pg adapter pattern as the backend
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }, // Required for Supabase
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter } as any)

  console.log('🌱 Seeding demo accounts...')
  console.log('🔌 Connecting to database...')

  // Hash the shared demo password using argon2id (same as auth.service.ts)
  const password = 'MobiDemo@2026'
  console.log('🔐 Hashing password (this may take a moment)...')
  const passwordHash = await argon2.hash(password, ARGON2_PARAMS)
  console.log('✅ Password hashed')

  // ─────────────────────────────────────────────────────────────────
  // 1. ADMIN
  // ─────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mobi.com' },
    update: {
      passwordHash,
      isVerified: true,
      isActive: true,
      isBanned: false,
    },
    create: {
      email: 'admin@mobi.com',
      passwordHash,
      role: 'ADMIN',
      fullName: 'Mobi Admin',
      phoneNumber: '+254700000001',
      county: 'Nairobi',
      city: 'Nairobi',
      isVerified: true,
      isActive: true,
      emergencyContact: {
        name: 'System Support',
        phoneNumber: '+254700000099',
        relationship: 'other',
      },
    },
  })
  console.log(`✅ Admin created/updated: ${admin.email}`)

  // ─────────────────────────────────────────────────────────────────
  // 2. ORGANIZER
  // ─────────────────────────────────────────────────────────────────
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@mobi.com' },
    update: {
      passwordHash,
      isVerified: true,
      isActive: true,
      isBanned: false,
    },
    create: {
      email: 'organizer@mobi.com',
      passwordHash,
      role: 'ORGANIZER',
      fullName: 'Amina Organizer',
      phoneNumber: '+254711000002',
      county: 'Nairobi',
      city: 'Westlands',
      isVerified: true,
      isActive: true,
      emergencyContact: {
        name: 'Kariuki Mwangi',
        phoneNumber: '+254711000099',
        relationship: 'spouse',
      },
    },
  })
  console.log(`✅ Organizer created/updated: ${organizer.email}`)

  // ─────────────────────────────────────────────────────────────────
  // 3. ORGANIZER 2
  // ─────────────────────────────────────────────────────────────────
  const organizer2 = await prisma.user.upsert({
    where: { email: 'organizer2@mobi.com' },
    update: {
      passwordHash,
      isVerified: true,
      isActive: true,
      isBanned: false,
    },
    create: {
      email: 'organizer2@mobi.com',
      passwordHash,
      role: 'ORGANIZER',
      fullName: 'Brian Otieno',
      phoneNumber: '+254722000010',
      county: 'Kisumu',
      city: 'Kisumu',
      isVerified: true,
      isActive: true,
      emergencyContact: {
        name: 'Akinyi Otieno',
        phoneNumber: '+254722000011',
        relationship: 'sibling',
      },
    },
  })
  console.log(`✅ Organizer 2 created/updated: ${organizer2.email}`)

  // ─────────────────────────────────────────────────────────────────
  // 4. ATTENDEE 1
  // ─────────────────────────────────────────────────────────────────
  const attendee1 = await prisma.user.upsert({
    where: { email: 'attendee1@mobi.com' },
    update: {
      passwordHash,
      isVerified: true,
      isActive: true,
      isBanned: false,
    },
    create: {
      email: 'attendee1@mobi.com',
      passwordHash,
      role: 'ATTENDEE',
      fullName: 'John Kamau',
      phoneNumber: '+254722000003',
      county: 'Nairobi',
      city: 'Kasarani',
      isVerified: true,
      isActive: true,
      emergencyContact: {
        name: 'Grace Kamau',
        phoneNumber: '+254722000098',
        relationship: 'sibling',
      },
    },
  })
  console.log(`✅ Attendee 1 created/updated: ${attendee1.email}`)

  // ─────────────────────────────────────────────────────────────────
  // 4. ATTENDEE 2
  // ─────────────────────────────────────────────────────────────────
  const attendee2 = await prisma.user.upsert({
    where: { email: 'attendee2@mobi.com' },
    update: {
      passwordHash,
      isVerified: true,
      isActive: true,
      isBanned: false,
    },
    create: {
      email: 'attendee2@mobi.com',
      passwordHash,
      role: 'ATTENDEE',
      fullName: 'Fatuma Wanjiku',
      phoneNumber: '+254733000004',
      county: 'Mombasa',
      city: 'Mombasa',
      isVerified: true,
      isActive: true,
      emergencyContact: {
        name: 'Hassan Wanjiku',
        phoneNumber: '+254733000097',
        relationship: 'parent',
      },
    },
  })
  console.log(`✅ Attendee 2 created/updated: ${attendee2.email}`)

  await prisma.$disconnect()
  await pool.end()

  console.log('\n🎉 All demo accounts seeded successfully!')
  console.log('\n📋 Login Credentials (all use the same password):')
  console.log('─────────────────────────────────────────────────')
  console.log(`  🔑 Password: ${password}`)
  console.log('─────────────────────────────────────────────────')
  console.log(`  👑 Admin      → admin@mobi.com`)
  console.log(`  🎪 Organizer  → organizer@mobi.com`)
  console.log(`  🎪 Organizer2 → organizer2@mobi.com`)
  console.log(`  🎟️  Attendee1  → attendee1@mobi.com`)
  console.log(`  🎟️  Attendee2  → attendee2@mobi.com`)
  console.log('─────────────────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
