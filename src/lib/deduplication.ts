/**
 * Generic deduplication utility.
 * Compares new items against existing items using a key extractor.
 */
export function filterDuplicates<T>(
  newItems: T[],
  existingItems: T[],
  getKey: (item: T) => string
): { unique: T[]; duplicates: T[] } {
  const existingKeys = new Set(existingItems.map(getKey));
  const unique: T[] = [];
  const duplicates: T[] = [];
  const seenInBatch = new Set<string>();

  for (const item of newItems) {
    const key = getKey(item);
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      duplicates.push(item);
    } else {
      unique.push(item);
      seenInBatch.add(key);
    }
  }

  return { unique, duplicates };
}
