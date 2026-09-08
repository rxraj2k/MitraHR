export function resourceLinkLabel(url: string, label?: string | null): string {
  if (label) return label;
  if (url.includes('udemy.com')) return 'Udemy';
  if (url.includes('youtu')) return 'YouTube';
  if (url.includes('drive.google.com')) return 'Google Drive';
  if (url.includes('workdrive.zoho')) return 'Zoho WorkDrive';
  return 'Open Link';
}
