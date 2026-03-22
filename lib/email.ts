import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY!);
  }
  return _resend;
}

const FROM = "Genesis Node <notifications@genesisnode.ai>";

export async function sendTaskCompleteEmail(opts: {
  to: string;
  userName: string;
  taskId: string;
  goal: string;
  agentName: string;
  creditsCharged: number;
  elapsedSecs?: number;
  isFirstTask?: boolean;
}) {
  if (!process.env.RESEND_API_KEY) return; // silently skip if not configured

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "https://agents-dev-roan.vercel.app";
  const shareUrl = `${baseUrl}/share/${opts.taskId}`;
  const dashUrl  = `${baseUrl}/tasks/${opts.taskId}`;
  const marketplaceUrl = `${baseUrl}/marketplace`;

  await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.isFirstTask ? `🎉 Your first task is done — ${opts.goal.slice(0, 40)}…` : `✅ Task completed: "${opts.goal.slice(0, 60)}"`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#020617;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0">
  <div style="max-width:560px;margin:40px auto;padding:0 20px">

    <!-- Logo -->
    <div style="margin-bottom:32px">
      <span style="display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:0.2em;color:#94a3b8">
        ◈ GENESIS NODE
      </span>
    </div>

    <!-- Card -->
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden">
      <!-- Green header -->
      <div style="background:linear-gradient(135deg,#064e3b,#0f172a);border-bottom:1px solid #1e293b;padding:24px">
        <p style="font-size:28px;margin:0 0 8px">✅</p>
        <p style="font-size:18px;font-weight:600;color:#f1f5f9;margin:0 0 6px">Task completed!</p>
        <p style="font-size:14px;color:#94a3b8;margin:0;line-height:1.5">${opts.goal}</p>
      </div>

      <!-- Details -->
      <div style="padding:24px;space-y:16px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr>
            <td style="padding:8px 0;color:#64748b;border-bottom:1px solid #1e293b">Agent</td>
            <td style="padding:8px 0;color:#e2e8f0;text-align:right;border-bottom:1px solid #1e293b">${opts.agentName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;border-bottom:1px solid #1e293b">Credits charged</td>
            <td style="padding:8px 0;color:#a5b4fc;text-align:right;border-bottom:1px solid #1e293b">⚡ ${opts.creditsCharged}</td>
          </tr>
          ${opts.elapsedSecs ? `
          <tr>
            <td style="padding:8px 0;color:#64748b">Time taken</td>
            <td style="padding:8px 0;color:#e2e8f0;text-align:right">${opts.elapsedSecs}s</td>
          </tr>` : ""}
        </table>

        ${opts.isFirstTask ? `
        <div style="margin-top:20px;padding:16px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:12px">
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#86efac">🎉 First task done!</p>
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5">You have 50 free credits to run more agents. Try the marketplace or run the same agent again.</p>
          <a href="${marketplaceUrl}" style="display:inline-block;margin-top:12px;background:#22c55e;color:#022c22;text-decoration:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600">Browse agents →</a>
        </div>` : ""}

        <!-- CTAs -->
        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap">
          <a href="${dashUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#0ea5e9);color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600">
            View full result →
          </a>
          <a href="${shareUrl}" style="display:inline-block;background:#1e293b;color:#94a3b8;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:13px;border:1px solid #334155">
            Share result ↗
          </a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <p style="margin-top:32px;font-size:11px;color:#334155;text-align:center">
      You received this because you have an account at Genesis Node.<br>
      <a href="${baseUrl}/dashboard" style="color:#475569;text-decoration:none">Manage notifications</a>
    </p>
  </div>
</body>
</html>
    `,
  });
}

export async function sendTaskFailedEmail(opts: {
  to: string;
  userName: string;
  taskId: string;
  goal: string;
  agentName: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const dashUrl = `${process.env.NEXTAUTH_URL ?? "https://agents-dev-roan.vercel.app"}/tasks/${opts.taskId}`;

  await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: `❌ Task failed: "${opts.goal.slice(0, 60)}"`,
    html: `
<!DOCTYPE html>
<html>
<body style="background:#020617;color:#e2e8f0;font-family:-apple-system,sans-serif;margin:0;padding:0">
  <div style="max-width:560px;margin:40px auto;padding:0 20px">
    <div style="margin-bottom:32px">
      <span style="font-size:12px;font-weight:600;letter-spacing:0.2em;color:#94a3b8">◈ GENESIS NODE</span>
    </div>
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:24px">
      <p style="font-size:24px;margin:0 0 8px">❌</p>
      <p style="font-size:16px;font-weight:600;color:#f1f5f9;margin:0 0 6px">Task failed</p>
      <p style="font-size:13px;color:#94a3b8;margin:0 0 16px">${opts.goal}</p>
      <p style="font-size:13px;color:#64748b;margin:0 0 20px">No credits were charged for failed tasks. Check the logs for details.</p>
      <a href="${dashUrl}" style="display:inline-block;background:#1e293b;color:#94a3b8;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:13px;border:1px solid #334155">
        View logs →
      </a>
    </div>
  </div>
</body>
</html>
    `,
  });
}

export async function sendWelcomeEmail(opts: {
  to: string;
  userName: string;
  referralCode: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const referralUrl = `${process.env.NEXTAUTH_URL ?? "https://agents-dev-roan.vercel.app"}/register?ref=${opts.referralCode}`;

  await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: "Welcome to Genesis Node 🤖",
    html: `
<!DOCTYPE html>
<html>
<body style="background:#020617;color:#e2e8f0;font-family:-apple-system,sans-serif;margin:0;padding:0">
  <div style="max-width:560px;margin:40px auto;padding:0 20px">
    <div style="margin-bottom:32px">
      <span style="font-size:12px;font-weight:600;letter-spacing:0.2em;color:#94a3b8">◈ GENESIS NODE</span>
    </div>
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#1e1b4b,#0f172a);border-bottom:1px solid #1e293b;padding:28px">
        <p style="font-size:32px;margin:0 0 8px">🤖</p>
        <p style="font-size:20px;font-weight:700;color:#f1f5f9;margin:0 0 8px">Welcome, ${opts.userName}!</p>
        <p style="font-size:14px;color:#94a3b8;margin:0">Your account is ready. You have <strong style="color:#a5b4fc">100 free credits</strong> to try any agent.</p>
      </div>
      <div style="padding:24px;font-size:13px;color:#94a3b8">
        <p style="font-weight:600;color:#e2e8f0;margin:0 0 12px">Getting started:</p>
        <p style="margin:0 0 8px">1. Browse the <a href="${process.env.NEXTAUTH_URL}/marketplace" style="color:#818cf8">marketplace</a> and pick an agent</p>
        <p style="margin:0 0 8px">2. Enter your goal and deploy</p>
        <p style="margin:0 0 20px">3. Watch the agent work in real-time</p>
        <p style="margin:0 0 8px;color:#e2e8f0;font-weight:600">Refer friends and earn:</p>
        <p style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:12px;font-family:monospace;font-size:14px;color:#a5b4fc;margin:0 0 8px">${opts.referralCode}</p>
        <p style="margin:0 0 20px">Share your link and both of you get <strong style="color:#34d399">200 credits free</strong>:</p>
        <a href="${referralUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#0ea5e9);color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600">
          Get your referral link →
        </a>
      </div>
    </div>
  </div>
</body>
</html>
    `,
  });
}

export async function sendWinnerEmail(opts: {
  to: string;
  userName: string;
  rank: number;
  category: "agent" | "developer";
  period: string;
  creditsAwarded: number;
  score: number;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const medals = ["", "🥇", "🥈", "🥉"];
  const medal = medals[opts.rank] ?? `#${opts.rank}`;
  const isAgent = opts.category === "agent";

  const scoreLabel = isAgent
    ? `${opts.score.toLocaleString()} tasks completed`
    : `$${(opts.score / 100).toFixed(2)} earned`;

  const feeNote = isAgent && opts.rank === 1 ? " + 0% platform fee for 7 days"
    : isAgent && opts.rank === 2 ? " + 15% fee reduction"
    : isAgent && opts.rank === 3 ? " + 10% fee reduction" : "";

  const prizeLabel = `${opts.creditsAwarded.toLocaleString()} credits ($${(opts.creditsAwarded / 100).toFixed(2)})${feeNote}`;

  const dashUrl = `${process.env.NEXTAUTH_URL ?? "https://agents-dev-roan.vercel.app"}/dashboard`;
  const lbUrl   = `${process.env.NEXTAUTH_URL ?? "https://agents-dev-roan.vercel.app"}/leaderboard`;
  const headerBg = opts.rank === 1 ? "#78350f,#1c1917" : opts.rank === 2 ? "#1e3a5f,#0f172a" : "#1c2033,#0f172a";
  const rankColor = opts.rank === 1 ? "#fbbf24" : opts.rank === 2 ? "#94a3b8" : "#c2753a";

  await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: `${medal} You placed #${opts.rank} on the Genesis Node Leaderboard!`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="background:#020617;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0">
  <div style="max-width:560px;margin:40px auto;padding:0 20px">
    <div style="margin-bottom:32px">
      <span style="font-size:12px;font-weight:600;letter-spacing:0.2em;color:#94a3b8">◈ GENESIS NODE</span>
    </div>
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,${headerBg});border-bottom:1px solid #1e293b;padding:28px;text-align:center">
        <p style="font-size:56px;margin:0 0 8px">${medal}</p>
        <p style="font-size:22px;font-weight:700;color:#f1f5f9;margin:0 0 4px">#${opts.rank} ${isAgent ? "Top Agent" : "Top Developer"}!</p>
        <p style="font-size:13px;color:#94a3b8;margin:0">${opts.period}</p>
      </div>
      <div style="padding:24px">
        <p style="font-size:14px;color:#e2e8f0;margin:0 0 20px">
          Congratulations, <strong>${opts.userName}</strong>! Ranked
          <strong style="color:${rankColor}">#${opts.rank}</strong> on the Genesis Node weekly leaderboard.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
          <tr>
            <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #1e293b">Your score</td>
            <td style="padding:10px 0;color:#e2e8f0;text-align:right;border-bottom:1px solid #1e293b;font-weight:600">${scoreLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#64748b">Prize awarded</td>
            <td style="padding:10px 0;color:#34d399;text-align:right;font-weight:700">⚡ ${prizeLabel}</td>
          </tr>
        </table>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px">Your reward has been automatically added to your account balance.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <a href="${dashUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#0ea5e9);color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600">View dashboard →</a>
          <a href="${lbUrl}" style="display:inline-block;background:#1e293b;color:#94a3b8;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:13px;border:1px solid #334155">See leaderboard</a>
        </div>
      </div>
      <div style="border-top:1px solid #1e293b;padding:16px 24px;background:#0a0f1e">
        <p style="font-size:12px;color:#334155;margin:0">Keep building to defend your position! Resets every Monday 00:00 UTC.</p>
      </div>
    </div>
    <p style="margin-top:32px;font-size:11px;color:#334155;text-align:center">
      Genesis Node •
      <a href="${lbUrl}/history" style="color:#475569;text-decoration:none">Prize history</a>
    </p>
  </div>
</body></html>
    `,
  });
}
