export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function readJsonBody(
  req: Request,
  maxBytes = 64 * 1024,
): Promise<unknown> {
  const length = Number(req.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) {
    throw new HttpError(413, "body_too_large", "Request body is too large");
  }

  if (!req.body) throw new HttpError(400, "invalid_json", "Invalid JSON body");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "body_too_large", "Request body is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new HttpError(400, "invalid_json", "Invalid JSON body");
  }
}

export function errorResponse(error: unknown): Response {
  const known = error instanceof HttpError;
  const status = known ? error.status : 500;
  const message = known
    ? error.message
    : "Something went wrong. Please try again.";
  const code = known ? error.code : "internal_error";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (known && error.retryAfterSeconds !== undefined)
    headers["Retry-After"] = String(error.retryAfterSeconds);
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers,
  });
}
