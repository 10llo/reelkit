import { fileURLToPath } from "node:url";

/** Absolute path of `template/`, with a trailing separator. */
export const TEMPLATE_ROOT = fileURLToPath(new URL("../../", import.meta.url));
