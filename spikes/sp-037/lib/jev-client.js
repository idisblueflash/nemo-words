"use strict";

// The real Jev client: TypeSafe's SDK, key `TYPESAFE_API_KEY` from the
// environment or the repo root's gitignored `.env`.

const fs = require("node:fs");
const path = require("node:path");
const { TypeSafeClient } = require("@typesafe-ai/sdk");

const ENV_FILE = path.join(__dirname, "..", "..", "..", ".env");

function makeClient() {
  if (!process.env.TYPESAFE_API_KEY && fs.existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  return new TypeSafeClient();
}

module.exports = { makeClient };
