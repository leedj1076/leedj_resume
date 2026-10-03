// Plain Node (CLI and server rendering) entry for #server-only. Next client
// compilation selects the browser condition and its server-only poison pill.
if (typeof window !== "undefined") {
  throw new Error("Server configuration cannot run in a browser");
}
export {};
