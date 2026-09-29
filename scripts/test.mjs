import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const directory = await mkdtemp(join(tmpdir(), 'linear-prs-tests-'));
try {
  const outfile = join(directory, 'tests.mjs');
  await build({
    entryPoints: ['tests/regression.test.ts'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    plugins: [
      {
        name: 'mock-obsidian',
        setup(builder) {
          builder.onResolve({ filter: /^obsidian$/ }, () => ({
            path: 'obsidian',
            namespace: 'test',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
            contents:
              'export const requestUrl = options => globalThis.requestMock(options);',
            loader: 'js',
          }));
        },
      },
    ],
  });
  const result = spawnSync(process.execPath, ['--test', outfile], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
