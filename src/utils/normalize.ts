export function normalizeRecord(raw: Record<string, any>, mapping: Record<string, string>) {
  const normalized: Record<string, any> = {};
  for (const [userCol, canonicalField] of Object.entries(mapping)) {
    normalized[canonicalField] = raw[userCol] ?? null;
  }
  return normalized;
}
