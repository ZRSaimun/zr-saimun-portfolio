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

function makeCar(parent) {
  const car=new THREE.Group();parent.add(car);
  const bodyPaint=new THREE.MeshPhysicalMaterial({color:0x10242b,metalness:.85,roughness:.2,clearcoat:1,clearcoatRoughness:.15});
  box(car,1.5,.32,3.1,bodyPaint,0,.58,0);
  box(car,1.42,.28,2.95,bodyPaint,0,.84,0);
  box(car,1.38,.06,1.1,bodyPaint,0,1.02,-.9);
  box(car,1.12,.59,1.12,dark,0,1.24,.16);
  box(car,1.16,.07,1.25,bodyPaint,0,1.57,.14);
  for(const x of [-.72,.72])box(car,.04,.045,2.75,gold,x,.75,0);
  box(car,.8,.26,.04,gold,0,.73,-1.57);
  for(let x=-.35;x<=.35;x+=.07)box(car,.025,.22,.055,dark,x,.73,-1.6);
  for(const x of [-.52,.52])box(car,.31,.06,.05,glowMaterial(0xe4faff,3),x,.91,-1.51);
  const glass=material(0x72bcc9,{metalness:.65,roughness:.1,transparent:true,opacity:.78});
  box(car,1.04,.45,.045,glass,0,1.24,-.42);
  box(car,1.04,.45,.045,glass,0,1.24,.73);
  box(car,.03,.43,.9,glass,-.57,1.24,.16);box(car,.03,.43,.9,glass,.57,1.24,.16);
  box(car,1.25,.17,.12,dark,0,.49,-1.33);box(car,1.25,.17,.12,dark,0,.49,1.33);
  const wheels=[];
  for(const x of [-.73,.73])for(const z of [-.83,.86]){
    const wheel=mesh(new THREE.CylinderGeometry(.34,.34,.24,16),material(0x03080c),car,x,.42,z);wheel.rotation.z=Math.PI/2;wheels.push(wheel);
    const hub=mesh(new THREE.CylinderGeometry(.17,.17,.25,12),gold,car,x,.42,z);hub.rotation.z=Math.PI/2;
  }
  for(const x of [-.43,.43]){
    box(car,.28,.14,.04,glowMaterial(0xf9ecc0,3),x,.86,-1.24);
    box(car,.2,.1,.04,glowMaterial(0xf87352,2),x,.84,1.24);
  }
  const headlight=new THREE.SpotLight(0xd5e8d6,22,14,.5,.6,1);headlight.position.set(0,1,-.8);headlight.target.position.set(0,.1,-12);car.add(headlight,headlight.target);
  return {car,wheels};
}

function makePlane(parent,scale=.6) {
  const plane=new THREE.Group();plane.scale.setScalar(scale);parent.add(plane);
  const body=mesh(new THREE.CapsuleGeometry(.16,2,5,12),white,plane);body.rotation.x=Math.PI/2;
  box(plane,2.3,.045,.42,gold,0,0,.2);box(plane,.9,.04,.27,white,0,.03,.96);box(plane,.05,.4,.4,gold,0,.16,.93);
  return plane;
}

const stationInfo=[
  {name:'IDENTITY',sub:'London · Cybersecurity',title:'A security mind. A traveller’s eye.',url:'#identity',x:-23,z:-15,photo:'IMG_7367.webp',color:0xe8ca86},
  {name:'RESEARCH',sub:'Questions → Evidence',title:'Curiosity becomes evidence.',url:'#research',x:17,z:-22,photo:'IMG_8142.webp',color:0x87cde5},
  {name:'CONFERENCES',sub:'Ideas without borders',title:'A world of conversations.',url:'#conferences',x:28,z:7,photo:'IMG_8253.webp',color:0xe8ca86},
  {name:'MEMORIES',sub:'Places that became stories',title:'Not collected. Remembered.',url:'#memories',x:2,z:28,photo:'IMG_6316.webp',color:0x87cde5},
  {name:'CONNECT',sub:'Write the next chapter',title:'The journey doesn’t end here.',url:'#contact',x:-27,z:13,photo:'IMG_8446.webp',color:0xe8ca86}
];

function startDrivingWorld() {
  const canvas=$('#driveCanvas'),renderer=rendererFor(canvas,true);
  canvas.tabIndex=0;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x06101b);scene.fog=new THREE.FogExp2(0x06101b,.006);
  const camera=new THREE.PerspectiveCamera(45,1,.1,250);camera.position.set(42,41,50);
  scene.add(new THREE.HemisphereLight(0xb9e6ff,0x171923,2.6));
  const sun=new THREE.DirectionalLight(0xffe2b0,3.5);sun.position.set(-22,38,18);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,far:100});sun.shadow.normalBias=.12;scene.add(sun);
  const blueLight=new THREE.PointLight(0x65c8e5,90,60,1.5);blueLight.position.set(0,13,0);scene.add(blueLight);
  const stars=starfield(scene,650);
  const island=new THREE.Group();scene.add(island);
  mesh(new THREE.CylinderGeometry(39,41,2.5,64),material(0x182c38),island,0,-1.25,0);
  mesh(new THREE.CylinderGeometry(39.2,39.2,.16,64),dark,island,0,-.05,0);
  ring(island,39,.09,glowMaterial(0x365a71,.7),0,.01,0);
  ring(island,21.8,1.45,material(0x25333c),0,.04,0);
  ring(island,19.9,.045,glowMaterial(0xa7c3c3,.5),0,.08,0);
  ring(island,23.7,.045,glowMaterial(0xa7c3c3,.5),0,.08,0);
  for(let i=0;i<70;i++){
    const a=i/70*Math.PI*2;const dash=box(island,.09,.025,.5,gold,Math.sin(a)*21.8,.12,Math.cos(a)*21.8);dash.rotation.y=a;
  }
  const center=new THREE.Group();island.add(center);
  mesh(new THREE.CylinderGeometry(8.5,9.5,.6,64),material(0x243b4b),center,0,.15,0);
  for(const r of [6,7.5,9])ring(center,r,.025,cyan,0,.5,0);
  const globe=makeGlobe(center,5);globe.position.y=8;
  const orbital=ring(center,7.2,.035,gold,0,8,0);orbital.rotation.set(.4,.3,-.4);
  const orbital2=ring(center,6.4,.022,cyan,0,8,0);orbital2.rotation.set(1.3,.5,.4);
  mesh(new THREE.CylinderGeometry(.5,1.3,3.1,16),gold,center,0,1.9,0);
  const centerLabel=label('ZR. SAIMUN','CYBERSECURITY / RESEARCH / EXPLORATION',12);centerLabel.position.set(0,1.4,10);center.add(centerLabel);
  const plane=makePlane(center,.8);

  const stationGroups=[],clickables=[];
  stationInfo.forEach((info,index)=>{
    const group=new THREE.Group();group.position.set(info.x,0,info.z);group.rotation.y=Math.atan2(info.x,info.z);island.add(group);
    mesh(new THREE.CylinderGeometry(5.5,5.8,.5,40),material(0x1c3545),group,0,.1,0);
    const halo=ring(group,5.5,.055,glowMaterial(info.color,1),0,.41,0);
    const postMat=material(0x4b6673,{metalness:.8,roughness:.25});
    box(group,.15,6,.15,postMat,-2.6,3,0);box(group,.15,6,.15,postMat,2.6,3,0);
    box(group,5.35,.15,.15,gold,0,6,0);
    const photoTexture=textureLoader.load('./assets/photos/'+info.photo);photoTexture.colorSpace=THREE.SRGBColorSpace;
    const photo=mesh(new THREE.PlaneGeometry(4.7,5.2),new THREE.MeshBasicMaterial({map:photoTexture,side:THREE.DoubleSide}),group,0,3.2,.1);photo.userData.station=index;clickables.push(photo);
    const title=label(info.name,info.sub,7.6);title.position.set(0,7.1,0);group.add(title);
    const beacon=mesh(new THREE.CylinderGeometry(.55,.55,12,16,1,true),new THREE.MeshBasicMaterial({color:info.color,transparent:true,opacity:.065,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),group,0,6,-1.2);
    stationGroups.push({group,halo,beacon});
    const a=Math.atan2(info.x,info.z),r=Math.hypot(info.x,info.z);
    const approach=box(island,3,.04,r-22,material(0x25333c),Math.sin(a)*(22+(r-22)/2),.06,Math.cos(a)*(22+(r-22)/2));approach.rotation.y=a;
  });

  /* Architectural silhouettes and moving research satellites. */
  const towers=[];
  for(let i=0;i<38;i++){
    const angle=i*2.39996,rad=31+(i%4)*1.55;
    const x=Math.cos(angle)*rad,z=Math.sin(angle)*rad;
    if(stationInfo.some(p=>Math.hypot(p.x-x,p.z-z)<7))continue;
    const h=1.3+((i*7)%13)*.4;
    const tower=box(island,1.1,h,1.2,material(i%3===0?0x406272:0x243e4b),x,h/2,z);
    tower.rotation.y=angle;
    box(tower,.7,.045,.025,cyan,0,h*.28,.62);
    towers.push(tower);
  }
  const researchGroup=stationGroups[1].group;
  const atom=mesh(new THREE.IcosahedronGeometry(1.15,0),material(0x9cd8e4,{metalness:.85,roughness:.18}),researchGroup,4.2,3.2,0);
  const atomRing=ring(researchGroup,1.7,.025,cyan,4.2,3.2,0);atomRing.rotation.z=.8;
  const crates=[];
  for(let i=0;i<8;i++){
    const a=i*.67,r=17.7;
    const c=box(island,.75,.75,.75,i%2?gold:material(0x385668),Math.sin(a)*r,.4,Math.cos(a)*r);
    crates.push({mesh:c,origin:c.position.clone(),vx:0,vz:0});
  }
  const {car,wheels}=makeCar(island);car.position.set(0,0,21.8);
  const inputs={forward:false,back:false,left:false,right:false,boost:false};
  let mode='tour',speed=0,heading=Math.PI/2,jumpY=0,jumpSpeed=0,tourAngle=0,smoothSteer=0;
  let activeStation=-1,targetStation=-1,targetPosition=null,tourTime=0,clockTime=0;
  let lastTime=performance.now(),lastRender=0,cameraAngle=0;
  let joystickX=0,joystickY=0;
  const cameraTarget=new THREE.Vector3(0,2,0),desiredCamera=new THREE.Vector3();
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const trailPositions=new Float32Array(100*3);trailPositions.fill(-100);
  const trailGeometry=new THREE.BufferGeometry();trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));
  const trail=new THREE.Points(trailGeometry,new THREE.PointsMaterial({color:0xe2c787,size:.11,transparent:true,opacity:.5,depthWrite:false}));scene.add(trail);let trailHead=0;

  function setMode(value){
    mode=value;targetPosition=null;targetStation=-1;speed=0;
    if(value==='tour')tourAngle=Math.atan2(car.position.x,car.position.z);
    $('#driveMode').setAttribute('aria-pressed',String(value==='drive'));$('#tourMode').setAttribute('aria-pressed',String(value==='tour'));
    $('#home').classList.toggle('is-driving',value==='drive');
    $('#joystick').classList.toggle('is-driving',value==='drive');$('#driveJump').classList.toggle('is-driving',value==='drive');
    $('#driveHint').textContent=value==='drive'?(innerWidth<760?'Drag the joystick to explore':'WASD / arrows · Shift boost · Space jump · Enter chapter'):'A guided orbit through my world';
    if(value==='drive')canvas.focus({preventScroll:true});
  }
  function jump(){if(mode==='drive'&&jumpY<.01&&!paused)jumpSpeed=6;}
  function selectStation(index){
    if(paused){location.hash=stationInfo[index].url;return;}
    mode='tour';targetStation=index;const info=stationInfo[index];const factor=24/Math.hypot(info.x,info.z);targetPosition=new THREE.Vector3(info.x*factor,0,info.z*factor);
    $('#driveMode').setAttribute('aria-pressed','false');$('#tourMode').setAttribute('aria-pressed','true');
    $('#home').classList.remove('is-driving');$('#joystick').classList.remove('is-driving');$('#driveJump').classList.remove('is-driving');
    $('#driveHint').textContent='Travelling to '+info.name.toLowerCase();
  }
  function enterStation(){if(activeStation>=0)document.querySelector(stationInfo[activeStation].url)?.scrollIntoView({behavior:paused?'auto':'smooth'});}
  function reset(){car.position.set(0,0,21.8);heading=Math.PI/2;speed=0;jumpY=0;jumpSpeed=0;tourAngle=0;targetPosition=null;targetStation=-1;crates.forEach(c=>{c.mesh.position.copy(c.origin);c.vx=0;c.vz=0;});}
  $('#driveMode').addEventListener('click',()=>setMode('drive'));$('#tourMode').addEventListener('click',()=>setMode('tour'));
  $('#worldReset').addEventListener('click',reset);$('#driveJump').addEventListener('click',jump);$('#enterChapter').addEventListener('click',enterStation);
  $$('[data-station]').forEach(button=>button.addEventListener('click',()=>selectStation(Number(button.dataset.station))));
  const keys={ArrowUp:'forward',KeyW:'forward',ArrowDown:'back',KeyS:'back',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ShiftLeft:'boost',ShiftRight:'boost'};
  addEventListener('keydown',event=>{
    if(window.zrRoadTrip||document.querySelector('dialog[open]')||mode!=='drive'||!onScreen(canvas)||event.target.closest('input,textarea,button,a')||document.body.classList.contains('pilot-open'))return;
    if(keys[event.code]){event.preventDefault();inputs[keys[event.code]]=true;}
    if(event.code==='Space'){event.preventDefault();jump();}if(event.code==='Enter')enterStation();if(event.code==='KeyR')reset();
  });
  addEventListener('keyup',event=>{if(keys[event.code])inputs[keys[event.code]]=false;});
  addEventListener('blur',()=>Object.keys(inputs).forEach(key=>inputs[key]=false));
  const joystick=$('#joystick'),knob=$('#joystickKnob');
  let stickPointer=null;
  function updateStick(event){const rect=joystick.getBoundingClientRect();let x=event.clientX-rect.left-50,y=event.clientY-rect.top-50;const length=Math.hypot(x,y);if(length>34){x*=34/length;y*=34/length;}joystickX=x/34;joystickY=-y/34;knob.style.transform=`translate(${x}px,${y}px)`;}
  joystick.addEventListener('pointerdown',event=>{event.preventDefault();stickPointer=event.pointerId;joystick.setPointerCapture(event.pointerId);updateStick(event);});
  joystick.addEventListener('pointermove',event=>{if(event.pointerId===stickPointer)updateStick(event);});
  function releaseStick(){stickPointer=null;joystickX=0;joystickY=0;knob.style.transform='';}
  joystick.addEventListener('pointerup',releaseStick);joystick.addEventListener('pointercancel',releaseStick);
  let clickStart=null;
  canvas.addEventListener('pointerdown',event=>{clickStart={x:event.clientX,y:event.clientY};});
  canvas.addEventListener('pointerup',event=>{
    if(!clickStart||Math.hypot(event.clientX-clickStart.x,event.clientY-clickStart.y)>8)return;
    const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(clickables);if(hit.length){const info=stationInfo[hit[0].object.userData.station];window.zrOpenGallery?.(info.name,[{src:'./assets/photos/'+info.photo,caption:info.title,kind:'Personal photograph'}],info.sub);}
  });

  function animate(now){
    requestAnimationFrame(animate);
    const dt=Math.min(.035,(now-lastTime)/1000);lastTime=now;
    if(!onScreen(canvas))return;
    if(paused&&now-lastRender<160)return;
    lastRender=now;fit(renderer,camera,canvas);
    const moving=!paused;
    if(moving){clockTime+=dt;globe.rotation.y+=dt*.1;orbital.rotation.z+=dt*.035;orbital2.rotation.y-=dt*.04;stars.rotation.y+=dt*.002;}
    const planeAngle=clockTime*.22;plane.position.set(Math.cos(planeAngle)*7.3,8+Math.sin(planeAngle)*2.5,Math.sin(planeAngle)*6.8);plane.rotation.y=-planeAngle;plane.rotation.z=.25;
    atom.rotation.set(clockTime*.2,clockTime*.35,clockTime*.1);atom.position.y=3.2+Math.sin(clockTime)*.3;atomRing.rotation.y=clockTime*.3;
    if(moving){
      if(targetPosition){
        const dx=targetPosition.x-car.position.x,dz=targetPosition.z-car.position.z;const distance=Math.hypot(dx,dz);
        if(distance>.15){car.position.x+=dx*Math.min(1,dt*1.3);car.position.z+=dz*Math.min(1,dt*1.3);heading=Math.atan2(-dx,-dz);speed=Math.min(10,distance*1.3);}
        else speed=0;
      }else if(mode==='tour'){
        tourAngle+=dt*.075;tourTime+=dt;car.position.set(Math.sin(tourAngle)*21.8,0,Math.cos(tourAngle)*21.8);heading=tourAngle-Math.PI/2;speed=3.2;
      }else{
        const throttle=(inputs.forward?1:0)-(inputs.back?1:0)+joystickY;
        const steering=(inputs.left?1:0)-(inputs.right?1:0)-joystickX;
        speed+=throttle*12*dt;speed*=Math.pow(throttle? .993:.963,dt*60);speed=clamp(speed,inputs.boost?-12:-7,inputs.boost?21:12);
        smoothSteer=lerp(smoothSteer,steering,1-Math.exp(-dt*5));
        heading+=smoothSteer*dt*1.65*clamp(Math.abs(speed)/5,.12,1)*(speed>=0?1:-1);
        car.position.x-=Math.sin(heading)*speed*dt;car.position.z-=Math.cos(heading)*speed*dt;
        const distance=car.position.length();if(distance>37){car.position.x*=37/distance;car.position.z*=37/distance;speed*=-.35;}
        const centerDistance=Math.hypot(car.position.x,car.position.z);if(centerDistance<10&&jumpY<1){car.position.x*=10/Math.max(.01,centerDistance);car.position.z*=10/Math.max(.01,centerDistance);speed*=-.35;}
      }
      jumpSpeed-=16*dt;jumpY=Math.max(0,jumpY+jumpSpeed*dt);if(jumpY===0)jumpSpeed=0;
      car.position.y=jumpY;car.rotation.y=heading;car.rotation.z=lerp(car.rotation.z,((inputs.left?1:0)-(inputs.right?1:0)-joystickX)*Math.min(.08,Math.abs(speed)*.006),dt*6);
      wheels.forEach(wheel=>wheel.rotation.x-=speed*dt*2);
      if(Math.abs(speed)>1){trailPositions[trailHead*3]=car.position.x;trailPositions[trailHead*3+1]=.22;trailPositions[trailHead*3+2]=car.position.z;trailHead=(trailHead+1)%100;trailGeometry.attributes.position.needsUpdate=true;}
      crates.forEach(crate=>{
        const d=crate.mesh.position.clone().sub(car.position),distance=Math.hypot(d.x,d.z);
        if(distance<1.45&&jumpY<.8){crate.vx+=d.x/Math.max(distance,.1)*Math.abs(speed)*.6;crate.vz+=d.z/Math.max(distance,.1)*Math.abs(speed)*.6;speed*=.96;}
        crate.mesh.position.x+=crate.vx*dt;crate.mesh.position.z+=crate.vz*dt;crate.vx*=.92;crate.vz*=.92;crate.mesh.rotation.y+=(crate.vx+crate.vz)*dt*.2;
      });
    }
    let nearest=-1,nearestDistance=12;
    stationInfo.forEach((info,index)=>{const d=Math.hypot(info.x-car.position.x,info.z-car.position.z);if(d<nearestDistance){nearestDistance=d;nearest=index;}});
    if(nearest!==activeStation){
      activeStation=nearest;const info=stationInfo[nearest];$('#driveChapter').textContent=info?`${String(nearest+1).padStart(2,'0')} / ${info.name}`:'00 / THE CROSSROADS';
      $('#drivePlace').textContent=info?info.title:'Every route has a story.';$('#enterChapter').hidden=!info;
      $$('[data-station]').forEach((button,index)=>button.classList.toggle('is-active',index===nearest));
    }
    stationGroups.forEach(({halo,beacon},index)=>{halo.material.emissiveIntensity=index===nearest?2:1;beacon.material.opacity=index===nearest?.14:.045;});
    $('#driveSpeed').textContent=paused?'PAUSED':mode==='tour'?'AUTO':String(Math.round(Math.abs(speed)*4)).padStart(2,'0');
    if(mode==='drive'||targetPosition){
      const mobile=innerWidth<760;desiredCamera.set(car.position.x+(mobile?17:15),mobile?24:19,car.position.z+(mobile?23:19));
      cameraTarget.lerp(new THREE.Vector3(car.position.x,1,car.position.z),1-Math.exp(-dt*3));
    }else{
      if(moving)cameraAngle+=dt*.018;
      const mobile=innerWidth<760;const radius=mobile?77:65;
      desiredCamera.set(Math.sin(.65+cameraAngle)*radius,mobile?63:43,Math.cos(.65+cameraAngle)*radius);
      cameraTarget.lerp(new THREE.Vector3(0,mobile?3:2,0),1-Math.exp(-dt*2));
    }
    camera.position.lerp(desiredCamera,1-Math.exp(-dt*2));camera.lookAt(cameraTarget);
    renderer.render(scene,camera);
  }
  requestAnimationFrame(animate);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();$('#webglFallback').hidden=false;});
}

try {startDrivingWorld();} catch(error) {$('#webglFallback').hidden=false;console.error('World could not start:',error);}

/* A transparent driving layer carries the same grand tourer through every chapter. */
function startRoadTrip(){
 const controls=document.createElement('div');controls.className='road-controls';controls.innerHTML='<button id="roadToggle" aria-pressed="false">Drive the whole story</button><button data-road="up" aria-label="Drive up">↑</button><button data-road="down" aria-label="Drive down">↓</button><button data-road="left" aria-label="Steer left">←</button><button data-road="right" aria-label="Steer right">→</button><button data-road="stop">Photo stop</button><span>WASD / arrows</span>';document.body.append(controls);
 const canvas=document.createElement('canvas');canvas.className='road-canvas';canvas.hidden=true;canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});}catch{controls.remove();canvas.remove();return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x637583,3));const light=new THREE.DirectionalLight(0xffecd2,4);light.position.set(-3,8,4);scene.add(light);const camera=new THREE.PerspectiveCamera(35,1,.1,50);camera.position.set(0,9,6);camera.lookAt(0,0,0);const rig=makeCar(scene);rig.car.scale.setScalar(.8);
 let x=innerWidth*.7,y=innerHeight*.55,vx=0,vy=0,last=performance.now(),active=false;const keys={};const mapping={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
 function toggle(){active=!active;window.zrRoadTrip=active;canvas.hidden=!active;controls.classList.toggle('active',active);$('#roadToggle').textContent=active?'Park car':'Drive the whole story';$('#roadToggle').setAttribute('aria-pressed',String(active));vx=vy=0;Object.keys(keys).forEach(k=>keys[k]=false);}
 $('#roadToggle').onclick=toggle;
 function photoStop(){const cards=$$('.atlas-card,.memory');let closest=null,distance=Infinity;for(const c of cards){const r=c.getBoundingClientRect();if(r.top>innerHeight||r.bottom<0)continue;const d=Math.hypot(r.left+r.width/2-x,r.top+r.height/2-y);if(d<distance){distance=d;closest=c;}}if(closest)closest.click();else $('#atlas').scrollIntoView({behavior:paused?'auto':'smooth'});}
 controls.querySelectorAll('[data-road]').forEach(b=>{const key=b.dataset.road;if(key==='stop'){b.onclick=photoStop;return;}b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[key]=true;};b.onpointerup=b.onpointercancel=()=>keys[key]=false;});
 addEventListener('keydown',e=>{if(!active||document.querySelector('dialog[open]')||document.body.classList.contains('pilot-open')||e.target.closest('input,textarea'))return;if(mapping[e.code]){e.preventDefault();keys[mapping[e.code]]=true;}if(e.code==='Escape')toggle();if(e.code==='Enter'&&!e.target.closest('button,a'))photoStop();});addEventListener('keyup',e=>{if(mapping[e.code])keys[mapping[e.code]]=false;});addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
 function frame(now){requestAnimationFrame(frame);const dt=Math.min(.04,(now-last)/1000);last=now;if(!active)return;const blocked=document.hidden||document.querySelector('dialog[open]')||document.body.classList.contains('pilot-open')||paused;const tx=blocked?0:((keys.right?1:0)-(keys.left?1:0))*340,ty=blocked?0:((keys.down?1:0)-(keys.up?1:0))*340;vx=lerp(vx,tx,1-Math.exp(-dt*5));vy=lerp(vy,ty,1-Math.exp(-dt*5));x=clamp(x+vx*dt,45,innerWidth-45);y+=vy*dt;const top=innerHeight*.23,bottom=innerHeight*.73;if(y<top){window.scrollBy({top:y-top,behavior:'instant'});y=top;}if(y>bottom){window.scrollBy({top:y-bottom,behavior:'instant'});y=bottom;}if(Math.hypot(vx,vy)>5)rig.car.rotation.y=Math.atan2(-vx,-vy);rig.wheels.forEach(w=>w.rotation.x-=Math.hypot(vx,vy)*dt*.02);canvas.style.width='160px';canvas.style.height='160px';canvas.style.left=(x-80)+'px';canvas.style.top=(y-80)+'px';canvas.style.inset='auto';canvas.style.left=(x-80)+'px';canvas.style.top=(y-80)+'px';if(canvas.width!==160*renderer.getPixelRatio())renderer.setSize(160,160,false);renderer.render(scene,camera);}
 requestAnimationFrame(frame);
}
startRoadTrip();

const chapters=[
  {city:'London',country:'United Kingdom',lat:51.507,lon:-.128,title:'Where ambition<br><em>found a home.</em>',copy:'A base in London. A career in cybersecurity. A perspective that reaches beyond one city.',photo:'IMG_4317.webp',alt:'ZR. Saimun beside Tower Bridge in London',position:'60% 42%',color:0x6aaed4},
  {city:'Dubai',country:'United Arab Emirates',lat:25.204,lon:55.271,title:'A skyline.<br><em>A new perspective.</em>',copy:'Some places change the scale of your thinking. Others become a moment you keep.',photo:'IMG_8446.webp',alt:'ZR. Saimun by Dubai Marina',position:'62% 35%',color:0xd8aa69},
  {city:'Santorini',country:'Greece',lat:36.393,lon:25.461,title:'Between journeys,<br><em>a little stillness.</em>',copy:'White paths and Aegean blue. A pause in the route, captured in the personal archive.',photo:'8B256216-6194-4BDD-8748-49EA5D58ECEF.webp',alt:'ZR. Saimun walking down the steps in Santorini',position:'center 45%',color:0x6ed6e4},
  {city:'Sydney',country:'Australia',lat:-33.869,lon:151.209,title:'Crossing oceans.<br><em>Exchanging ideas.</em>',copy:'Conferences and conversations carried the professional journey beyond Europe, into another hemisphere.',photo:'IMG_8253.webp',alt:'ZR. Saimun in front of Sydney Opera House',position:'60% 45%',color:0xb5c9d8},
  {city:'Medina',country:'Saudi Arabia',lat:24.468,lon:39.611,title:'A quieter chapter.<br><em>A deeper connection.</em>',copy:'A personal moment of reflection. The journey is also about what you carry within.',photo:'IMG_1804.webp',alt:'ZR. Saimun at Al-Masjid an-Nabawi in Medina',position:'62% 40%',color:0xe3be81}
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
  expeditionImage.style.transform=`scale(${paused?1:1.15-local*.12}) translateY(${paused?0:(.5-local)*2}%)`;
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
