import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { CompanyModel } from '../src/modules/companies/models/company.model';
import { CompanyRepository } from '../src/modules/companies/repositories/company.repository';

interface SeedCompany {
  name: string;
  sources?: string[];
  region?: 'LOCAL' | 'FOREIGN';
  country?: string;
  foundedYear?: string;
  status?: string;
  website?: string;
  contactEmail?: string;
  ratings?: {
    culture?: number;
    workExperience?: number;
    salary?: number;
    learning?: number;
    overall?: number;
    scale?: number;
    appeal?: number;
  };
  slug: string;
  tier?: 'A' | 'B';
  verification?: {
    status?: 'UNVERIFIED' | 'VERIFIED' | 'FAILED';
    score?: number | null;
    checkedAt?: string | null;
    note?: string | null;
  };
  conflicts?: Record<string, unknown>;
  techStack?: string[];
  description?: string;
}

interface SeedFile {
  generatedAt: string;
  count: number;
  companies: SeedCompany[];
}

function sanitizeMongoUriForLog(uri: string): string {
  try {
    // If standard URI, parse or mask credentials
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  } catch {
    return 'mongodb://[REDACTED]';
  }
}

async function seedCompanies(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hiretrail';
  const dbName = process.env.MONGODB_DB_NAME || 'HireTrail';
  console.log(`Connecting to MongoDB (${dbName}) at ${sanitizeMongoUriForLog(mongoUri)}...`);
  await mongoose.connect(mongoUri, { dbName });

  const seedFilePath = path.resolve(import.meta.dirname, '../../../seed/companies.seed.json');
  if (!fs.existsSync(seedFilePath)) {
    console.error(`Seed file not found at ${seedFilePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(seedFilePath, 'utf-8');
  const seedData: SeedFile = JSON.parse(raw);
  console.log(`Loaded ${seedData.companies.length} companies from seed file.`);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedAdminCount = 0;

  for (const c of seedData.companies) {
    const normalizedName = CompanyRepository.normalizeName(c.name);

    // Find existing global company
    const existing = await CompanyModel.findOne({
      ownerId: null,
      normalizedName,
    }).exec();

    if (!existing) {
      await CompanyModel.create({
        ownerId: null,
        name: c.name,
        normalizedName,
        slug: c.slug,
        aliases: [],
        region: c.region,
        country: c.country,
        website: c.website,
        contactEmail: c.contactEmail,
        foundedYear: c.foundedYear,
        tier: c.tier || null,
        techStack: c.techStack || [],
        description: c.description,
        reportRatings: c.ratings,
        conflicts: c.conflicts || {},
        verification: {
          status: c.verification?.status || 'UNVERIFIED',
          score: c.verification?.score || undefined,
          checkedAt: c.verification?.checkedAt ? new Date(c.verification.checkedAt) : undefined,
        },
        source: {
          type: 'SEED',
          ref: c.sources?.join('; ') || 'companies.seed.json',
          importedAt: new Date(),
        },
        createdBy: null,
        deletedAt: null,
      });
      insertedCount++;
    } else {
      // Check if admin edited it
      if (existing.source?.type === 'ADMIN') {
        skippedAdminCount++;
        continue;
      }

      // Upsert non-admin fields
      await CompanyModel.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: c.name,
            slug: c.slug,
            region: c.region,
            country: c.country,
            website: c.website,
            contactEmail: c.contactEmail,
            foundedYear: c.foundedYear,
            tier: c.tier || null,
            reportRatings: c.ratings,
            conflicts: c.conflicts || {},
            verification: {
              status: c.verification?.status || 'UNVERIFIED',
              score: c.verification?.score || undefined,
              checkedAt: c.verification?.checkedAt ? new Date(c.verification.checkedAt) : undefined,
            },
            'source.importedAt': new Date(),
          },
        },
      ).exec();
      updatedCount++;
    }
  }

  console.log('--- Seed Completed ---');
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped Admin-Modified: ${skippedAdminCount}`);
  await mongoose.disconnect();
}

seedCompanies().catch((err) => {
  console.error('Failed to seed companies:', err);
  process.exit(1);
});
