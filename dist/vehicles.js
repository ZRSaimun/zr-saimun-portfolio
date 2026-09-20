import * as THREE from 'three';
const mat=(color,metalness=.5,roughness=.3)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
function part(parent,geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const box=(p,w,h,d,m,x=0,y=0,z=0)=>part(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
function sculpt(parent,sections,material){
 const v=[],idx=[];for(const [z,w,b,t] of sections)v.push(-w,b,z,w,b,z,w*.94,t,z,-w*.94,t,z);
 for(let j=0;j<sections.length-1;j++)for(let k=0;k<4;k++){const a=j*4+k,b=j*4+(k+1)%4,c=b+4,d=a+4;idx.push(a,b,d,b,c,d);}
 idx.push(0,3,2,0,2,1);let e=(sections.length-1)*4;idx.push(e,e+1,e+2,e,e+2,e+3);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return part(parent,g,material);
}
export function makeCar(parent){
 const car=new THREE.Group();parent.add(car);
 const paint=new THREE.MeshPhysicalMaterial({color:0x365b52,metalness:.8,roughness:.24,clearcoat:1,clearcoatRoughness:.16});
 const chrome=mat(0xc7d7d5,.95,.17),rubber=mat(0x101417,.05,.8),glass=mat(0x132c37,.72,.13),red=mat(0xb8102a);
 sculpt(car,[[-2.45,.66,.47,.73],[-2.13,.98,.4,.94],[-1.35,1.02,.44,1.02],[.1,.99,.44,1.03],[1.7,1.04,.44,1.05],[2.28,.88,.51,.91]],paint);
 sculpt(car,[[-.78,.75,.99,1.07],[-.17,.72,1.04,1.57],[.92,.7,1.04,1.6],[1.64,.76,1,1.08]],glass);
 sculpt(car,[[-.18,.73,1.55,1.62],[.88,.72,1.57,1.65],[1.12,.66,1.42,1.5]],paint);
 box(car,1.25,.24,.065,rubber,0,.66,-2.43);
 for(let i=0;i<6;i++)box(car,1.22-i*.065,.017,.075,chrome,0,.56+i*.041,-2.46);
 const lamps=new THREE.MeshStandardMaterial({color:0xe4f5ff,emissive:0xc9e9ff,emissiveIntensity:3});
 const brakes=new THREE.MeshStandardMaterial({color:0xc82438,emissive:0xee1738,emissiveIntensity:.6});
 for(const x of [-.75,.75]){box(car,.34,.055,.07,lamps,x,.92,-2.14);box(car,.42,.045,.07,brakes,x,.91,2.25);box(car,.18,.04,.3,chrome,x*1.31,.63,.1);box(car,.21,.13,.3,paint,x*1.35,1.22,-.25);}
 for(const x of [-.995,.995]){box(car,.035,.04,2.2,chrome,x,.58,.08);box(car,.02,.04,.2,chrome,x,1.06,.35);box(car,.04,.25,.022,paint,x*.71,1.35,.51);}
 const wheels=[],front=[];
 for(const x of [-1,1])for(const z of [-1.42,1.48]){
  const pivot=new THREE.Group();pivot.position.set(x,.48,z);car.add(pivot);if(z<0)front.push(pivot);
  const wheel=new THREE.Group();pivot.add(wheel);wheels.push(wheel);
  const tyre=part(wheel,new THREE.CylinderGeometry(.47,.47,.34,32),rubber);tyre.rotation.z=Math.PI/2;
  const hub=part(wheel,new THREE.CylinderGeometry(.32,.32,.35,24),chrome);hub.rotation.z=Math.PI/2;
  const disc=part(wheel,new THREE.CylinderGeometry(.26,.26,.365,24),rubber);disc.rotation.z=Math.PI/2;
  for(let j=0;j<10;j++){const a=j/10*Math.PI*2;const spoke=box(wheel,.38,.026,.27,chrome,0,Math.sin(a)*.16,Math.cos(a)*.16);spoke.rotation.x=-a;}
  box(pivot,.37,.2,.1,red,0,.12,.21);
 }
 const damage=new THREE.Group();car.add(damage);damage.visible=false;
 for(let i=0;i<9;i++){const s=box(damage,.016,.012,.27+(i%3)*.13,chrome,i%2?1.025:-1.025,.69+i*.022,-.45+i*.11);s.rotation.x=.25;}
 const dent=box(damage,.23,.14,.1,mat(0x172d29),.6,.79,-2.23);dent.rotation.z=.3;
 const beam=new THREE.SpotLight(0xe4f1ff,35,26,.55,.6,1.5);beam.position.set(0,1,-1.8);beam.target.position.set(0,0,-15);car.add(beam,beam.target);
 return {car,wheels,front,brakes,damage,paint};
}
export function makePlane(parent,scale=.6){
 const plane=new THREE.Group();plane.scale.setScalar(scale);parent.add(plane);
 const white=new THREE.MeshPhysicalMaterial({color:0xf0eee7,metalness:.55,roughness:.21,clearcoat:1}),red=mat(0xb21930,.65,.25),glass=mat(0x162c3c,.8,.12);
 const fuselage=part(plane,new THREE.CapsuleGeometry(.25,3.3,8,20),white);fuselage.rotation.x=Math.PI/2;
 const nose=part(plane,new THREE.SphereGeometry(.26,20,12),glass,0,.06,-1.52);nose.scale.set(.88,.6,1.3);
 function wing(points,m,y=0){const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const w=part(plane,new THREE.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:1,steps:1}),m);w.rotation.x=Math.PI/2;w.position.y=y;return w;}
 wing([[-.2,-.4],[-2.5,1.05],[-2.5,1.42],[-.2,.7],[.2,.7],[2.5,1.42],[2.5,1.05],[.2,-.4]],white);
 wing([[-.15,1.25],[-1,1.95],[-1,2.13],[1,2.13],[1,1.95],[.15,1.25]],red,.23);
 const fin=box(plane,.06,.7,.68,red,0,.42,1.57);fin.rotation.x=-.28;
 for(const x of [-.55,.55]){const engine=part(plane,new THREE.CylinderGeometry(.21,.18,.8,20),white,x,.12,1.1);engine.rotation.x=Math.PI/2;const opening=part(plane,new THREE.CylinderGeometry(.155,.155,.025,16),glass,x,.12,.69);opening.rotation.x=Math.PI/2;}
 for(const x of [-.245,.245])for(let z=-.9;z<1;z+=.32){const win=part(plane,new THREE.SphereGeometry(.061,8,8),glass,x,.085,z);win.scale.set(.12,1,1.3);}
 for(const x of [-.253,.253])box(plane,.02,.045,2.8,red,x,-.015,0);
 return plane;
}

export function makeHelicopter(parent,scale=.65){
 const heli=new THREE.Group();heli.scale.setScalar(scale);parent.add(heli);
 const paint=new THREE.MeshPhysicalMaterial({color:0x263a43,metalness:.72,roughness:.27,clearcoat:.65,clearcoatRoughness:.18});
 const glass=new THREE.MeshPhysicalMaterial({color:0x102733,metalness:.22,roughness:.08,transparent:true,opacity:.82,clearcoat:1});
 const trim=mat(0xd4b878,.72,.25),dark=mat(0x12191d,.35,.62),lamp=new THREE.MeshStandardMaterial({color:0xe8f4f2,emissive:0xb9ffff,emissiveIntensity:3});
 const body=part(heli,new THREE.SphereGeometry(.72,28,18),paint,0,.1,0);body.scale.set(1.05,.7,1.65);
 const cockpit=part(heli,new THREE.SphereGeometry(.58,28,18),glass,0,.19,-.58);cockpit.scale.set(.9,.68,1.1);
 const tail=box(heli,.16,.18,3.45,paint,0,.22,1.8);tail.rotation.x=-.075;
 const fin=box(heli,.08,.82,.72,paint,0,.68,3.2);fin.rotation.x=-.28;
 const tailRotor=new THREE.Group();tailRotor.position.set(.03,.42,3.28);heli.add(tailRotor);for(let i=0;i<4;i++){const blade=box(tailRotor,.055,.82,.028,dark,0,0,0);blade.rotation.z=i*Math.PI/2;} 
 const mast=box(heli,.13,.72,.13,dark,0,.9,.05);const rotor=new THREE.Group();rotor.position.set(0,1.28,.05);heli.add(rotor);for(let i=0;i<4;i++){const blade=box(rotor,.095,.025,4.7,dark,0,0,0);blade.rotation.y=i*Math.PI/2+.12;}
 for(const x of [-.63,.63]){const skid=box(heli,.08,.08,2.1,dark,x,-.55,.25);const strut=box(heli,.055,.72,.055,dark,x,-.21,.1);strut.rotation.z=x*.55;}
 for(const x of [-.56,.56])box(heli,.2,.09,.08,lamp,x,.04,-1.05);
 const beacon=part(heli,new THREE.SphereGeometry(.055,12,8),new THREE.MeshStandardMaterial({color:0xc42c35,emissive:0xd31425,emissiveIntensity:3}),0,1.03,.85);
 return {heli,rotor,tailRotor,beacon};
}
