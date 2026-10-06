import { parseArgs, type Args } from "./lib/args";

type Command = { run: (args: Args) => Promise<number> };

const COMMANDS: Record<string, () => Promise<Command>> = {
  validate: () => import("./commands/validate"),
  script: () => import("./commands/script"),
};

const USAGE = `Usage: npm run reelkit -- <command> [...]
Commands: ${Object.keys(COMMANDS).join(", ")}`;

const main = async () => {
  const [name, ...rest] = process.argv.slice(2);
  const load = name ? COMMANDS[name] : undefined;
  if (!load) {
    console.error(USAGE);
    return 2;
  }
  const command = await load();
  return command.run(parseArgs(rest));
};

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(err instanceof Error ? err.stack : String(err));
    process.exitCode = 1;
  },
);
