export function resourceLinkLabel(url: string, label?: string | null): string {
  if (label) return label;
  if (url.includes('udemy.com')) return 'Udemy';
  if (url.includes('youtu')) return 'YouTube';
  if (url.includes('coursera.org')) return 'Coursera';
  if (url.includes('drive.google.com')) return 'Google Drive';
  if (url.includes('workdrive.zoho')) return 'Zoho WorkDrive';
  return 'Open Link';
}

export type ResourcePlatform = 'youtube' | 'udemy' | 'coursera' | 'drive' | 'zoho' | 'link';

// Platform detected purely from the URL's host — drives the small colored
// badge next to each course resource link (Master Data — Training Catalog)
// so a Udemy link and a YouTube link read apart at a glance instead of
// looking like identical generic pills.
export function resourceLinkPlatform(url: string): ResourcePlatform {
  if (url.includes('udemy.com')) return 'udemy';
  if (url.includes('youtu')) return 'youtube';
  if (url.includes('coursera.org')) return 'coursera';
  if (url.includes('drive.google.com')) return 'drive';
  if (url.includes('workdrive.zoho')) return 'zoho';
  return 'link';
}

export const PLATFORM_BADGE: Record<ResourcePlatform, string> = {
  youtube: 'bg-red-100 text-red-700',
  udemy: 'bg-violet-100 text-violet-700',
  coursera: 'bg-blue-100 text-blue-700',
  drive: 'bg-amber-100 text-amber-700',
  zoho: 'bg-orange-100 text-orange-700',
  link: 'bg-slate-100 text-slate-600',
};

export const PLATFORM_GLYPH: Record<ResourcePlatform, string> = {
  youtube: '▶',
  udemy: 'U',
  coursera: 'C',
  drive: '📁',
  zoho: 'Z',
  link: '🔗',
};
