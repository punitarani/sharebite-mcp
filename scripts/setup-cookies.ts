import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    cookie: { type: "string" },
  },
});

let raw = values.cookie;

if (!raw) {
  process.stdout.write("Paste your cookie string (from browser DevTools → Application → Cookies):\n> ");
  for await (const line of console) {
    raw = line;
    break;
  }
}

if (!raw) {
  console.error("No cookie string provided.");
  process.exit(1);
}

// Extract sessionid from a cookie string like "sessionid=abc123; csrftoken=xyz"
const match = raw.match(/sessionid=([^;\s]+)/);
if (!match) {
  console.error('Could not find "sessionid" in the cookie string. Make sure it contains sessionid=...');
  process.exit(1);
}

const sessionId = match[1];
if (!sessionId) {
  console.error("Matched sessionid but value was empty.");
  process.exit(1);
}

await Bun.write(".env", `SHAREBITE_SESSION_ID=${sessionId}\n`);
console.log(`Wrote SHAREBITE_SESSION_ID to .env (${sessionId.slice(0, 8)}...)`);
