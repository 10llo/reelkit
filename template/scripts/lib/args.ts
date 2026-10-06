export type Args = { positional: string[]; flags: Record<string, string | true> };

export const parseArgs = (argv: string[]): Args => {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (const arg of argv) {
    if (arg.startsWith("--")) {
      const [key, ...rest] = arg.slice(2).split("=");
      flags[key] = rest.length ? rest.join("=") : true;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
};

export const flagString = (args: Args, name: string, fallback: string): string => {
  const value = args.flags[name];
  return typeof value === "string" ? value : fallback;
};
