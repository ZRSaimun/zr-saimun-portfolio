import { journeyAudio } from './soundscape.js';
import './atlas.css';
const photo=(name,caption)=>({src:'./assets/photos/'+name+'.webp',caption,kind:'Personal photograph'});
const art=(name,caption)=>({src:'./assets/destinations/'+name+'.webp',caption,kind:'AI destination illustration • not a trip photograph'});
const cities=[
 ['London','United Kingdom','europe',[photo('IMG_4317','A familiar bridge. A new perspective.'),photo('C94C00E9-3BDE-4F91-930E-B1E26685FF71_1_201_a','A bright pause beside the Trafalgar Square fountain.'),photo('IMG_7399','The city, one step at a time.')]],
 ['Madrid','Spain','europe',[art('madrid','An illustrated glimpse of Madrid.')]],
 ['Paris','France','europe',[art('paris','An illustrated Parisian horizon.')]],
 ['Stockholm','Sweden','north',[art('stockholm','An illustrated northern waterfront.')]],
 ['Oslo','Norway','north',[art('oslo','An illustrated Scandinavian pause.')]],
 ['Barcelona','Spain','europe',[art('barcelona','Architecture reaching towards the light.')]],
 ['Santorini','Greece','mediterranean',[
 photo('IMG_6799','Blue domes above the Aegean.'),photo('IMG_0840','Whitewashed lanes in the evening light.'),photo('IMG_6316(1)','The quiet between journeys.'),photo('IMG_6315','A wider view of a moment worth keeping.'),photo('IMG_6288','Following the steps towards the sky.'),photo('IMG_6239','Sunlight, sea air and a winding path.'),photo('IMG_0770','A moment framed in blue and white.'),photo('8B256216-6194-4BDD-8748-49EA5D58ECEF','An island story, told on foot.')]],
 ['Corfu','Greece','mediterranean',[art('corfu','An illustrated Ionian shoreline.')]],
 ['Athens','Greece','mediterranean',[art('athens','An illustrated meeting of past and present.')]],
 ['Milan','Italy','europe',[art('milan','An illustrated study in Italian architecture.')]],
 ['Geneva','Switzerland','europe',[photo('IMG_5322','Geneva: another arrival, another chapter.')]],
 ['Amsterdam','Netherlands','europe',[photo('IMG_5641','Arriving with curiosity at I amsterdam.'),photo('IMG_8806','A canal-side moment from the archive.')]],
 ['Istanbul','Türkiye','mediterranean',[art('istanbul','An illustrated city between two continents.')]],
 ['Beijing','China','asia-pacific',[art('beijing','An illustrated view of an imperial city.')]],
 ['Sydney','Australia','asia-pacific',[photo('IMG_8253','A harbour view from the other side of the world.')]],
 ['Tenerife','Spain','mediterranean',[art('tenerife','An illustrated volcanic island horizon.')]],
 ['Tromsø','Norway','north',[art('tromso','An illustrated Arctic night.')]],
 ['Medina','Saudi Arabia','asia-pacific',[photo('IMG_1804','A quiet moment of faith and reflection.')]],
 ['Dubai','United Arab Emirates','asia-pacific',[photo('IMG_8446','A pause above the marina.'),photo('IMG_8625','A skyline held in memory.')]]
];
const archive=['IMG_5433','639A75B7-6E1A-4A6B-BE77-D221717E3278_1_201_a','4405339D-5130-483B-9F46-2E00ED4536BB','FCE855CB-7D7E-49EE-A8F5-45D45F2E9669_1_201_a','362EA9A2-62A4-4318-93B5-0037AFA03B56','90145142-54A4-4A55-917C-A1963FE0166B','9CB5787E-0B6A-424A-A5F2-9C19489230A9','30E9902C-62B6-4B87-B378-6070E667E3BE_1_201_a','CC9D8006-DC70-4D82-8BB0-1E25646D535B_1_201_a','IMG_2755','IMG_0333','IMG_0334','IMG_0380','90189593-CD65-45F9-8599-68DE9310F6EB','IMG_9755','IMG_6162','IMG_1026','IMG_1023','IMG_0977'].map(n=>photo(n,'A frame from the personal archive.'));
const grid=document.querySelector('.atlas__grid');grid.replaceChildren();
document.querySelector('.atlas__head .eyebrow').textContent='Your next stop is a click away';
document.querySelector('.atlas__head>p:not(.eyebrow)').textContent='Open a city. Fly through its frames. Explore personal memories and clearly labelled destination illustrations.';
const visited=new Set();
const counter=document.createElement('p');counter.className='atlas-count';grid.before(counter);
const updateCount=()=>counter.textContent=`EXPLORER PASSPORT / ${visited.size} OF ${cities.length} DESTINATIONS OPENED`;
updateCount();
const dialog=document.createElement('dialog');dialog.className='flight-gallery';dialog.innerHTML=`<header><div><p id="flightCountry"></p><h2 id="flightTitle"></h2></div><button id="flightClose" aria-label="Close gallery">Close ×</button></header><div class="flight-stage"><img id="flightImage" alt=""><span class="flight-plane" aria-hidden="true">✈</span><button class="flight-prev" aria-label="Previous photo">←</button><button class="flight-next" aria-label="Next photo">→</button></div><div class="flight-copy" aria-live="polite"><span id="flightKind"></span><p id="flightCaption"></p></div><div class="flight-tools"><button id="flightAuto" aria-pressed="false">Play journey</button><button id="flightZoom" aria-pressed="false">Zoom in</button><span id="flightNumber"></span></div><div class="flight-thumbs" aria-label="Choose a photograph"></div>`;document.body.append(dialog);
let frames=[],index=0,auto=null,zoom=false,pan={x:0,y:0},drag=null;
const img=dialog.querySelector('#flightImage'),stage=dialog.querySelector('.flight-stage');
function stop(){clearInterval(auto);auto=null;dialog.querySelector('#flightAuto').textContent='Play journey';dialog.querySelector('#flightAuto').setAttribute('aria-pressed','false');}
function setZoom(value){zoom=value;pan={x:0,y:0};img.style.transform=value?'scale(2)':'none';stage.classList.toggle('is-zoomed',value);dialog.querySelector('#flightZoom').textContent=value?'Zoom out':'Zoom in';dialog.querySelector('#flightZoom').setAttribute('aria-pressed',String(value));}
function show(i){journeyAudio.play('photo-discover',.3);index=(i+frames.length)%frames.length;setZoom(false);const f=frames[index];img.src=f.src;img.alt=f.caption;dialog.querySelector('#flightCaption').textContent=f.caption;dialog.querySelector('#flightKind').textContent=f.kind;dialog.querySelector('#flightNumber').textContent=`${index+1} / ${frames.length}`;dialog.querySelectorAll('.flight-thumbs button').forEach((b,j)=>b.setAttribute('aria-current',String(j===index)));if(!window.zrMotionPaused&&!matchMedia('(prefers-reduced-motion: reduce)').matches){img.animate([{opacity:0,transform:'translateX(6%) scale(.94)'},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:650,easing:'cubic-bezier(.2,.8,.2,1)'});dialog.querySelector('.flight-plane').animate([{transform:'translate(-50vw,40px) rotate(-12deg)',opacity:0},{opacity:1,offset:.25},{transform:'translate(50vw,-60px) rotate(-12deg)',opacity:0}],{duration:900});}}
window.zrOpenGallery=(title,items,country='PERSONAL ARCHIVE')=>{journeyAudio.setDestination(title);stop();frames=items;dialog.querySelector('#flightTitle').textContent=title;dialog.querySelector('#flightCountry').textContent=country;const thumbs=dialog.querySelector('.flight-thumbs');thumbs.replaceChildren();items.forEach((f,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','View photo '+(i+1));const image=new Image();image.src=f.src;image.alt='';image.loading='lazy';b.append(image);b.onclick=()=>{stop();show(i);};thumbs.append(b);});if(!dialog.open)dialog.showModal();show(0);};
cities.forEach(([city,country,region,items])=>{const b=document.createElement('button');b.className='atlas-card';b.dataset.region=region;b.dataset.city=city;b.innerHTML=`<img src="${items[0].src}" alt="${city}" loading="lazy"><span>${items[0].kind.startsWith('AI')?'AI DESTINATION ILLUSTRATION':'PERSONAL MEMORIES'}</span><h3>${city}</h3><p>${country} · ${items.length} ${items.length===1?'frame':'frames'} ↗</p>`;b.onclick=()=>{visited.add(city);updateCount();b.classList.add('visited');window.zrOpenGallery(city,items,country);};grid.append(b);});
const archiveButton=document.createElement('button');archiveButton.className='archive-open';archiveButton.textContent='Explore more personal photographs ↗';archiveButton.onclick=()=>window.zrOpenGallery('Between destinations',archive);grid.after(archiveButton);
document.querySelectorAll('.atlas__filters button').forEach(b=>{b.removeAttribute('role');b.setAttribute('aria-pressed',String(b.classList.contains('is-active')));b.addEventListener('click',()=>document.querySelectorAll('.atlas__filters button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))));});document.querySelector('.atlas__filters').setAttribute('role','group');
dialog.querySelector('#flightClose').onclick=()=>dialog.close();dialog.addEventListener('close',stop);dialog.addEventListener('cancel',stop);
dialog.querySelector('.flight-prev').onclick=()=>{stop();show(index-1);};dialog.querySelector('.flight-next').onclick=()=>{stop();show(index+1);};
dialog.querySelector('#flightZoom').onclick=()=>{stop();setZoom(!zoom);};img.ondblclick=()=>setZoom(!zoom);
dialog.querySelector('#flightAuto').onclick=()=>{if(auto){stop();return;}if(frames.length<2)return;auto=setInterval(()=>{if(!document.hidden&&!window.zrMotionPaused)show(index+1);},4500);dialog.querySelector('#flightAuto').textContent='Pause journey';dialog.querySelector('#flightAuto').setAttribute('aria-pressed','true');};
const originalOpen=window.zrOpenGallery;window.zrOpenGallery=(...args)=>{originalOpen(...args);dialog.querySelector('#flightAuto').disabled=frames.length<2;dialog.querySelector('.flight-prev').disabled=frames.length<2;dialog.querySelector('.flight-next').disabled=frames.length<2;};
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();stop();show(index+1);}if(e.key==='ArrowLeft'){e.preventDefault();stop();show(index-1);}});
stage.addEventListener('pointerdown',e=>{if(e.target!==img)return;drag={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};stage.setPointerCapture(e.pointerId);});stage.addEventListener('pointermove',e=>{if(!drag||!zoom)return;pan.x=Math.max(-stage.clientWidth/2,Math.min(stage.clientWidth/2,drag.px+e.clientX-drag.x));pan.y=Math.max(-stage.clientHeight/2,Math.min(stage.clientHeight/2,drag.py+e.clientY-drag.y));img.style.transform=`translate(${pan.x}px,${pan.y}px) scale(2)`;});stage.addEventListener('pointerup',e=>{if(drag&&!zoom&&Math.abs(e.clientX-drag.x)>50){stop();show(index+(e.clientX<drag.x?1:-1));}drag=null;});stage.addEventListener('pointercancel',()=>drag=null);
const mobile=document.querySelector('#mobileMenu');const atlasLink=document.createElement('a');atlasLink.href='#atlas';atlasLink.textContent='08 / City galleries';atlasLink.onclick=()=>document.querySelector('#menuToggle').click();mobile.append(atlasLink);
