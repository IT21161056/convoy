import "dotenv/config";
import ngrok from "@ngrok/ngrok";

/**
 * Forwards the local Convoy server port to a secure public ngrok ingress URL.
 * Automatically picks up NGROK_AUTHTOKEN from .env or system environment.
 */
export async function startNgrok(port: number = 4000): Promise<string | null> {
  const authtoken = process.env.NGROK_AUTHTOKEN?.trim();

  try {
    const listener = await ngrok.forward({
      addr: port,
      authtoken: authtoken || undefined,
      authtoken_from_env: true,
    });

    const url = listener.url();
    console.log(`\n======================================================`);
    console.log(`🚀 [ngrok] Public tunnel active at:`);
    console.log(`   ${url}`);
    console.log(`\n📱 To use this on a mobile device or remote client:`);
    console.log(`   In convoy-client/.env, set:`);
    console.log(`   EXPO_PUBLIC_SOCKET_URL=${url}`);
    console.log(`======================================================\n`);
    return url;
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (msg.includes("ERR_NGROK_4018") || msg.includes("not authenticated")) {
      console.warn(
        `\n⚠️  [ngrok] Authentication token required (ERR_NGROK_4018):\n` +
          `   1. Sign up / log in at: https://dashboard.ngrok.com/get-started/your-authtoken\n` +
          `   2. Add your token to convoy-server/.env:\n` +
          `      NGROK_AUTHTOKEN=your_authtoken_here\n` +
          `   (The local server continues running on http://localhost:${port})\n`,
      );
    } else {
      console.warn(`[ngrok] Tunnel warning: ${msg}`);
    }
    return null;
  }
}

// Allows running standalone via: npm run tunnel or npx ts-node src/tunnel.ts
if (require.main === module) {
  const port = Number(process.env.PORT ?? 4000);
  console.log(`[ngrok] Starting tunnel for port ${port}...`);
  void startNgrok(port);
}
