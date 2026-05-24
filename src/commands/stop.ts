import * as p from '@clack/prompts';
import { vmSockPath, sandboxName } from '../lib/paths.js';
import { isVmRunning, sendMonitorCommand, waitForSockGone } from '../lib/qemu.js';

export async function stop(): Promise<void> {
  const name = sandboxName();
  const sockPath = vmSockPath();

  if (!(await isVmRunning(sockPath))) {
    console.error(`Sandbox "${name}" is not running.`);
    process.exit(1);
  }

  const s = p.spinner();
  s.start('Sending shutdown signal...');

  try {
    await sendMonitorCommand(sockPath, 'system_powerdown');
    s.message('Waiting for VM to shut down...');
    await waitForSockGone(sockPath);
    s.stop(`Sandbox "${name}" stopped.`);
  } catch (err) {
    s.stop('Error during shutdown.');
    console.error(String(err));
    process.exit(1);
  }
}
