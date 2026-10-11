// EN-036 step contract helper for pipeline step CLIs (dags/card.yaml).
//
// Node exits 1 on an uncaught exception, but exit 1 means "stopped with a
// reason" in the step contract, so a crash would read as a clean stop.
// Requiring this module makes any crash print its stack to stderr and exit 2.

process.on("uncaughtException", (err) => {
  process.stderr.write(`${err.stack}\n`);
  process.exit(2);
});
