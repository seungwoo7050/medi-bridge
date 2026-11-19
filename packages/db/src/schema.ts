import { boolean, doublePrecision, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const hospitals = pgTable('hospitals', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  ykiho: text('ykiho').unique(),
  name: text('name').notNull(),
  department: text('department').notNull(),
  sido: text('sido').notNull(),
  sigungu: text('sigungu').notNull(),
  roadAddress: text('road_address').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  rating: doublePrecision('rating'),
  reviewCount: integer('review_count').notNull().default(0),
  hiraVerified: boolean('hira_verified').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const standardTreatments = pgTable('standard_treatments', {
  code: text('code').primaryKey(),
  category: text('category').notNull(),
  label: text('label').notNull(),
});

export const hiraOfficialPrices = pgTable('hira_official_prices', {
  id: text('id').primaryKey(),
  hospitalId: text('hospital_id')
    .notNull()
    .references(() => hospitals.id, { onDelete: 'cascade' }),
  treatmentCode: text('treatment_code')
    .notNull()
    .references(() => standardTreatments.code),
  treatmentName: text('treatment_name').notNull(),
  minPrice: integer('min_price').notNull(),
  maxPrice: integer('max_price').notNull(),
  reportedDate: text('reported_date').notNull(),
});

export const platformEventOffers = pgTable('platform_event_offers', {
  id: text('id').primaryKey(),
  hospitalId: text('hospital_id')
    .notNull()
    .references(() => hospitals.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  treatmentCode: text('treatment_code').notNull(),
  treatmentName: text('treatment_name').notNull(),
  rawTitle: text('raw_title').notNull(),
  listedPrice: integer('listed_price').notNull(),
  vatIncluded: boolean('vat_included').notNull().default(true),
  badge: text('badge'),
  bookingUrl: text('booking_url').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const syncRuns = pgTable('sync_runs', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  status: text('status').notNull(),
  hospitalsSynced: integer('hospitals_synced').notNull().default(0),
  offersSynced: integer('offers_synced').notNull().default(0),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});
