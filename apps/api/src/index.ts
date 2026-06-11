/**
 * Process entry point: load config from the environment, build the app and
 * bind the port. Kept minimal so the whole stack stays testable via buildApp.
 */
import { loadConfig } from './config';
import { buildApp } from './server';

try {
  // Node ≥ 20.12 built-in .env loader — keys never need to live in the shell.
  // Missing file is the normal keyless/demo case, so it must not be fatal.
  process.loadEnvFile();
} catch {
  // No .env present — run on ambient environment (demo mode without a key).
}

const config = loadConfig();
const app = buildApp(config);

const server = app.listen(config.port, () => {
  // Structured like the request logs so Cloud Logging ingests it uniformly.
  // Security: config echoes booleans and numbers only — never key material.
  process.stdout.write(
    `${JSON.stringify({
      severity: 'INFO',
      message: 'carbon-saathi api listening',
      port: config.port,
      demoMode: config.demoMode,
      version: config.version,
    })}\n`,
  );
});

// Cloud Run sends SIGTERM with a 10s grace window when a revision retires;
// closing the listener first lets in-flight requests finish instead of
// being reset mid-response during deploys.
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
