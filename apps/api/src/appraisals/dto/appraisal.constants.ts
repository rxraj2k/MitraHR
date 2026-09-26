// Shared allowed-value list for the Appraisal model — enforced here since
// SQLite doesn't support native Prisma enums (same pattern as
// PERFORMANCE_REVIEW_STATUSES / REVIEW_RATER_TYPES in ../performance).
//
// EMAIL_TRIGGERED isn't a separate stored value — the dashboard derives
// that badge from `emailSentAt` being set while status is still
// PENDING_EMPLOYEE, since both facts land at the same moment (the cron
// job that creates the row also sends the email in the same pass).
export const APPRAISAL_STATUSES = ['PENDING_EMPLOYEE', 'UNDER_MANAGER_REVIEW', 'COMPLETED'] as const;
export type AppraisalStatus = (typeof APPRAISAL_STATUSES)[number];

// How many days before the cycleNumber*180-day mark the reminder email
// goes out (Prompt for AI Developer, section 1).
export const APPRAISAL_EMAIL_LEAD_DAYS = 7;

// The interval itself — "every 6 months from date of joining".
export const APPRAISAL_CYCLE_DAYS = 180;

// A newly-surfaced cycle only gets its trigger EMAIL sent automatically if
// it became due within this many days. Without this cap, the very first
// cycle-check run after this feature ships treats every already-employed
// person whose join date is more than ~173 days old as "overdue" for
// their first cycle -- which in practice is almost the entire existing
// headcount -- and blasts all of them with a real email at once (this is
// exactly what happened testing against Om Bhamre: 5 other unrelated
// employees got emailed too, since their real dateOfJoining also cleared
// the 180-day mark long ago). Cycles older than this window still get
// their Appraisal row created -- so they show up on the admin dashboard
// and the employee's own My Performance page -- but with emailSentAt left
// null, so an admin has to consciously hit "Send Reminder" per person
// instead of it firing automatically for the whole backlog at once.
export const APPRAISAL_AUTO_EMAIL_WINDOW_DAYS = 14;
