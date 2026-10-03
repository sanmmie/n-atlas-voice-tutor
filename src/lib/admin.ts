import { timingSafeEqual } from 'node:crypto';

export function isValidAdminToken(provided: string | null | undefined, expected = process.env.ADMIN_TOKEN): boolean {
  if (!provided || !expected) return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}