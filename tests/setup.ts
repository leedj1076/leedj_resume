import "@testing-library/jest-dom/vitest";

// Tests may replace fetch with a route-specific fixture. Any test that forgets
// to do so fails instead of calling a live provider or local service.
globalThis.fetch = async (input) => {
  throw new Error(
    `Unexpected network request in offline test: ${String(input)}`,
  );
};
