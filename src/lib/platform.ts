import { platform, arch } from 'os';

export type HostArch = 'arm64' | 'x86_64';
export type HostPlatform = 'macos' | 'linux' | 'windows';

export interface PlatformConfig {
  platform: HostPlatform;
  arch: HostArch;
  qemuBin: string;
  accel: string;
  machine: string;
  firmware: string | null;
  ubuntuArch: 'arm64' | 'amd64';
  cpuArg: string;
}

export function getPlatformConfig(): PlatformConfig {
  const os = platform();
  const a = arch();
  const isArm = a === 'arm64' || a === 'arm';
  const p: HostPlatform = os === 'darwin' ? 'macos' : os === 'win32' ? 'windows' : 'linux';

  if (p === 'macos' && isArm) {
    return {
      platform: 'macos', arch: 'arm64',
      qemuBin: 'qemu-system-aarch64',
      accel: 'hvf', machine: 'virt',
      firmware: '/opt/homebrew/share/qemu/edk2-aarch64-code.fd',
      ubuntuArch: 'arm64', cpuArg: 'host',
    };
  }
  if (p === 'macos' && !isArm) {
    return {
      platform: 'macos', arch: 'x86_64',
      qemuBin: 'qemu-system-x86_64',
      accel: 'hvf', machine: 'q35',
      firmware: '/opt/homebrew/share/qemu/edk2-x86_64-code.fd',
      ubuntuArch: 'amd64', cpuArg: 'host',
    };
  }
  if (p === 'linux' && isArm) {
    return {
      platform: 'linux', arch: 'arm64',
      qemuBin: 'qemu-system-aarch64',
      accel: 'kvm', machine: 'virt',
      firmware: '/usr/share/qemu/edk2-aarch64-code.fd',
      ubuntuArch: 'arm64', cpuArg: 'host',
    };
  }
  if (p === 'linux' && !isArm) {
    return {
      platform: 'linux', arch: 'x86_64',
      qemuBin: 'qemu-system-x86_64',
      accel: 'kvm', machine: 'q35',
      firmware: null,
      ubuntuArch: 'amd64', cpuArg: 'host',
    };
  }
  // Windows x86_64
  return {
    platform: 'windows', arch: 'x86_64',
    qemuBin: 'qemu-system-x86_64',
    accel: 'whpx', machine: 'q35',
    firmware: null,
    ubuntuArch: 'amd64', cpuArg: 'host',
  };
}

const UBUNTU_CODENAMES: Record<string, string> = {
  '26.04': 'resolute',
  '24.04': 'noble',
};

export function getUbuntuImageName(version: string, ubuntuArch: 'arm64' | 'amd64'): string {
  const codename = UBUNTU_CODENAMES[version];
  if (!codename) throw new Error(`Unsupported Ubuntu version: ${version}`);
  return `${codename}-server-cloudimg-${ubuntuArch}.img`;
}

export function getUbuntuImageUrl(version: string, ubuntuArch: 'arm64' | 'amd64'): string {
  const codename = UBUNTU_CODENAMES[version];
  if (!codename) throw new Error(`Unsupported Ubuntu version: ${version}`);
  const name = getUbuntuImageName(version, ubuntuArch);
  return `https://cloud-images.ubuntu.com/${codename}/current/${name}`;
}
