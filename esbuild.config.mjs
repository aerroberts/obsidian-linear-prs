import { readFile, writeFile } from 'node:fs/promises';
import esbuild from 'esbuild';
import process from 'node:process';
const buildContext = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*'],
  platform: 'node',
  format: 'cjs',
  target: 'es2022',
  outfile: 'main.js',
  sourcemap: process.argv.includes('--watch') ? 'inline' : false,
});
if (process.argv.includes('--watch')) {
  await buildContext.watch();
} else {
  try {
    await buildContext.rebuild();
  } finally {
    await buildContext.dispose();
  }
}

const css = await readFile('src/styles.source.css', 'utf8');
await writeFile('styles.css', css);
