import fs from 'node:fs';
const edit=(p,fn)=>fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')));
edit('dist/immersive.js',s=>{
 s="import { makeCar, makePlane } from './vehicles.js';\nimport { startPremiumWorld } from './driving-world.js';\n"+s;
 const a=s.indexOf('function makeCar('),b=s.indexOf('const chapters=');
 if(a<0||b<0)throw Error('Unexpected source structure');
 s=s.slice(0,a)+"try {startPremiumWorld();} catch(error) {document.querySelector('#webglFallback').hidden=false; console.warn('Driving unavailable',error.message);}\n\n"+s.slice(b);
 s=s.replace("city:'Medina'","city:'Madinah'");
 s=s.replace("expeditionImage.style.transform=`scale(${paused?1:1.15-local*.12}) translateY(${paused?0:(.5-local)*2}%)`;","expeditionImage.style.transform=innerWidth<760?'none':`scale(${paused?1:1.05-local*.05})`;\n  if(rect.top<innerHeight&&rect.bottom>0)window.zrAudio?.setDestination(chapter.city,false);");
 return s;
});
edit('dist/script.js',s=>{
 s="import { destinations, announceDestination } from './destinations.js';\n"+s;
 const a=s.indexOf('  const destinations = ['),b=s.indexOf('  const globeCanvas',a);if(a<0||b<0)throw Error('Missing destinations');s=s.slice(0,a)+s.slice(b);
 s=s.replace("button.addEventListener('click', () => selectDestination(index));","button.addEventListener('click', () => { selectDestination(index); window.zrFlyTo?.(destination.city,'Dhaka'); });");
 s=s.replace('if (closest.index >= 0) selectDestination(closest.index, false);',"if (closest.index >= 0) {selectDestination(closest.index,false); window.zrFlyTo?.(destinations[closest.index].city);}");
 s=s.replace("  const globeWrap = $('#globeWrap');","  window.zrSelectDestination = city => { const index=destinations.findIndex(d=>d.city===city); if(index>=0)selectDestination(index); };\n  const globeWrap = $('#globeWrap');");
 const p=s.indexOf('  /* Pilot mode'),q=s.indexOf('  /* Keep canvases sharp',p);if(p<0||q<0)throw Error('Missing pilot markers');s=s.slice(0,p)+"  addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});\n"+s.slice(q);
 return s;
});
edit('dist/index.html',s=>s.replace('./atlas.js','./atlas-premium.js').replace('Cybersecurity engineer / researcher / explorer','CYBERSECURITY ENGINEER / RESEARCHER').replace('CYBERSECURITY / RESEARCH</strong>','CYBERSECURITY ENGINEER / RESEARCHER</strong>').replace('Cybersecurity, Research & Beyond Borders','CYBERSECURITY ENGINEER / RESEARCHER').replace('<script type="module" src="./atlas-premium.js"></script>','<script type="module" src="./atlas-premium.js"></script>\n  <script type="module" src="./flight.js"></script>'));
