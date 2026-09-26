import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

const run = (...args: string[]) => spawnSync('bash', ['scripts/android-env.sh', ...args], {
  encoding: 'utf8', env: { ...process.env, JAVA_HOME: '/not-a-real-java-home', ANDROID_HOME: '/not-an-sdk' },
});
describe('Android build environment guard', () => {
  it('shows supported commands without requiring an installed SDK', () => {
    const result = run('--help');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('build|check|test');
  });
  it('rejects arbitrary commands before invoking Gradle', () => {
    expect(run('unknown').status).toBe(2);
  });
  it('fails clearly on explicit invalid JAVA_HOME instead of choosing another Java', () => {
    const result = run('build');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('JAVA_HOME');
  });
});
