import { readFile } from "fs/promises";
import path from "path";

const VERSIONS: Record<string, string> = {
  "v2-full-suite": "ask-dj-v4.html",
  "v3-narrative": "ask-dj-narrative.html",
  "v4-signal-deck": "ask-dj-signal.html",
  "v5-merged": "ask-dj-merged-v2.html",
  "v6-dd-room": "ask-dj-dd-room.html",
  "v7-terminal": "ask-dj-terminal.html",
  "v8-memo": "ask-dj-memo.html",
  "v9-ic-dashboard": "ask-dj-ic-dashboard.html",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const filename = VERSIONS[name];

  if (!filename) {
    return new Response("Not found. Available: " + Object.keys(VERSIONS).join(", "), {
      status: 404,
    });
  }

  const filePath = path.join(process.cwd(), "ui_test", filename);

  try {
    let content = await readFile(filePath, "utf-8");

    // Wrap .jsx files in an HTML shell with React + Babel CDN
    if (filename.endsWith(".jsx")) {
      content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Ask DJ — Prototype</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.9/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #f8fafc; }
  </style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
${content}
ReactDOM.createRoot(document.getElementById("root")).render(<AskDJ/>);
</script>
</body>
</html>`;
    }

    return new Response(content, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
