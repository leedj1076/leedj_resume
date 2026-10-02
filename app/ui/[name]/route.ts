import { readFile } from "fs/promises";
import path from "path";
import { findPrototype, PROTOTYPES } from "@/lib/prototypes";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const prototype = findPrototype(name);

  if (!prototype) {
    return new Response(
      "Not found. Available: " + PROTOTYPES.map(({ slug }) => slug).join(", "),
      {
        status: 404,
      },
    );
  }

  const filePath = path.join(process.cwd(), "ui_test", prototype.filename);

  try {
    const content = await readFile(filePath, "utf-8");

    return new Response(content, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
