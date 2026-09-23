import { readFile, writeFile } from 'node:fs/promises';
import esbuild from 'esbuild';
import process from 'node:process';
const ctx = await esbuild.context({entryPoints:['src/main.ts'],bundle:true,external:['obsidian','electron','@codemirror/*','@lezer/*'],platform:'node',format:'cjs',target:'es2022',outfile:'main.js',sourcemap:process.argv.includes('--watch')?'inline':false});
if(process.argv.includes('--watch')) await ctx.watch(); else {await ctx.rebuild(); await ctx.dispose();}

const font = (await readFile('src/assets/jetbrains-mono.woff2')).toString('base64');
const css = (await readFile('src/styles.source.css','utf8')).replace('__FONT_DATA__',font);
await writeFile('styles.css',css);
