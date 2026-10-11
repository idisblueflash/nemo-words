"use strict";

// US-039: a minimal, stdlib-only client for Jev (TypeSafe's `systemOne` API),
// modelled on what SP-037 proved with `@typesafe-ai/sdk` 0.6: one
//   POST <base>/v1/systemone   Authorization: Bearer <TYPESAFE_API_KEY>
//   { state, questions: { <name>: { type: "noul", instructions } }, model }
// answered by `{ answers: { <name>: { noul: <p> } } }`. Plain `fetch` keeps
// scripts/ free of npm dependencies; the SDK adds only retries on top.
//
// Configuration (`config(env)`):
//   - NEMO_JEV_ENV_FILE set: that env file alone supplies TYPESAFE_API_KEY,
//     TYPESAFE_BASE_URL and TYPESAFE_DEFAULT_MODEL (the seam tests use to point
//     at a mock; the caller's own shell supplies none of those). Proxy
//     variables come from the caller's env, which the file's own may override.
//   - otherwise: the process env, then the repo root's gitignored `.env`.
// Under Dagu the caller's environment reaches a step only as DAG params:
// card.js/dags/card.yaml forward the proxy variables (Jev needs one from a CN
// address, HTTP 451 otherwise, see SP-037); the key comes from `.env`. No key = not configured = unreachable.

const fs = require("fs");
const path = require("path");
const http = require("http");
const { parseEnv } = require("util");

const DOTENV = path.join(__dirname, "..", "..", ".env");
const DEFAULT_BASE_URL = "https://api.typesafe.ai";
const DEFAULT_MODEL = "jev-latest";
const TIMEOUT_MS = 30000;
const PROXY_VARS = ["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy"];

class JevError extends Error {}

const readEnvFile = (file) => (file && fs.existsSync(file) ? parseEnv(fs.readFileSync(file, "utf8")) : {});

function config(env = process.env) {
  const vars = env.NEMO_JEV_ENV_FILE ? readEnvFile(env.NEMO_JEV_ENV_FILE) : { ...readEnvFile(DOTENV), ...definedOnly(env) };
  const apiKey = (vars.TYPESAFE_API_KEY || "").trim();
  if (!apiKey) return null;
  const proxyEnv = {};
  const callerVars = definedOnly(env);
  for (const k of PROXY_VARS) {
    const v = vars[k] || callerVars[k];
    if (v) proxyEnv[k] = v;
  }
  return {
    apiKey,
    baseURL: (vars.TYPESAFE_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, ""),
    model: (vars.TYPESAFE_DEFAULT_MODEL || DEFAULT_MODEL).trim(),
    proxyEnv,
  };
}

function definedOnly(env) {
  return Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ""));
}

// A yes/no question (the SDK's `noul()` without criteria).
const noul = (instructions) => ({ type: "noul", instructions });

// One systemOne call; resolves to the `answers` object. Any failure — not
// configured, unreachable, non-2xx, unreadable body — is a JevError.
async function systemOne({ state, questions }, { config: cfg = config(), fetch: doFetch } = {}) {
  if (!cfg) throw new JevError("Jev is not configured: no TYPESAFE_API_KEY (set it in the repo's .env)");
  if (!doFetch) {
    if (Object.keys(cfg.proxyEnv).length) http.setGlobalProxyFromEnv(cfg.proxyEnv);
    doFetch = globalThis.fetch;
  }
  let res;
  try {
    res = await doFetch(`${cfg.baseURL}/v1/systemone`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ state, questions, model: cfg.model }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const cause = e.cause && e.cause.message ? ` (${e.cause.message})` : "";
    throw new JevError(`Jev could not be reached: ${e.message}${cause}`);
  }
  const text = await res.text();
  if (!res.ok) throw new JevError(`Jev answered HTTP ${res.status}: ${text.slice(0, 200)}`);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new JevError(`Jev answered with something that isn't JSON: ${text.slice(0, 200)}`);
  }
  if (!body || typeof body.answers !== "object" || body.answers === null) {
    throw new JevError(`Jev's reply has no answers: ${text.slice(0, 200)}`);
  }
  return body.answers;
}

module.exports = { config, systemOne, noul, JevError };
