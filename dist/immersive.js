import { makeCar, makePlane } from './vehicles.js';
import { startPremiumWorld } from './driving-world.js';
import * as THREE from 'three';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let paused = reduced;
window.zrMotionPaused = paused;
document.body.classList.toggle('is-motion-paused', paused);
const motionButton = $('#motionToggle');
motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
motionButton.setAttribute('aria-pressed', String(paused));
motionButton.addEventListener('click', () => {
  paused = !paused;
  window.zrMotionPaused = paused;
  document.body.classList.toggle('is-motion-paused', paused);
  motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
  motionButton.setAttribute('aria-pressed', String(paused));
});

const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('./assets/earth-atmosphere.jpg');
earthTexture.colorSpace = THREE.SRGBColorSpace;
earthTexture.anisotropy = 4;
const palette = { gold: 0xe8ca86, cyan: 0x81ddea, ink: 0x091321, white: 0xe9eee9 };
const material = (color, options = {}) => new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.25,...options});
const glowMaterial = (color, intensity=1) => material(color,{emissive:color,emissiveIntensity:intensity,roughness:.3});
const dark = material(0x132536);
const gold = material(palette.gold,{metalness:.65,roughness:.3});
const white = material(palette.white,{roughness:.3});
const cyan = glowMaterial(palette.cyan,.7);

function mesh(geometry, mat, parent, x=0,y=0,z=0) {
  const object = new THREE.Mesh(geometry,mat);
  object.position.set(x,y,z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
function box(parent,w,h,d,mat,x=0,y=0,z=0) {return mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z);}
function ring(parent,r,width,mat,x=0,y=0,z=0) {
  const object=mesh(new THREE.TorusGeometry(r,width,8,96),mat,parent,x,y,z);
  object.rotation.x=Math.PI/2;
  return object;
}
function label(text,subtext,width=7) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#08131ce6';ctx.fillRect(0,0,1024,256);
  ctx.fillStyle='#e8ca86';ctx.fillRect(0,0,5,256);
  ctx.fillStyle='#f2f3e9';ctx.font='500 64px sans-serif';ctx.fillText(text,50,105);
  ctx.fillStyle='#b5cbd4';ctx.font='32px sans-serif';ctx.fillText(subtext,52,170);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  sprite.scale.set(width,width/4,1);return sprite;
}
function starfield(scene,count=600,radius=120) {
  const positions=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,b=Math.acos(Math.random()*2-1),r=radius*(.65+Math.random()*.35);
    positions[i*3]=Math.sin(b)*Math.cos(a)*r;positions[i*3+1]=Math.cos(b)*r;positions[i*3+2]=Math.sin(b)*Math.sin(a)*r;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const field=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xb6dce6,size:.16,transparent:true,opacity:.75,depthWrite:false}));scene.add(field);return field;
}
function rendererFor(canvas,shadows=false) {
  const context=canvas.getContext('webgl2',{antialias:innerWidth>760,alpha:false,powerPreference:'high-performance'});
  if(!context)return new SoftwareWorldRenderer(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,context,antialias:innerWidth>760,powerPreference:'high-performance',alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<760?1.35:1.8));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  renderer.shadowMap.enabled=shadows&&innerWidth>760;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  return renderer;
}

/* A shared scene fallback keeps driving usable when 3D acceleration is unavailable. */
class SoftwareWorldRenderer {
  constructor(canvas){this.canvas=canvas;this.context=canvas.getContext('2d');this.size=new THREE.Vector2();this.frames=0;this.canvas.dataset.renderer='canvas';this.mapCanvas=document.createElement('canvas');this.mapCanvas.width=512;this.mapCanvas.height=256;this.mapPixels=null;this.globeCanvas=document.createElement('canvas');this.globeCanvas.width=160;this.globeCanvas.height=160;this.lastGlobe=0;}
  getSize(target){return target.copy(this.size);}
  setSize(w,h){this.size.set(w,h);this.canvas.width=w;this.canvas.height=h;}
  render(scene,camera){
    this.frames++;const ctx=this.context,w=this.size.x,h=this.size.y;if(!ctx||!w||!h)return;
    scene.updateMatrixWorld();camera.updateMatrixWorld();
    const vp=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const project=(point)=>{const p=point.clone().applyMatrix4(vp);return {x:(p.x*.5+.5)*w,y:(-.5*p.y+.5)*h,z:p.z};};
    const items=[];let surfaceOrder=0;
    const tint=(mat,factor=1)=>{const c=mat.color?.clone()||new THREE.Color(0x79bfdb);c.multiplyScalar(factor);return '#'+c.getHexString(THREE.SRGBColorSpace);};
    const polygon=(points,color,opacity=1)=>{const p=points.map(project);if(p.some(a=>a.z>1||a.z< -1))return;items.push({kind:'poly',p,color,opacity,z:p.reduce((s,a)=>s+a.z,0)/p.length+surfaceOrder});};
    scene.traverseVisible(object=>{
      if(object.isSprite){
        const image=object.material.map?.image;if(!image)return;const p=object.getWorldPosition(new THREE.Vector3()),center=project(p),right=project(p.clone().add(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(object.scale.x/2)));
        const width=Math.hypot(center.x-right.x,center.y-right.y)*2;items.push({kind:'image',image,x:center.x-width/2,y:center.y-width/8,w:width,h:width/4,z:center.z});return;
      }
      if(!object.isMesh)return;
      const mat=Array.isArray(object.material)?object.material[0]:object.material;if(mat.isShaderMaterial||mat.opacity<.1)return;
      const geometry=object.geometry,params=geometry.parameters||{};
      surfaceOrder=geometry.type==='CylinderGeometry'&&params.radiusTop>10?10:geometry.type==='CylinderGeometry'&&params.radiusTop>7?1:0;
      const pos=object.getWorldPosition(new THREE.Vector3()),scale=object.getWorldScale(new THREE.Vector3()),center=project(pos);
      if(center.z>1||center.z< -1)return;
      if(geometry.type==='SphereGeometry'&&params.radius>4){
        const edge=project(pos.clone().add(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(params.radius*scale.x)));
        items.push({kind:'globe',object,x:center.x,y:center.y,r:Math.hypot(edge.x-center.x,edge.y-center.y),z:center.z});return;
      }
      if(geometry.type==='TorusGeometry'){
        const points=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*params.radius,Math.sin(a)*params.radius,0).applyMatrix4(object.matrixWorld));}
        const p=points.map(project);items.push({kind:'line',p,color:tint(mat),width:params.tube>.5?Math.max(2,params.tube*12):1,opacity:mat.opacity??1,z:center.z+(params.radius>18?5:0)});return;
      }
      if(geometry.type==='CylinderGeometry'){
        const n=12,top=[],bottom=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;top.push(new THREE.Vector3(Math.sin(a)*params.radiusTop,params.height/2,Math.cos(a)*params.radiusTop).applyMatrix4(object.matrixWorld));bottom.push(new THREE.Vector3(Math.sin(a)*params.radiusBottom,-params.height/2,Math.cos(a)*params.radiusBottom).applyMatrix4(object.matrixWorld));}
        for(let i=0;i<n;i++){const j=(i+1)%n;polygon([top[i],top[j],bottom[j],bottom[i]],tint(mat,.65+.25*Math.sin(i)),mat.opacity??1);}polygon(top,tint(mat,1.15),mat.opacity??1);return;
      }
      if(mat.map?.image&&geometry.type==='PlaneGeometry'){
        const image=mat.map.image;if(!image.complete&&image.tagName==='IMG')return;
        const a=new THREE.Vector3(-params.width/2,params.height/2,0).applyMatrix4(object.matrixWorld),b=new THREE.Vector3(params.width/2,params.height/2,0).applyMatrix4(object.matrixWorld),c=new THREE.Vector3(-params.width/2,-params.height/2,0).applyMatrix4(object.matrixWorld);
        items.push({kind:'panel',image,a:project(a),b:project(b),c:project(c),z:center.z});return;
      }
      const attr=geometry.attributes.position,index=geometry.index;
      const count=index?index.count:attr.count;
      for(let i=0;i<count;i+=3){
        const points=[];for(let j=0;j<3;j++){const k=index?index.array[i+j]:i+j;points.push(new THREE.Vector3().fromBufferAttribute(attr,k).applyMatrix4(object.matrixWorld));}
        const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
        const light=.7+Math.max(0,normal.dot(new THREE.Vector3(-.4,.85,.4)))*.55;
        polygon(points,tint(mat,light),mat.opacity??1);
      }
    });
    ctx.fillStyle=scene.background?'#'+scene.background.getHexString():'#030912';ctx.fillRect(0,0,w,h);
    const sky=ctx.createRadialGradient(w*.5,h*.3,10,w*.5,h*.5,w*.7);sky.addColorStop(0,'#143244');sky.addColorStop(1,'#040a13');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    for(let i=0;i<90;i++){ctx.fillStyle=`rgba(195,224,238,${.15+(i%5)*.08})`;ctx.fillRect((i*163.2)%w,(i*83.3)%h,1,1);}
    items.sort((a,b)=>b.z-a.z);
    items.forEach(item=>{
      ctx.save();ctx.globalAlpha=item.opacity??1;
      if(item.kind==='poly'||item.kind==='line'){
        ctx.beginPath();item.p.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
        if(item.kind==='poly'){ctx.closePath();ctx.fillStyle=item.color;ctx.fill();}else{ctx.strokeStyle=item.color;ctx.lineWidth=item.width;ctx.stroke();}
      }else if(item.kind==='panel'){
        const image=item.image;ctx.setTransform((item.b.x-item.a.x)/image.width,(item.b.y-item.a.y)/image.width,(item.c.x-item.a.x)/image.height,(item.c.y-item.a.y)/image.height,item.a.x,item.a.y);ctx.drawImage(image,0,0);
      }else if(item.kind==='image'){ctx.drawImage(item.image,item.x,item.y,item.w,item.h);}
      else if(item.kind==='globe')this.drawGlobe(item,camera);
      ctx.restore();
    });
  }
  drawGlobe(item,camera){
    const ctx=this.context,image=earthTexture.image;
    if(!this.mapPixels&&image?.complete){const map=this.mapCanvas.getContext('2d');map.drawImage(image,0,0,512,256);this.mapPixels=map.getImageData(0,0,512,256).data;}
    if(this.mapPixels&&(this.frames%3===0||!this.lastGlobe)){
      const n=160,out=this.globeCanvas.getContext('2d'),pixels=out.createImageData(n,n);
      const inverse=item.object.getWorldQuaternion(new THREE.Quaternion()).invert();
      const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),forward=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,2);
      for(let y=0;y<n;y++)for(let x=0;x<n;x++){
        const nx=(x/n-.5)*2,ny=(.5-y/n)*2,q=nx*nx+ny*ny;if(q>1)continue;
        const nz=Math.sqrt(1-q),p=right.clone().multiplyScalar(nx).addScaledVector(up,ny).addScaledVector(forward,nz).applyQuaternion(inverse);
        const u=((Math.atan2(-p.z,p.x)/(Math.PI*2)+1)%1),v=.5-Math.asin(p.y)/Math.PI;
        const source=(Math.min(255,Math.floor(v*256))*512+Math.floor(u*512))*4,dest=(y*n+x)*4,light=.3+.7*nz;
        pixels.data[dest]=this.mapPixels[source]*light;pixels.data[dest+1]=this.mapPixels[source+1]*light;pixels.data[dest+2]=this.mapPixels[source+2]*light;pixels.data[dest+3]=255;
      }
      out.putImageData(pixels,0,0);this.lastGlobe=1;
    }
    ctx.shadowColor='#60cce4';ctx.shadowBlur=18;ctx.fillStyle='#153c54';ctx.beginPath();ctx.arc(item.x,item.y,item.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    if(this.lastGlobe)ctx.drawImage(this.globeCanvas,item.x-item.r,item.y-item.r,item.r*2,item.r*2);
    ctx.strokeStyle='#72c7e680';ctx.lineWidth=1.5;ctx.stroke();
  }
}
function fit(renderer,camera,canvas) {
  const w=canvas.clientWidth,h=canvas.clientHeight;
  if(w<1||h<1)return;
  const size=new THREE.Vector2();renderer.getSize(size);
  if(size.x!==w||size.y!==h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
}
function onScreen(element) {const r=element.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&!document.hidden&&!document.querySelector('dialog[open]');}

function makeGlobe(parent,radius) {
  const group=new THREE.Group();parent.add(group);
  const globe=mesh(new THREE.SphereGeometry(radius,64,48),material(0xbdd9db,{map:earthTexture,roughness:.7,metalness:.12,emissive:0x193747,emissiveIntensity:.4}),group);
  const atmosphere=mesh(new THREE.SphereGeometry(radius*1.035,48,32),new THREE.ShaderMaterial({
    transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec3 vNormal; varying vec3 vPosition; void main(){vNormal=normalize(normalMatrix*normal); vec4 p=modelViewMatrix*vec4(position,1.);vPosition=p.xyz;gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 vNormal; varying vec3 vPosition; void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),3.);gl_FragColor=vec4(.15,.65,.85,rim*.75);}'
  }),group);
  globe.castShadow=false;atmosphere.castShadow=false;
  return group;
}

try {startPremiumWorld();} catch(error) {document.querySelector('#webglFallback').hidden=false; console.warn('Driving unavailable',error.message);}

const chapters=[
  {city:'London',country:'United Kingdom',lat:51.507,lon:-.128,title:'Where ambition<br><em>found a home.</em>',copy:'A base in London. A career in cybersecurity. A perspective that reaches beyond one city.',photo:'IMG_4317.webp',alt:'ZR. Saimun beside Tower Bridge in London',position:'60% 42%',color:0x6aaed4},
  {city:'Dubai',country:'United Arab Emirates',lat:25.204,lon:55.271,title:'A skyline.<br><em>A new perspective.</em>',copy:'Some places change the scale of your thinking. Others become a moment you keep.',photo:'IMG_8446.webp',alt:'ZR. Saimun by Dubai Marina',position:'62% 35%',color:0xd8aa69},
  {city:'Santorini',country:'Greece',lat:36.393,lon:25.461,title:'Between journeys,<br><em>a little stillness.</em>',copy:'White paths and Aegean blue. A pause in the route, captured in the personal archive.',photo:'8B256216-6194-4BDD-8748-49EA5D58ECEF.webp',alt:'ZR. Saimun walking down the steps in Santorini',position:'center 45%',color:0x6ed6e4},
  {city:'Sydney',country:'Australia',lat:-33.869,lon:151.209,title:'Crossing oceans.<br><em>Exchanging ideas.</em>',copy:'Conferences and conversations carried the professional journey beyond Europe, into another hemisphere.',photo:'IMG_8253.webp',alt:'ZR. Saimun in front of Sydney Opera House',position:'60% 45%',color:0xb5c9d8},
  {city:'Madinah',country:'Saudi Arabia',lat:24.468,lon:39.611,title:'A quieter chapter.<br><em>A deeper connection.</em>',copy:'A personal moment of reflection. The journey is also about what you carry within.',photo:'IMG_1804.webp',alt:'ZR. Saimun at Al-Masjid an-Nabawi in Medina',position:'62% 40%',color:0xe3be81}
];
const expedition=$('#expedition'),expeditionPhoto=$('#expeditionPhoto'),expeditionImage=$('#expeditionImage');
const titles=$('.expedition-titles'),chapterNav=$('#expeditionNavigation');
let currentChapter=-1,expeditionProgress=0;
chapters.forEach((chapter,index)=>{
  const button=document.createElement('button');button.type='button';button.textContent=String(index+1).padStart(2,'0');button.setAttribute('aria-label','Travel to '+chapter.city);
  button.addEventListener('click',()=>{const top=expedition.getBoundingClientRect().top+scrollY;const span=expedition.offsetHeight-innerHeight;scrollTo({top:top+span*(index+.55)/chapters.length,behavior:paused?'auto':'smooth'});});chapterNav.append(button);
  const preload=new Image();preload.src='./assets/photos/'+chapter.photo;
});

function readExpedition(){
  const rect=expedition.getBoundingClientRect();const span=Math.max(1,rect.height-innerHeight);
  expeditionProgress=clamp(-rect.top/span,0,1);
  const section=clamp(expeditionProgress*chapters.length,0,chapters.length-.0001),index=Math.floor(section),local=section-index;
  const chapter=chapters[index];
  if(index!==currentChapter){
    currentChapter=index;
    $('#expeditionIndex').textContent=String(index+1).padStart(2,'0')+' / '+chapter.city.toUpperCase();
    $('#expeditionTitle').innerHTML=chapter.title;$('#expeditionCopy').textContent=chapter.copy;
    $('#expeditionCoordinates').textContent=`${Math.abs(chapter.lat).toFixed(4)}° ${chapter.lat<0?'S':'N'} / ${Math.abs(chapter.lon).toFixed(4)}° ${chapter.lon<0?'W':'E'}`;
    expeditionImage.src='./assets/photos/'+chapter.photo;expeditionImage.alt=chapter.alt;expeditionImage.style.objectPosition=chapter.position;
    [...chapterNav.children].forEach((button,i)=>button.setAttribute('aria-current',String(i===index)));
  }
  const reveal=paused?1:THREE.MathUtils.smoothstep(local,.16,.55);
  const exit=index===chapters.length-1?1:1-THREE.MathUtils.smoothstep(local,.86,1);
  expeditionPhoto.style.clipPath=`circle(${reveal*140}% at ${innerWidth<760?'58% 35%':'67% 46%'})`;
  expeditionPhoto.style.opacity=exit;
  expeditionImage.style.transform=innerWidth<760?'none':`scale(${paused?1:1.05-local*.05})`;
  if(rect.top<innerHeight&&rect.bottom>0)window.zrAudio?.setDestination(chapter.city,false);
  titles.style.opacity=paused?1:Math.min(1,local*8+.35)*Math.max(.18,exit);
  $('#expeditionProgress').style.transform=`scaleX(${expeditionProgress})`;
  return {index,local,chapter,reveal};
}
addEventListener('scroll',readExpedition,{passive:true});addEventListener('resize',readExpedition);readExpedition();

function startExpedition(){
  const canvas=$('#expeditionCanvas'),renderer=rendererFor(canvas);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x030912);
  const camera=new THREE.PerspectiveCamera(43,1,.1,180);camera.position.set(0,2,20);
  scene.add(new THREE.AmbientLight(0x84bdd7,2.2));const light=new THREE.DirectionalLight(0xe5f5ff,4);light.position.set(-9,8,14);scene.add(light);
  const globe=makeGlobe(scene,5);globe.position.set(3,0,0);
  const stars=starfield(scene,850,75);
  const longitudeLines=new THREE.Group();globe.add(longitudeLines);
  for(let i=0;i<12;i++){
    const r=ring(longitudeLines,5.035,.008,new THREE.MeshBasicMaterial({color:0x78c3de,transparent:true,opacity:.11}));r.rotation.set(0,i*Math.PI/12,0);
  }
  const flightGroup=new THREE.Group();globe.add(flightGroup);
  function geo(lat,lon,radius){const phi=(90-lat)*Math.PI/180,theta=(lon+180)*Math.PI/180;return new THREE.Vector3(-radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta));}
  const geoPoints=chapters.map(chapter=>geo(chapter.lat,chapter.lon,5.07));
  const routes=[];
  chapters.forEach((chapter,index)=>{
    const p=geoPoints[index];const marker=mesh(new THREE.SphereGeometry(.08,12,12),glowMaterial(0xe9d39d,2),flightGroup);marker.position.copy(p);
    const pulse=mesh(new THREE.RingGeometry(.13,.15,32),new THREE.MeshBasicMaterial({color:0xe9d39d,transparent:true,opacity:.85,side:THREE.DoubleSide}),flightGroup);pulse.position.copy(p);pulse.lookAt(p.clone().multiplyScalar(2));
    const end=geoPoints[(index+1)%geoPoints.length];const dots=[];
    for(let t=0;t<=1.001;t+=1/70){const v=p.clone().lerp(end,t).normalize().multiplyScalar(5.1+Math.sin(t*Math.PI)*1.5);dots.push(v);}
    const path=new THREE.CatmullRomCurve3(dots);const curve=mesh(new THREE.TubeGeometry(path,80,.014,5,false),new THREE.MeshBasicMaterial({color:0xe9cc8a,transparent:true,opacity:.7}),flightGroup);curve.castShadow=false;routes.push(path);
  });
  const aircraft=makePlane(flightGroup,.25);
  const targetQuaternion=new THREE.Quaternion();const zAxis=new THREE.Vector3(0,0,1),zero=new THREE.Vector3();
  let last=performance.now(),elapsed=0,lastRender=0;
  function animate(now){
    requestAnimationFrame(animate);const dt=Math.min(.04,(now-last)/1000);last=now;
    if(!onScreen(canvas))return;
    if(paused&&now-lastRender<140)return;lastRender=now;fit(renderer,camera,canvas);
    const {index,local,chapter}=readExpedition();if(!paused)elapsed+=dt;
    targetQuaternion.setFromUnitVectors(geoPoints[index].clone().normalize(),zAxis);
    globe.quaternion.slerp(targetQuaternion,paused?1:1-Math.exp(-dt*4));
    const mobile=innerWidth<760;
    const zoom=paused?0:THREE.MathUtils.smoothstep(local,0,.6);
    camera.position.lerp(new THREE.Vector3(mobile?1:0,mobile?2:1,lerp(mobile?23:20,10,zoom)),1-Math.exp(-dt*4));
    camera.lookAt(mobile?new THREE.Vector3(2,-.5,0):new THREE.Vector3(1.5,0,0));
    stars.rotation.y=elapsed*.008;
    const path=routes[index],t=paused?.5:(elapsed*.12)%1;aircraft.position.copy(path.getPoint(t));aircraft.lookAt(path.getPoint(Math.min(.999,t+.01)));aircraft.rotateY(Math.PI);
    light.color.lerp(new THREE.Color(chapter.color),dt*3);
    renderer.render(scene,camera);
  }
  requestAnimationFrame(animate);
}
try{startExpedition();}catch(error){expeditionPhoto.style.clipPath='none';console.error('Expedition map could not start:',error);}

/* Distinct movement systems for the remaining biography. */
const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}}),{threshold:.12});
$$('.experience-card,.research__heading,.identity__copy,.conferences__intro,.memories__heading,.paper').forEach((element,index)=>{element.classList.add('cinematic-reveal');element.style.transitionDelay=`${index%3*.09}s`;revealObserver.observe(element);});
$$('.image-reveal').forEach(element=>revealObserver.observe(element));
const portrait=$('.portrait-chapter'),portraitFrame=$('.portrait-chapter .hero__portrait');
function portraitReveal(){if(paused)return;const rect=portrait.getBoundingClientRect();const p=clamp((innerHeight-rect.top)/(innerHeight+rect.height),0,1);portraitFrame.style.transform=`translateY(${(p-.5)*-65}px) rotate(${(p-.5)*-4}deg) scale(${.88+p*.18})`;}
addEventListener('scroll',portraitReveal,{passive:true});portraitReveal();

const deck=$('#conferenceDeck');deck.tabIndex=0;deck.setAttribute('aria-label','Conference archive. Swipe or use arrow keys to explore.');
let deckInteracting=false,lastDeck=performance.now(),deckDirection=1;
['pointerenter','focusin','pointerdown'].forEach(event=>deck.addEventListener(event,()=>deckInteracting=true));
['pointerleave','focusout'].forEach(event=>deck.addEventListener(event,()=>deckInteracting=false));
deck.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();deck.scrollBy({left:event.key==='ArrowRight'?350:-350,behavior:paused?'auto':'smooth'});}});
function moveDeck(now){requestAnimationFrame(moveDeck);const dt=Math.min(.04,(now-lastDeck)/1000);lastDeck=now;if(paused||deckInteracting||!onScreen(deck)||innerWidth<760)return;deck.scrollLeft+=dt*18*deckDirection;if(deck.scrollLeft>=deck.scrollWidth-deck.clientWidth-1)deckDirection=-1;if(deck.scrollLeft<=0)deckDirection=1;}
requestAnimationFrame(moveDeck);

/* The photo archive bends gently as the film is moved. */
const film=$('#film');let lastFilm=0,filmTilt=0;
film.addEventListener('scroll',()=>{if(paused)return;const velocity=film.scrollLeft-lastFilm;lastFilm=film.scrollLeft;filmTilt=clamp(velocity*.065,-3,3);$$('.memory').forEach((card,index)=>{card.style.transform=`perspective(900px) rotateY(${filmTilt*(index%2?1:-1)}deg) rotateZ(${filmTilt*.15}deg)`;});clearTimeout(film._settle);film._settle=setTimeout(()=>$$('.memory').forEach(card=>card.style.transform=''),180);},{passive:true});
