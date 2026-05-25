import { sandboxName } from "../lib/paths.js";
import { getPlatformConfig } from "../lib/platform.js";
import { getProvider } from "../lib/providers/index.js";

export async function destroy(): Promise<void> {
  const name = sandboxName();
  const provider = getProvider(getPlatformConfig());
  await provider.destroy(name);
  console.log(`Sandbox "${name}" destroyed.`);
}
