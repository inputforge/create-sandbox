import {
  intro, outro, select, multiselect, text, confirm,
  isCancel, cancel, log,
} from '@clack/prompts';
import { basename } from 'path';
import { existsSync } from 'fs';
import { join } from 'path';
import { writeSandboxConfig, type SandboxConfig } from '../lib/sandbox.js';

const VERSIONED_PACKAGES = ['nodejs', 'bun', 'java', 'go', 'swift'];

const PACKAGE_DEFAULTS: Record<string, string> = {
  nodejs: '22',
  bun: '1.3.12',
  java: '21',
  go: '1.24.3',
  swift: '6.0.3',
};

function bail(): never {
  cancel('Cancelled.');
  process.exit(0);
}

export async function init(): Promise<void> {
  const name = basename(process.cwd());
  intro(`create-sandbox — initializing "${name}"`);

  const sandboxJsonPath = join(process.cwd(), 'sandbox.json');
  if (existsSync(sandboxJsonPath)) {
    const overwrite = await confirm({
      message: 'sandbox.json already exists. Overwrite?',
      initialValue: false,
    });
    if (isCancel(overwrite) || !overwrite) bail();
  }

  // Ubuntu version
  const ubuntu = await select<string>({
    message: 'Ubuntu version',
    options: [
      { value: '26.04', label: 'Ubuntu 26.04 LTS (Resolute Raccoon)' },
      { value: '24.04', label: 'Ubuntu 24.04 LTS (Noble Numbat)' },
    ],
    initialValue: '26.04',
  });
  if (isCancel(ubuntu)) bail();

  // VM resources
  const cpusRaw = await text({
    message: 'CPUs',
    initialValue: '4',
    validate: (v) => (isNaN(Number(v)) || Number(v) < 1) ? 'Must be a positive integer' : undefined,
  });
  if (isCancel(cpusRaw)) bail();

  const memory = await text({
    message: 'Memory',
    initialValue: '4G',
    placeholder: '4G',
    validate: (v) => /^\d+[MG]$/i.test(v ?? '') ? undefined : 'Format: e.g. 4G or 2048M',
  });
  if (isCancel(memory)) bail();

  const disk = await text({
    message: 'Disk size',
    initialValue: '20G',
    placeholder: '20G',
    validate: (v) => /^\d+[MG]$/i.test(v ?? '') ? undefined : 'Format: e.g. 20G or 10240M',
  });
  if (isCancel(disk)) bail();

  // Package selection
  const selectedRaw = await multiselect<string>({
    message: 'Select packages to install',
    options: [
      { value: 'nodejs', label: 'Node.js' },
      { value: 'bun', label: 'Bun' },
      { value: 'python', label: 'Python 3' },
      { value: 'java', label: 'Java (OpenJDK)' },
      { value: 'go', label: 'Go' },
      { value: 'ruby', label: 'Ruby' },
      { value: 'php', label: 'PHP' },
      { value: 'swift', label: 'Swift' },
    ],
    required: false,
  });
  if (isCancel(selectedRaw)) bail();
  const selectedPackages = selectedRaw as string[];

  // Versions for selected versioned packages
  const packages: SandboxConfig['packages'] = {};

  for (const pkg of selectedPackages) {
    if (VERSIONED_PACKAGES.includes(pkg)) {
      const ver = await text({
        message: `${pkg} version`,
        initialValue: PACKAGE_DEFAULTS[pkg] ?? 'latest',
      });
      if (isCancel(ver)) bail();
      packages[pkg] = { enabled: true, version: ver as string };
    } else {
      packages[pkg] = { enabled: true };
    }
  }

  // Mark unselected packages as disabled
  const allPackages = ['nodejs', 'bun', 'python', 'java', 'go', 'ruby', 'php', 'swift'];
  for (const pkg of allPackages) {
    if (!(pkg in packages)) {
      packages[pkg] = { enabled: false };
    }
  }

  // Remote path
  const remotePath = await text({
    message: 'Remote path for file sync',
    initialValue: `/home/ubuntu/${name}`,
  });
  if (isCancel(remotePath)) bail();

  const config: SandboxConfig = {
    ubuntu: ubuntu as string,
    vm: {
      cpus: Number(cpusRaw),
      memory: memory as string,
      disk: disk as string,
    },
    packages,
    send: { remotePath: remotePath as string },
  };

  writeSandboxConfig(config);
  outro(`sandbox.json created. Run: create-sandbox start`);
}
