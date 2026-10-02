import { z } from "zod";

export const ADMIN_SESSION_EXPIRED_EVENT = "ask-dj-admin-session-expired";

export class AdminRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "AdminRequestError";
  }
}

function handleAdminResponse(response: Response): Response {
  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT));
  }
  return response;
}

export const adminTransportFetch: typeof fetch = async (input, init) =>
  handleAdminResponse(await fetch(input, init));

export async function adminRequest<T>(
  url: string,
  body: unknown,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = handleAdminResponse(
      await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      }),
    );
  } catch {
    throw new AdminRequestError(0, "Network error. Please try again.");
  }
  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      /* Non-JSON errors keep the status message. */
    }
    const detail =
      payload && typeof payload === "object"
        ? "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "message" in payload && typeof payload.message === "string"
            ? payload.message
            : null
        : null;
    throw new AdminRequestError(
      response.status,
      response.status === 401
        ? "Your session has expired. Sign in again."
        : (detail ?? "Server error. Please try again."),
      payload,
    );
  }
  try {
    return schema.parse(await response.json());
  } catch {
    throw new AdminRequestError(
      502,
      "Invalid server response. Please try again.",
    );
  }
}
