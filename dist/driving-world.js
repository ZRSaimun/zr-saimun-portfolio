import * as THREE from 'three';
import {makeCar,makePlane} from './vehicles.js';
import {destinations,announceDestination} from './destinations.js';
import {journeyAudio} from './soundscape.js';
import {attachWeather} from './weather.js';

const $=s=>document.querySelector(s),clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
export function startPremiumWorld(){
 const canvas=$('#driveCanvas'),home=$('#home');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.5:2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),sky=new THREE.Color(0x172d3b);scene.background=sky;scene.fog=new THREE.FogExp2(sky,.006);
 const camera=new THREE.PerspectiveCamera(48,1,.1,450);camera.position.set(48,66,92);
 const ambient=new THREE.HemisphereLight(0xc8e6ef,0x28352d,2.8);scene.add(ambient);const sun=new THREE.DirectionalLight(0xffe9c3,3);sun.position.set(-25,65,-35);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,far:180});sun.shadow.normalBias=.08;scene.add(sun);
 const material=(color,roughness=.7,metalness=.05)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 function add(g,m,x=0,y=0,z=0,parent=scene){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const groundMat=material(0x627367),roadMat=material(0x243238,.37,.12),mountainMat=material(0x455b52),trunkMat=material(0x57483b),treeMat=material(0x385c4e);
 const ground=add(new THREE.CircleGeometry(170,96),groundMat,0,-.13,0);ground.rotation.x=-Math.PI/2;
 const road=add(new THREE.RingGeometry(52,63,160),roadMat,0,0,0);road.rotation.x=-Math.PI/2;
 const gold=material(0xd0bc8d,.45,.4),white=material(0xc2cec7);
 for(let i=0;i<100;i++){const a=i/100*Math.PI*2,o=add(new THREE.BoxGeometry(.1,.025,1.5),white,Math.sin(a)*57.5,.03,Math.cos(a)*57.5);o.rotation.y=a;}
 const water=new THREE.Group();scene.add(water);
 for(let j=0;j<5;j++){const o=add(new THREE.RingGeometry(143+j*4,145+j*4,100),new THREE.MeshStandardMaterial({color:0x35898f,roughness:.19,metalness:.5,transparent:true,opacity:.6}),0,-.05,0,water);o.rotation.x=-Math.PI/2;}
 const terrain=new THREE.Group();scene.add(terrain);
 for(let i=0;i<30;i++){const a=i*2.39996,r=105+(i%4)*12,h=12+(i*7%22);const hill=add(new THREE.ConeGeometry(12+(i%5),h,6),mountainMat,Math.sin(a)*r,h/2-2,Math.cos(a)*r,terrain);hill.rotation.y=a;}
 for(let i=0;i<96;i++){const a=i*2.39996,r=80+(i%7)*3;const g=new THREE.Group(),scale=.72+(i%5)*.12;g.position.set(Math.sin(a)*r,0,Math.cos(a)*r);g.scale.setScalar(scale);terrain.add(g);add(new THREE.CylinderGeometry(.12,.23,2.7,8),trunkMat,0,1.25,0,g);for(let layer=0;layer<3;layer++)add(new THREE.ConeGeometry(1.85-layer*.32,2.7,9),treeMat,0,2.7+layer*1.15,0,g);}
 const guard=material(0x9da9a8,.65,.3),lampMetal=material(0x2a363a,.8,.28),lampGlow=new THREE.MeshStandardMaterial({color:0xffe3ad,emissive:0xffbc68,emissiveIntensity:2.4});
 for(let i=0;i<40;i++){const a=i/40*Math.PI*2,r=64;const post=add(new THREE.CylinderGeometry(.055,.055,.72,6),guard,Math.sin(a)*r,.34,Math.cos(a)*r);post.rotation.y=a;const rail=add(new THREE.BoxGeometry(1.2,.07,.08),guard,Math.sin(a)*r,.62,Math.cos(a)*r);rail.rotation.y=-a;}
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=49;const pole=add(new THREE.CylinderGeometry(.08,.11,5.6,8),lampMetal,Math.sin(a)*r,2.8,Math.cos(a)*r);const head=add(new THREE.SphereGeometry(.22,12,8),lampGlow,Math.sin(a)*r,5.6,Math.cos(a)*r);const light=new THREE.PointLight(0xffc476,.45,16,2);light.position.copy(head.position);scene.add(light);}
 // Photographic Earth remains visible; the water layer animates only where the map contains ocean.
 const earthTexture=new THREE.TextureLoader().load('./assets/earth-atmosphere.jpg');earthTexture.colorSpace=THREE.SRGBColorSpace;
 const globe=add(new THREE.SphereGeometry(10,96,72),new THREE.MeshStandardMaterial({map:earthTexture,roughness:.52,metalness:.08}),0,15,0);
 const tidalMaterial=new THREE.ShaderMaterial({
  uniforms:{time:{value:0},earthMap:{value:earthTexture}},
  transparent:true,depthWrite:false,
  vertexShader:`uniform float time;varying vec2 uvMap;varying vec3 surface;varying vec3 normalView;varying float crest;void main(){vec3 n=normalize(position),moon=normalize(vec3(.25*sin(time*.18),1.,.18*cos(time*.18)));float a=dot(n,moon),bulge=.12*pow(max(a,0.),12.)+.035*pow(max(-a,0.),8.);float ripples=sin(n.x*35.+time*1.5+sin(n.z*19.-time))*.008+sin(n.y*53.-time*1.6+n.z*23.)*.005;vec3 p=n*(10.04+bulge+ripples);uvMap=uv;crest=bulge;surface=(modelViewMatrix*vec4(p,1.)).xyz;normalView=normalize(normalMatrix*n);gl_Position=projectionMatrix*vec4(surface,1.);}`,
  fragmentShader:`uniform sampler2D earthMap;uniform float time;varying vec2 uvMap;varying vec3 surface;varying vec3 normalView;varying float crest;void main(){vec3 map=texture2D(earthMap,uvMap).rgb;float ocean=smoothstep(-.02,.12,map.b-map.r);vec3 v=normalize(-surface),l=normalize(vec3(-.5,.8,1.));float fres=pow(1.-max(dot(normalize(normalView),v),0.),4.);float current=.5+.5*sin(uvMap.y*160.+uvMap.x*90.+time*1.7)+.25*sin(uvMap.x*260.-time*1.2);float foam=smoothstep(.055,.12,crest)*pow(current,8.);vec3 water=mix(vec3(.005,.07,.12),vec3(.03,.42,.55),current*.52);water+=vec3(.32,.82,.86)*fres*.75;water=mix(water,vec3(.78,.9,.88),foam);gl_FragColor=vec4(water,ocean*(.18+fres*.45+foam*.55));}`
 });
 const tideWater=add(new THREE.SphereGeometry(10.12,128,96),tidalMaterial,0,15,0);
 add(new THREE.CylinderGeometry(8,11,3,48),material(0x304a4d),0,1.4,0);
 const orbit=add(new THREE.TorusGeometry(13,.055,6,100),gold,0,15,0);orbit.rotation.x=1.1;
 const aircraft=makePlane(scene,1.3);
 const rig=makeCar(scene);rig.car.position.set(0,.06,57.5);
 const loader=new THREE.TextureLoader();const gates=[];
 function plaque(d){const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#10242b';ctx.fillRect(0,0,512,192);ctx.fillStyle='#e5cc94';ctx.font='500 46px sans-serif';ctx.fillText(d.city,24,81);ctx.fillStyle='#d3e3e3';ctx.font='23px sans-serif';ctx.fillText(d.country,24,126);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;return tx;}
 destinations.forEach((d,i)=>{const a=i/destinations.length*Math.PI*2;const group=new THREE.Group();group.position.set(Math.sin(a)*69,0,Math.cos(a)*69);group.rotation.y=a;scene.add(group);const pole=material(0x4b6365,.35,.65);for(const x of [-2,2])add(new THREE.CylinderGeometry(.075,.075,6.1,8),pole,x,3,0,group);const border=add(new THREE.BoxGeometry(4.3,4.8,.12),gold,0,3.5,0,group);const frame=new THREE.Group();group.add(frame);let photo=null;if(d.photos.length&&!d.sacred){const tx=loader.load(d.photos[0].src);tx.colorSpace=THREE.SRGBColorSpace;tx.anisotropy=4;photo=add(new THREE.PlaneGeometry(3.95,4.45),new THREE.MeshBasicMaterial({map:tx,side:THREE.DoubleSide}),0,3.5,-.09,frame);photo.rotation.y=Math.PI;}else{photo=add(new THREE.PlaneGeometry(3.95,4.45),material(d.sacred?0x576b59:0x1a3c4e),0,3.5,-.09,frame);photo.rotation.y=Math.PI;}
 const label=add(new THREE.PlaneGeometry(6,2.25),new THREE.MeshBasicMaterial({map:plaque(d),side:THREE.DoubleSide}),0,7.4,-.12,group);label.rotation.y=Math.PI;
 const glass=add(new THREE.PlaneGeometry(4,4.5),new THREE.MeshPhysicalMaterial({color:0xc5ecf2,metalness:.1,roughness:.08,transparent:true,opacity:.13,side:THREE.DoubleSide}),0,3.5,-.15,frame);
 const portal=new THREE.Group();group.add(portal);
 const portalGlow=new THREE.Mesh(new THREE.TorusGeometry(2.75,.07,10,64),new THREE.MeshBasicMaterial({color:0xe7c27a,transparent:true,opacity:.28,depthWrite:false}));
 portalGlow.position.set(0,3.5,.18);portalGlow.rotation.x=Math.PI/2;portal.add(portalGlow);
 const portalLight=new THREE.PointLight(0xe7c27a,.4,9,2);portalLight.position.set(0,3.5,1);portal.add(portalLight);
 gates.push({d,group,frame,glass,photo,border,portal,portalGlow,portalLight,broken:false,angle:a});});
 const selector=document.createElement('div');selector.className='drive-destination';selector.innerHTML='<label for="driveDestination">DRIVE TO A CHAPTER</label><select id="driveDestination"></select><label for="weatherMode">ATMOSPHERE · SIMULATED</label><select id="weatherMode"><option value="auto">Match destination</option><option value="snow">Deep snowfall</option><option value="rain">Rain</option><option value="desert">Desert wind</option><option value="warm">Warm daylight</option><option value="coast">Coastal breeze</option><option value="steppe">Mongolian steppe · environment only</option></select><button id="driveTravel">Travel to city →</button>';home.append(selector);destinations.forEach((d,i)=>$('#driveDestination').add(new Option(`${d.city} · ${d.country}`,i)));
 const status=document.createElement('div');status.className='drive-condition';status.innerHTML='<span id="driveWeather">LONDON / RAIN</span><span id="driveDamage">BODYWORK 100%</span>';home.append(status);
 $('#worldReset').textContent='Repair / reset';$('#driveJump').textContent='Brake';$('#driveJump').setAttribute('aria-label','Hold to brake');
 const full=document.createElement('button');full.id='driveFullscreen';full.textContent='Expand drive';$('.world-tools').append(full);full.onclick=()=>{home.classList.toggle('drive-expanded');full.textContent=home.classList.contains('drive-expanded')?'Exit drive':'Expand drive';document.body.classList.toggle('drive-expanded-open',home.classList.contains('drive-expanded'));};
 const inputs={up:false,down:false,left:false,right:false,boost:false,brake:false};let stickX=0,stickY=0,speed=0,heading=Math.PI/2,mode='tour',tourAngle=0,damage=0,shake=0,activeCity=destinations[0],nearest=-1,weather='rain',last=performance.now(),time=0,lastMix=0,lastImpact=-10;
 const destinationTheme=city=>{
  if(/Tromsø|Tromso|Oslo|Stockholm/.test(city))return {sky:0x6e8798,ground:0xb9c8ca,trees:0x9bb4b2,road:0x56636b,exposure:.88};
  if(/Dubai|Medina/.test(city))return {sky:0xc9a77a,ground:0xbf965e,trees:0x7a7253,road:0x5a4b3c,exposure:1.18};
  if(/Santorini|Corfu|Athens|Tenerife|Sydney/.test(city))return {sky:0x6dacc2,ground:0x728d72,trees:0x3d6d61,road:0x364448,exposure:1.15};
  if(/London|Paris|Madrid|Milan|Amsterdam|Geneva|Zürich|Zurich/.test(city))return {sky:0x6b8390,ground:0x627367,trees:0x405d50,road:0x273238,exposure:1.0};
  return {sky:0x709eae,ground:0x627367,trees:0x385c4e,road:0x253238,exposure:1.0};
 };
 function applyDestinationTheme(){const theme=destinationTheme(activeCity.city);renderer.toneMappingExposure=theme.exposure;if(weather!=='snow'&&weather!=='desert'){sky.set(theme.sky);scene.fog.color.copy(sky);groundMat.color.set(theme.ground);treeMat.color.set(theme.trees);roadMat.color.set(theme.road);}$('#driveWeather').textContent=`${activeCity.city.toUpperCase()} / ${weather.toUpperCase()}`;}
 const shards=[],shardGeometry=new THREE.BufferGeometry();shardGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.15,0,0,.15,0,0,0,.4,0],3));shardGeometry.computeVertexNormals();const shardMat=new THREE.MeshStandardMaterial({color:0xc8f0ef,metalness:.5,roughness:.1,side:THREE.DoubleSide,transparent:true,opacity:.8});
 const particleCount=innerWidth<760?500:1000,positions=new Float32Array(particleCount*3);for(let i=0;i<particleCount;i++){positions[i*3]=(Math.random()-.5)*130;positions[i*3+1]=Math.random()*45;positions[i*3+2]=(Math.random()-.5)*130;}
 const particleGeo=new THREE.BufferGeometry();particleGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));const particleMat=new THREE.PointsMaterial({color:0xd9e7ef,size:.17,transparent:true,opacity:.75,depthWrite:false});const particles=new THREE.Points(particleGeo,particleMat);scene.add(particles);
 function weatherChange(){weather=$('#weatherMode').value==='auto'?activeCity.weather:$('#weatherMode').value;journeyAudio.weatherOverride=weather==='steppe'?'warm':weather;journeyAudio.setDestination(activeCity.city,false);journeyAudio.mix();const snow=weather==='snow',rain=weather==='rain',desert=weather==='desert';groundMat.color.set(snow?0xe0e6e7:desert?0xc6a16b:weather==='steppe'?0x8e9860:0x627367);mountainMat.color.set(snow?0xc3d0d4:desert?0xa3815a:0x455b52);treeMat.color.set(snow?0xafc9c7:0x385c4e);terrain.visible=true;roadMat.roughness=rain?.15:.65;roadMat.color.set(snow?0x8f9ca1:0x253238);sky.set(snow?0x839cab:rain?0x263f52:desert?0xb1a08b:0x709eae);scene.fog.color.copy(sky);scene.fog.density=snow?.012:rain?.008:.004;particleMat.color.set(desert?0xe9cb90:0xe2f3fc);particleMat.size=snow?.24:rain?.085:.13;particleMat.opacity=snow?.9:rain?.65:desert?.35:.15;sun.intensity=rain?1.8:3.2;$('#driveWeather').textContent=`${activeCity.city.toUpperCase()} / ${weather==='steppe'?'STEPPE SCENE':weather.toUpperCase()}`;}
 const baseWeatherChange=weatherChange;
 function studioWeather(){
  const preset=window.zrWeatherPreset||($('#weatherMode').value==='auto'?activeCity.weather:$('#weatherMode').value);
  const snow=['light-snow','snow','blizzard','aurora'].includes(preset),rain=['rain','heavy-rain','storm'].includes(preset),desert=['desert','sandstorm'].includes(preset);
  baseWeatherChange();weather=snow?'snow':rain?'rain':desert?'desert':preset;
  journeyAudio.weatherOverride=snow?'snow':rain?'rain':desert?'desert':preset==='coast'?'coast':'clear';journeyAudio.mix();
  if(snow){groundMat.color.set(0xdce4e8);mountainMat.color.set(0xbacbd4);treeMat.color.set(0xbcd0cc);}
  const night=['night','aurora'].includes(preset);sky.set(night?0x071224:preset==='sunset'?0xaa735f:preset==='sunrise'?0xd1a984:snow?0x8196a5:rain?0x273b48:desert?0xb2a084:0x709eae);scene.fog.color.copy(sky);
  scene.fog.density=preset==='blizzard'?.035:preset==='fog'?.045:preset==='sandstorm'?.027:rain?.014:.006;
  sun.intensity=night?.25:preset==='storm'?1:3;ambient.intensity=night?.6:2.5;particleMat.size=snow?.25:rain?.1:.14;
  particleGeo.setDrawRange(0,Math.round(particleCount*(preset==='light-snow'?.25:1)*(window.zrSnowIntensity||.65)));
  applyDestinationTheme();$('#driveWeather').textContent=`${activeCity.city.toUpperCase()} / ${preset.toUpperCase()}`;
 }
 attachWeather(studioWeather);
 const quality=document.createElement('label');quality.innerHTML='GRAPHICS <select id="graphicsQuality"><option value="auto">Adaptive</option><option value="low">Low · battery saver</option><option value="high">High</option></select>';selector.append(quality);
 $('#graphicsQuality').onchange=e=>{const low=e.target.value==='low';renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,e.target.value==='high'?2:innerWidth<760?1.5:2));renderer.shadowMap.enabled=!low;particleGeo.setDrawRange(0,Math.round(particleCount*(low?.25:window.zrSnowIntensity||.65)));};
 function travel(i){const g=gates[i];if(!g)return;activeCity=g.d;tourAngle=g.angle;rig.car.position.set(Math.sin(g.angle)*57.5,.06,Math.cos(g.angle)*57.5);heading=g.angle-Math.PI/2;speed=0;$('#driveDestination').value=String(i);studioWeather();announceDestination(activeCity.city);}
 $('#driveTravel').onclick=()=>travel(Number($('#driveDestination').value));
 function setMode(v){mode=v;speed=0;tourAngle=Math.atan2(rig.car.position.x,rig.car.position.z);$('#driveMode').setAttribute('aria-pressed',String(v==='drive'));$('#tourMode').setAttribute('aria-pressed',String(v==='tour'));home.classList.toggle('is-driving',v==='drive');$('#joystick').classList.toggle('is-driving',v==='drive');$('#driveJump').classList.toggle('is-driving',v==='drive');$('#driveHint').textContent=v==='drive'?'WASD / arrows · Shift boost · Space brake · Enter city':'A guided tour · choose any city';}
 $('#driveMode').onclick=()=>setMode('drive');$('#tourMode').onclick=()=>setMode('tour');
 function enter(){if(nearest>=0){const gate=gates[nearest];speed=0;gate.portalGlow.material.opacity=.9;gate.portalLight.intensity=4;home.classList.add('is-arriving');setTimeout(()=>{window.zrOpenCity?.(gate.d.city);home.classList.remove('is-arriving');gate.portalGlow.material.opacity=.28;gate.portalLight.intensity=.4;},420);}}
 $('#enterChapter').onclick=enter;
 function repair(){damage=0;rig.damage.visible=false;rig.car.scale.set(1,1,1);$('#driveDamage').textContent='BODYWORK 100%';gates.forEach(g=>{g.broken=false;g.frame.visible=true;});for(const s of shards)scene.remove(s.mesh);shards.length=0;travel(Number($('#driveDestination').value));journeyAudio.play('repair',.4);}
 $('#worldReset').onclick=repair;
 const keys={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'boost',ShiftRight:'boost',Space:'brake'};
 const visible=()=>{const r=canvas.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&!document.hidden;};
 const blocked=()=>!!document.querySelector('dialog[open]')||document.body.classList.contains('pilot-open')||document.body.classList.contains('flight-active');
 addEventListener('keydown',e=>{if(e.code==='Escape'&&home.classList.contains('drive-expanded'))full.click();if(mode!=='drive'||!visible()||blocked()||e.target.closest('input,textarea,select,button,a'))return;if(keys[e.code]){inputs[keys[e.code]]=true;e.preventDefault();}if(e.code==='Enter')enter();if(e.code==='KeyR')repair();});addEventListener('keyup',e=>{if(keys[e.code])inputs[keys[e.code]]=false;});
 function clear(){Object.keys(inputs).forEach(k=>inputs[k]=false);stickX=stickY=0;}
 addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
 const stick=$('#joystick'),knob=$('#joystickKnob');function move(e){const r=stick.getBoundingClientRect(),cx=r.width/2,cy=r.height/2;let x=e.clientX-r.left-cx,y=e.clientY-r.top-cy;const len=Math.hypot(x,y),limit=r.width*.33;if(len>limit){x*=limit/len;y*=limit/len;}stickX=x/limit;stickY=-y/limit;knob.style.transform=`translate(${x}px,${y}px)`;}
 let held=false;stick.onpointerdown=e=>{held=true;stick.setPointerCapture(e.pointerId);move(e);e.preventDefault();};stick.onpointermove=e=>{if(held)move(e);};stick.onpointerup=stick.onpointercancel=()=>{held=false;stickX=stickY=0;knob.style.transform='';};const brake=$('#driveJump');brake.onpointerdown=e=>{inputs.brake=true;brake.setPointerCapture(e.pointerId);};brake.onpointerup=brake.onpointercancel=()=>inputs.brake=false;
 function impact(strength){if(time-lastImpact<.6||activeCity.sacred)return;lastImpact=time;damage=Math.min(70,damage+Math.max(3,strength*1.5));rig.damage.visible=true;shake=Math.min(.5,strength*.04);$('#driveDamage').textContent=`BODYWORK ${Math.round(100-damage)}%`;journeyAudio.play('collision',Math.min(.65,.15+strength*.035));}
 function shatter(g){g.broken=true;g.frame.visible=false;const center=new THREE.Vector3(0,3.5,0).applyMatrix4(g.group.matrixWorld);for(let i=0;i<28;i++){const m=new THREE.Mesh(shardGeometry,shardMat);m.position.copy(center).add(new THREE.Vector3((Math.random()-.5)*3,Math.random()*3-1.5,(Math.random()-.5)*.6));scene.add(m);shards.push({mesh:m,v:new THREE.Vector3((Math.random()-.5)*6,Math.random()*6,(Math.random()-.5)*6),life:4});}journeyAudio.play('glass-break',.55);}
 const target=new THREE.Vector3(),look=new THREE.Vector3(0,3,0);canvas.tabIndex=0;canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
 window.zrDrive={travel,setMode,repair,get state(){return {speed,damage,weather,city:activeCity.city,mode,broken:gates.filter(g=>g.broken).length,position:{x:rig.car.position.x,z:rig.car.position.z}};}};
 studioWeather();
 function frame(now){requestAnimationFrame(frame);const dt=Math.min(.035,(now-last)/1000);last=now;const on=visible(),stop=blocked()||window.zrMotionPaused||!on;
  if(now-lastMix>100){journeyAudio.setVehicle('world',{active:on&&!stop,speed,throttle:inputs.up||stickY,boost:inputs.boost,braking:inputs.brake||inputs.down});lastMix=now;}if(!on)return;
  const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  if(!stop){time+=dt;tidalMaterial.uniforms.time.value=time;globe.rotation.y+=dt*.045;tideWater.rotation.y=globe.rotation.y;orbit.rotation.z+=dt*.06;aircraft.position.set(Math.sin(time*.2)*15,16+Math.sin(time*.15)*4,Math.cos(time*.2)*15);aircraft.rotation.set(.1,time*.2+Math.PI/2,-.18);
   const throttle=(inputs.up?1:0)-(inputs.down?1:0)+stickY,steer=(inputs.left?1:0)-(inputs.right?1:0)-stickX;
   if(mode==='tour'){tourAngle+=dt*.025;rig.car.position.set(Math.sin(tourAngle)*57.5,.06,Math.cos(tourAngle)*57.5);heading=tourAngle-Math.PI/2;speed=3;}else{const friction=weather==='snow'?.994:.985;speed+=throttle*11*dt;speed*=Math.pow(inputs.brake?.8:throttle?friction:.96,dt*60);speed=clamp(speed,-8,inputs.boost?25:16);heading+=steer*dt*1.15*clamp(Math.abs(speed)/5,0,1)*Math.sign(speed||1);rig.car.position.x-=Math.sin(heading)*speed*dt;rig.car.position.z-=Math.cos(heading)*speed*dt;const r=Math.hypot(rig.car.position.x,rig.car.position.z);if(r>94||r<14){const bound=r>94?94:14;rig.car.position.x*=bound/Math.max(r,.1);rig.car.position.z*=bound/Math.max(r,.1);impact(Math.abs(speed));speed*=-.3;}}
   rig.car.rotation.set(Math.sin(time*12)*Math.abs(speed)*.0006,heading,-steer*Math.abs(speed)*.003);rig.wheels.forEach(w=>w.rotation.x-=speed*dt/.47);rig.front.forEach(w=>w.rotation.y=lerp(w.rotation.y,steer*.33,dt*6));rig.brakes.emissiveIntensity=inputs.brake||inputs.down?4:.6;
   let near=-1,min=15;gates.forEach((g,i)=>{const d=rig.car.position.distanceTo(g.group.position);const active=d<8;g.portalGlow.rotation.z+=dt*(active?1.7:.35);g.portalGlow.material.opacity=active?.5:.18;g.portalLight.intensity=active?1.1:.25;if(d<min){min=d;near=i;}if(mode==='drive'&&!g.broken&&!g.d.sacred&&d<2.7&&Math.abs(speed)>2){impact(Math.abs(speed));shatter(g);speed*=.45;}});
   if(near!==nearest){nearest=near;if(near>=0){activeCity=gates[near].d;$('#driveDestination').value=String(near);announceDestination(activeCity.city);$('#driveChapter').textContent=activeCity.country.toUpperCase();$('#drivePlace').textContent=activeCity.city;$('#enterChapter').hidden=false;}else{$('#driveChapter').textContent='THE OPEN ROAD';$('#drivePlace').textContent='Follow your curiosity.';$('#enterChapter').hidden=true;}}
   for(let i=shards.length-1;i>=0;i--){const s=shards[i];s.life-=dt;s.v.y-=9.8*dt;s.mesh.position.addScaledVector(s.v,dt);s.mesh.rotation.x+=dt*3;s.mesh.rotation.z+=dt*2;if(s.mesh.position.y<.1){s.mesh.position.y=.1;s.v.y=Math.abs(s.v.y)*.25;s.v.x*=.94;s.v.z*=.94;}if(s.life<=0){scene.remove(s.mesh);shards.splice(i,1);}}
   for(let i=0;i<particleCount;i++){const n=i*3;positions[n]+=dt*(weather==='snow'?1.5:weather==='desert'?7:.5);positions[n+1]-=dt*(weather==='rain'?30:weather==='snow'?3:.5);if(positions[n+1]<0)positions[n+1]=45;if(positions[n]>65)positions[n]=-65;}particleGeo.attributes.position.needsUpdate=true;particles.position.set(rig.car.position.x,0,rig.car.position.z);particles.visible=['snow','rain','desert'].includes(weather);
   water.children.forEach((o,i)=>{o.position.y=-.05+Math.sin(time*.9+i)*.12;o.material.opacity=.35+Math.sin(time+i)*.15;});
  }
  $('#driveSpeed').textContent=window.zrMotionPaused?'PAUSED':`${Math.round(Math.abs(speed)*3.6)} KM/H`;
  if(mode==='drive'){const back=new THREE.Vector3(Math.sin(heading)*12,7.2,Math.cos(heading)*12);target.copy(rig.car.position).add(back);look.lerp(rig.car.position.clone().add(new THREE.Vector3(-Math.sin(heading)*4,1,-Math.cos(heading)*4)),1-Math.exp(-dt*4));}else{target.set(Math.sin(time*.018+.6)*(innerWidth<760?135:112),innerWidth<760?115:83,Math.cos(time*.018+.6)*(innerWidth<760?135:112));look.lerp(new THREE.Vector3(0,6,0),dt*3);}
  camera.position.lerp(target,1-Math.exp(-dt*3));if(!window.zrMotionPaused&&shake>0){camera.position.x+=Math.sin(time*60)*shake;shake*=.88;}camera.lookAt(look);renderer.render(scene,camera);
 }
 requestAnimationFrame(frame);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#webglFallback').hidden=false;journeyAudio.setVehicle('world',{active:false});});
}
