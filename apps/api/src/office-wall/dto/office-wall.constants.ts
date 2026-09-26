// Shared allowed-value lists for Office Wall DTOs -- enforced here since
// SQLite doesn't support native Prisma enums (same pattern as
// engagement.constants.ts / performance.constants.ts).

export const OFFICE_WALL_CATEGORIES = ['GENERAL', 'SHOUTOUT', 'MILESTONE', 'ANNOUNCEMENT', 'EVENT'] as const;
export type OfficeWallCategory = (typeof OFFICE_WALL_CATEGORIES)[number];

// Quick emoji reactions on a post -- LIKE (👍), HEART (❤️), CELEBRATE (🎉),
// HANDS_UP (🙌), matching the reaction set from the feature spec.
export const OFFICE_WALL_REACTION_TYPES = ['LIKE', 'HEART', 'CELEBRATE', 'HANDS_UP'] as const;
export type OfficeWallReactionType = (typeof OFFICE_WALL_REACTION_TYPES)[number];
