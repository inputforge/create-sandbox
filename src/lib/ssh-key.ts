import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { appDataDir, globalKeyPath, globalKeyPubPath } from './paths.js';

const CANDIDATES = [
  join(homedir(), '.ssh', 'id_ed25519.pub'),
  join(homedir(), '.ssh', 'id_rsa.pub'),
  join(homedir(), '.ssh', 'id_ecdsa.pub'),
];

export function findSshPublicKey(): string {
  for (const candidate of CANDIDATES) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, 'utf8').trim();
    }
  }
  return generateSshKey();
}

function generateSshKey(): string {
  mkdirSync(appDataDir, { recursive: true });
  execSync(
    `ssh-keygen -t ed25519 -f "${globalKeyPath}" -N "" -C "create-sandbox"`,
    { stdio: 'ignore' }
  );
  return readFileSync(globalKeyPubPath, 'utf8').trim();
}
