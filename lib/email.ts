import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export function sendNewSessionAlert(data: {
  query: string;
  persona: string;
  focus: string;
  lang: string;
  sessionId: string;
  visitorEmail?: string;
}): void {
  if (!resend) return;

  const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" });

  resend.emails
    .send({
      from: "Ask DJ <onboarding@resend.dev>",
      to: "leedj.1076@gmail.com",
      subject: `New visitor: "${data.query.slice(0, 60)}"`,
      html: `<p><strong>New chat session</strong></p>
        <p><strong>Query:</strong> ${data.query}</p>
        <p><strong>Persona:</strong> ${data.persona}</p>
        <p><strong>Focus:</strong> ${data.focus}</p>
        <p><strong>Language:</strong> ${data.lang}</p>
        <p><strong>Visitor Email:</strong> ${data.visitorEmail || "N/A"}</p>
        <p><strong>Session:</strong> ${data.sessionId}</p>
        <p><strong>Time (KST):</strong> ${timestamp}</p>`,
    })
    .then((result) => {
      if (result.error) {
        console.error("[EMAIL] Resend error:", result.error.message);
      } else {
        console.log("[EMAIL] Alert sent for session:", data.sessionId);
      }
    });
}
