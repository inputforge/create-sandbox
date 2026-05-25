import type { PlatformConfig } from "../platform.js";
import type { SandboxConfig } from "../sandbox.js";
import { createLimaProvider } from "./lima/index.js";
import { createQemuProvider } from "./qemu/index.js";

export interface VmProvider {
  isInitialized(name: string): boolean;
  isRunning(name: string): Promise<boolean>;
  /**
   * Start the VM (first or subsequent boot). Handles all provider-specific
   * setup, boot sequencing, and waiting until SSH + provisioning are ready.
   * Returns the SSH port.
   */
  start(
    config: SandboxConfig,
    name: string,
    snapshot: SandboxConfig | null
  ): Promise<number>;
  stop(name: string): Promise<void>;
  destroy(name: string): Promise<void>;
}

export function getProvider(pc: PlatformConfig): VmProvider {
  if (pc.provider === "lima") {
    return createLimaProvider(pc);
  }
  return createQemuProvider(pc);
}
