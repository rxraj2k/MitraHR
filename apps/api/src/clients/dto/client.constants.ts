// Structured client-region classification (Sprint 16) — drives the Reports
// "US Client Alignment" widget's real timezone-overlap computation. Kept
// separate from the free-text `timezone` field, which stays purely
// descriptive (e.g. "America/New_York").
export const CLIENT_REGIONS = ['US_EAST', 'US_CENTRAL', 'US_MOUNTAIN', 'US_PACIFIC', 'NON_US'] as const;
export type ClientRegion = (typeof CLIENT_REGIONS)[number];

// Technical domain tags a client is engaged for — multi-select in the
// frontend, stored comma-joined in the single `industry` column (SQLite
// has no array type, and this project's convention is a plain String
// column + validation rather than a join table for small controlled
// vocabularies like this).
export const CLIENT_DOMAINS = ['IAM', 'AI_ML', 'DEVOPS_CLOUD', 'CYBERSECURITY', 'ENTERPRISE_SOFTWARE'] as const;
export type ClientDomain = (typeof CLIENT_DOMAINS)[number];

// US timezone the client's primary contact operates in — single-select,
// stored in the existing free-text `timezone` column (now a closed set of
// six codes instead of an arbitrary IANA string).
export const US_TIMEZONES = ['EST_EDT', 'CST_CDT', 'MST_MDT', 'PST_PDT', 'AKST_AKDT', 'HST'] as const;
export type UsTimezone = (typeof US_TIMEZONES)[number];

