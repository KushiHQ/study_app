// Content ids are "<course-slug>/<local-id>" (SPEC §2). URLs use only the local
// part: /c/csc-725/l-agents-and-environments.
export const localId = (id: string) => id.slice(id.indexOf('/') + 1);
export const fullId = (slug: string, local: string) => (local.includes('/') ? local : `${slug}/${local}`);

export const naira = (kobo: number) =>
	`₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: kobo % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const shortDate = (iso: string) =>
	new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' });

export const pct = (x: number) => `${Math.round(Math.max(0, Math.min(1, x)) * 100)}%`;
