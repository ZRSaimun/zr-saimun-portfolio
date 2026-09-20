import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/photo-manifest.json'),'utf8'));
const audit=JSON.parse(fs.readFileSync(path.join(root,'PHOTO-AUDIT.json'),'utf8'));
const records=[];
for(const [collection,items] of Object.entries(manifest)){
 for(const item of items){
  records.push({id:path.basename(item.src,path.extname(item.src)),collection,src:item.src,caption:item.caption,kind:item.kind,original:item.original||null});
 }
}
records.sort((a,b)=>a.src.localeCompare(b.src));
const duplicateSources=[...new Set(records.map(record=>record.src).filter((src,index,all)=>all.indexOf(src)!==index))];
if(duplicateSources.length)throw new Error(`Duplicate photo paths: ${duplicateSources.join(', ')}`);
const registry={schemaVersion:1,generatedFrom:'dist/photo-manifest.json',photoCount:records.length,collections:Object.fromEntries(Object.entries(manifest).map(([name,items])=>[name,items.length])),duplicatesExcluded:audit.duplicatesExcluded,records};
fs.writeFileSync(path.join(root,'PHOTO-REGISTRY.json'),JSON.stringify(registry,null,2)+'\n');
console.log(`Wrote PHOTO-REGISTRY.json with ${records.length} unique uploaded photographs.`);
