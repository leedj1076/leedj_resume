export function logAnalytics(event: Record<string, unknown>): void {
  console.log("[ANALYTICS]", JSON.stringify(event));
}
