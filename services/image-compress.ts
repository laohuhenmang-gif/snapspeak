import * as ImageManipulator from 'expo-image-manipulator';

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const QUALITY = 0.7;

export interface CompressResult {
  uri: string;
  base64: string;
  width: number;
  height: number;
  size: number;
}

export async function compressImage(uri: string, base64?: string): Promise<CompressResult> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_WIDTH, height: MAX_HEIGHT } }],
      { compress: QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    return {
      uri: result.uri,
      base64: result.base64 || base64 || '',
      width: result.width,
      height: result.height,
      size: result.base64 ? Math.round(result.base64.length * 0.75) : 0,
    };
  } catch {
    return {
      uri,
      base64: base64 || '',
      width: 0,
      height: 0,
      size: 0,
    };
  }
}

export function estimateImageSize(base64: string): number {
  return Math.round(base64.length * 0.75);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
