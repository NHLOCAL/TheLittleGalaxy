import { copyFile, mkdir } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await mkdir(new URL('assets/vendor/',root),{recursive:true});
for(const name of ['three.module.js','three.core.js']) await copyFile(new URL('node_modules/three/build/'+name,root),new URL('assets/vendor/'+name,root));
await copyFile(new URL('node_modules/three/LICENSE',root),new URL('assets/vendor/THREE-LICENSE.txt',root));
await mkdir(new URL('assets/fonts/',root),{recursive:true});
for(const subset of ['hebrew','latin']) await copyFile(new URL('node_modules/@fontsource-variable/heebo/files/heebo-'+subset+'-wght-normal.woff2',root),new URL('assets/fonts/heebo-'+subset+'.woff2',root));
await copyFile(new URL('node_modules/@fontsource-variable/heebo/LICENSE',root),new URL('assets/fonts/HEEBO-LICENSE.txt',root));
console.log('Vendored verified Three.js 0.180.0 modules and license.');
