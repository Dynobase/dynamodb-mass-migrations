// Removes numbers, dashes, underscores and ".ts" suffix from the name
export function normalizeMigrationName(name: string): string {
  return name.replace(/[\d\-_\.]/g, "");
}
