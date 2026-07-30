export function normalizeRecentNoteRoot(value: unknown): string {
  const root = String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/\/+$/, "");
  return root === "." || root === "/" ? "" : root;
}

export function normalizeRecentNoteRoots(values: unknown[]): string[] {
  const unique = Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map(normalizeRecentNoteRoot)
  ));
  if (unique.includes("")) return [""];
  unique.sort((a, b) => a.length - b.length || a.localeCompare(b));
  const roots: string[] = [];
  for (const root of unique) {
    if (roots.some((parent) => root === parent || root.startsWith(`${parent}/`))) continue;
    roots.push(root);
  }
  return roots;
}

export function isPathUnderRecentNoteRoots(pathValue: unknown, rootsValue: unknown[]): boolean {
  const path = normalizeRecentNoteRoot(pathValue);
  if (!path) return false;
  const roots = normalizeRecentNoteRoots(rootsValue);
  return roots.some((root) => !root || path === root || path.startsWith(`${root}/`));
}
