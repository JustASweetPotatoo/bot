import { spawn } from "node:child_process";

function startQuickTunnel(port = 3000) {
  return new Promise((resolve, reject) => {
    const tunnel = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${port}`], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;

      settled = true;
      tunnel.kill();
      reject(new Error("Timed out waiting for Cloudflare Tunnel URL"));
    }, 30_000);

    function handleOutput(chunk) {
      output += chunk.toString();

      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);

      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);

        resolve({
          url: match[0],
          tunnel: tunnel,
        });
      }

      if (output.length > 16_000) {
        output = output.slice(-8_000);
      }
    }

    tunnel.stdout.on("data", handleOutput);
    tunnel.stderr.on("data", handleOutput);

    tunnel.once("error", (error) => {
      if (settled) return;

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    tunnel.once("exit", (code) => {
      if (settled) return;

      settled = true;
      clearTimeout(timeout);
      reject(new Error(`cloudflared exited with code ${code}`));
    });
  });
}

async function start() {
  const { url, tunnel } = await startQuickTunnel(3001);

  console.log(url);

  tunnel.stderr.on("data", (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);

    if (match) {
      console.log("Tunnel URL:", match[0]);
    }
  });
}

start();
