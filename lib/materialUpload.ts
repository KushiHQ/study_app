import { Platform } from 'react-native';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { File as DeviceFile } from 'expo-file-system';
import { authedFetch, WEB_URL } from './api/client';

const ENDPOINT = process.env.EXPO_PUBLIC_MATERIAL_UPLOAD_URL || `${WEB_URL}/contribute/upload`;
const CHUNK = 4 * 1024 * 1024;
export const MAX_FILES = 20;
export const MAX_FILE = 50 * 1024 * 1024;
export const MAX_TOTAL = 200 * 1024 * 1024;
const EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md', 'csv', 'jpg', 'jpeg', 'png', 'webp', 'heic']);

export type SelectedFile = { key: string; asset: DocumentPickerAsset; size: number; driveId?: string };

export function selectedFile(asset: DocumentPickerAsset): SelectedFile {
	const extension = asset.name.toLowerCase().split('.').pop() ?? '';
	if (!EXTENSIONS.has(extension)) throw new Error(`${asset.name}: choose a document or picture.`);
	const size = asset.file?.size ?? (Platform.OS === 'web' ? asset.size : new DeviceFile(asset.uri).size);
	if (!size) throw new Error(`${asset.name} is empty or could not be read.`);
	if (size > MAX_FILE) throw new Error(`${asset.name} exceeds the 50 MB limit per file.`);
	return { key: `${asset.name}-${size}-${asset.lastModified}`, asset, size };
}

export async function uploadMaterialFile(file: SelectedFile, course: string, onProgress: (sent: number) => void): Promise<string> {
	const started = await authedFetch(ENDPOINT, {
		method: 'POST', headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name: file.asset.name, size: file.size, course })
	});
	const session = await started.json().catch(() => null) as { session?: string; error?: string } | null;
	if (!started.ok || !session?.session) throw new Error(session?.error || 'We could not start the upload. Try again.');

	const webFile = file.asset.file;
	const deviceFile = Platform.OS === 'web' ? null : new DeviceFile(file.asset.uri).open();
	try {
		for (let start = 0; start < file.size; start += CHUNK) {
			const end = Math.min(start + CHUNK, file.size);
			const body = webFile ? await webFile.slice(start, end).arrayBuffer() : deviceFile?.readBytes(end - start).buffer;
			if (!body || body.byteLength !== end - start) throw new Error('The file could not be read. Remove it and select it again.');
			const url = new URL(ENDPOINT);
			url.searchParams.set('s', session.session);
			const response = await authedFetch(url, {
				method: 'PUT',
				headers: { 'content-type': 'application/octet-stream', 'x-start': String(start), 'x-total': String(file.size) },
				body
			});
			const result = await response.json().catch(() => null) as { done?: boolean; id?: string; error?: string } | null;
			if (!response.ok) throw new Error(result?.error || 'The upload was interrupted. Try again.');
			onProgress(end);
			if (result?.done && result.id) return result.id;
		}
		throw new Error('The file did not finish uploading. Try again.');
	} finally {
		deviceFile?.close();
	}
}
