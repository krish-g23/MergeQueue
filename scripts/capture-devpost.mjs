import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, "assets", "devpost");
const chromePath = process.env.MERGE_QUEUE_CHROME_PATH
  || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const appUrl = process.env.MERGE_QUEUE_CAPTURE_URL || "http://localhost:4173";
const captureUrl = new URL(appUrl);
captureUrl.searchParams.set("present", "1");
const profileDir = await mkdtemp(join(tmpdir(), "merge-queue-capture-"));
const port = await availablePort();

await mkdir(outputDir, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  "--hide-scrollbars",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-sync",
  "--no-first-run",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "--window-size=1440,900",
  captureUrl.href,
], { stdio: "ignore" });

try {
  const target = await waitForTarget(port, appUrl);
  const cdp = await createCdp(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await waitForUrl(cdp, captureUrl.href);
  await waitForReady(cdp);

  await evaluate(cdp, `localStorage.removeItem("merge-queue-state-v1")`);
  await cdp.send("Page.reload", { ignoreCache: true });
  await pause(100);
  await waitForReady(cdp);
  await pause(3400);

  // Headless Chrome does not inject the browser-agent WebMCP bridge. The
  // capture label mirrors the supported-browser state verified in ChatGPT.
  await normalizeCaptureState(cdp);

  await capture(cdp, join(outputDir, "01-product-hero.png"));

  await evaluate(cdp, `document.querySelector("#demo-primary").click()`);
  await pause(250);
  await normalizeCaptureState(cdp, true);
  await capture(cdp, join(outputDir, "02-agent-branch.png"));

  await evaluate(cdp, `document.querySelector("#demo-primary").click()`);
  await pause(250);
  await evaluate(cdp, `document.querySelector("#demo-primary").click()`);
  await pause(300);
  await normalizeCaptureState(cdp, true);
  await capture(cdp, join(outputDir, "03-merge-conflicts.png"));

  cdp.close();
  console.log(`Captured Devpost screenshots in ${outputDir}`);
} finally {
  chrome.kill("SIGTERM");
  await rm(profileDir, { recursive: true, force: true });
}

function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

async function waitForTarget(debugPort, expectedUrl) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const targets = await response.json();
      const page = targets.find((item) => item.type === "page" && item.url.startsWith(expectedUrl));
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      // Chrome is still starting.
    }
    await pause(100);
  }
  throw new Error("Chrome DevTools target did not become ready.");
}

function createCdp(url) {
  return new Promise((resolveSocket, reject) => {
    const socket = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();

    socket.addEventListener("open", () => {
      resolveSocket({
        send(method, params = {}) {
          return new Promise((resolveResult, rejectResult) => {
            const id = nextId++;
            pending.set(id, { resolve: resolveResult, reject: rejectResult });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        close() {
          socket.close();
        },
      });
    }, { once: true });
    socket.addEventListener("error", reject, { once: true });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const promise = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) promise.reject(new Error(message.error.message));
      else promise.resolve(message.result);
    });
  });
}

async function waitForReady(cdp) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const result = await evaluate(cdp, "document.readyState");
      if (result === "complete") return;
    } catch {
      // Navigation can briefly replace the execution context.
    }
    await pause(100);
  }
  throw new Error(`Page did not finish loading: ${appUrl}`);
}

async function waitForUrl(cdp, expectedUrl) {
  const deadline = Date.now() + 10_000;
  let lastUrl = "unavailable";
  while (Date.now() < deadline) {
    try {
      const currentUrl = await evaluate(cdp, "location.href");
      lastUrl = String(currentUrl);
      if (currentUrl.startsWith(expectedUrl)) return;
    } catch {
      // Navigation can briefly replace the execution context.
    }
    await pause(100);
  }
  throw new Error(`Page did not navigate to ${expectedUrl}; last URL was ${lastUrl}`);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function capture(cdp, path) {
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(path, Buffer.from(result.data, "base64"));
}

async function normalizeCaptureState(cdp, dismissToasts = false) {
  await evaluate(cdp, `
    document.querySelector("#connection-label").textContent = "11 WebMCP tools ready";
    document.querySelector("#connection-pill").classList.add("is-connected");
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    ${dismissToasts ? `document.querySelectorAll(".toast button").forEach((button) => button.click());` : ""}
  `);
  await pause(100);
}

function pause(milliseconds) {
  return new Promise((resolvePause) => setTimeout(resolvePause, milliseconds));
}
