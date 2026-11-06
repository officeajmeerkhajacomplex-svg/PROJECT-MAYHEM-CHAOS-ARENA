import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const game = $('game');
const menu = $('menu'), hud = $('hud'), mobile = $('mobile'), pauseScreen = $('pause');
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fc9b2);
scene.fog = new THREE.FogExp2(0x7b9f82, 0.0095);
const camera = new THREE.PerspectiveCamera(74, innerWidth/innerHeight, .1, 180);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({antialias:!isTouch, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = !isTouch;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
game.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xd7f4df,0x34432d,1.75));
const sun = new THREE.DirectionalLight(0xffe5b7,3.1);
sun.position.set(-25,40,-10); sun.castShadow=!isTouch; sun.shadow.mapSize.set(1024,1024); scene.add(sun);

const mat=(color,roughness=1,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const mats={
 ground:mat(0x365b39), mud:mat(0x69553a), leaf:mat(0x276b3c), leaf2:mat(0x438b4c),
 bark:mat(0x543923), stone:mat(0x667467), metal:mat(0x27383a,.55,.7),
 robot:mat(0xb34b2d,.45,.45), glow:mat(0x68f4d3,.25,.2), gold:mat(0xf4b942,.4,.3)
};
// Lightweight, generated tileable surface maps: no network fetch or external asset dependency.
function makeSurfaceTexture(kind,size=256){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d');
 const palettes={
  ground:['#314d32','#536b3a','#776744','#263d2e'],
  dirt:['#5b452e','#82613b','#a17b4c','#443523'],
  bark:['#34251b','#60432a','#88603b','#201c17'],
  stone:['#555e51','#7c806e','#a0a08a','#3d4943'],
  water:['#0d5962','#168b91','#35a9a0','#0b3e50']
 };
 const colors=palettes[kind]||palettes.ground;
 ctx.fillStyle=colors[0];ctx.fillRect(0,0,size,size);
 for(let i=0;i<15000;i++){
  const x=Math.random()*size,y=Math.random()*size,r=Math.random()*(kind==='ground'?3.2:2.1);
  ctx.globalAlpha=.08+Math.random()*.23;ctx.fillStyle=colors[(Math.random()*colors.length)|0];
  if(kind==='bark'){ctx.fillRect(x,y,1+Math.random()*3,4+Math.random()*22);}
  else if(kind==='water'){ctx.fillRect(x,y,2+Math.random()*22,.5+Math.random()*1.5);}
  else{ctx.beginPath();ctx.ellipse(x,y,r,r*(.35+Math.random()),Math.random()*Math.PI,0,Math.PI*2);ctx.fill();}
 }
 if(kind==='ground'){
  for(let i=0;i<420;i++){ctx.globalAlpha=.28;ctx.fillStyle=Math.random()>.5?'#b5a16a':'#182c20';ctx.save();ctx.translate(Math.random()*size,Math.random()*size);ctx.rotate(Math.random()*3);ctx.fillRect(0,0,1+Math.random()*2,4+Math.random()*9);ctx.restore();}
 }
 ctx.globalAlpha=1;
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 return texture;
}
const surfaceMaps={
 ground:makeSurfaceTexture('ground'),dirt:makeSurfaceTexture('dirt'),bark:makeSurfaceTexture('bark'),
 stone:makeSurfaceTexture('stone'),water:makeSurfaceTexture('water')
};
surfaceMaps.ground.repeat.set(10,10);surfaceMaps.dirt.repeat.set(3,18);
surfaceMaps.bark.repeat.set(1,2);surfaceMaps.stone.repeat.set(2,2);surfaceMaps.water.repeat.set(2,12);
mats.ground.map=surfaceMaps.ground;mats.ground.color.set(0xffffff);mats.ground.needsUpdate=true;
mats.bark.map=surfaceMaps.bark;mats.bark.color.set(0xffffff);mats.bark.needsUpdate=true;
mats.stone.map=surfaceMaps.stone;mats.stone.color.set(0xffffff);mats.stone.needsUpdate=true;
mats.mud.map=surfaceMaps.dirt;mats.mud.color.set(0xffffff);mats.mud.needsUpdate=true;

function box(x,y,z,sx,sy,sz,material,cast=true){
 const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;scene.add(m);return m;
}
function tree(x,z,s=1){
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.22*s,.34*s,3.2*s,7),mats.bark);trunk.position.set(x,1.6*s,z);trunk.castShadow=true;scene.add(trunk);
 for(let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry((1.25-i*.12)*s,1),i%2?mats.leaf:mats.leaf2);crown.position.set(x+(i-1)*.36*s,3.0*s+i*.42*s,z+(i%2-.5)*.3*s);crown.castShadow=true;scene.add(crown);}
}
// JUNGLE RUSH — handcrafted procedural environment slice
const environment = new THREE.Group();
scene.add(environment);
const envClock = { time: 0 };
const envMaterials = {
  water: new THREE.MeshPhysicalMaterial({color:0xffffff,map:surfaceMaps.water,roughness:.16,metalness:.12,clearcoat:1,clearcoatRoughness:.08,transparent:true,opacity:.94,envMapIntensity:1.2}),
  waterFoam: new THREE.MeshBasicMaterial({color:0xb8fff0,transparent:true,opacity:.42}),
  leafDark: mat(0x164c2d,.92), leafBright:mat(0x3c9148,.86), leafLight:mat(0x72a94b,.8),
  fern:mat(0x287b43,.9), flowerA:mat(0xffc45c,.65), flowerB:mat(0xf27e75,.65),
  moss:mat(0x4f8650,.95), ruin:mat(0x777b63,.94), ruinDark:mat(0x454f42,.9),
  concrete:mat(0x66776a,.85), painted:mat(0x397d70,.6), glass:new THREE.MeshPhysicalMaterial({color:0x6ed9d2,roughness:.12,metalness:.12,transparent:true,opacity:.34}),
  lamp:new THREE.MeshStandardMaterial({color:0xffd98b,emissive:0xff9b35,emissiveIntensity:2.2}),
  waterfall:new THREE.MeshBasicMaterial({color:0x9be9e8,transparent:true,opacity:.58,side:THREE.DoubleSide}),
  firefly:new THREE.MeshBasicMaterial({color:0xbaff80})
};
function addMesh(geometry, material, x,y,z, parent=environment, cast=true, receive=true){
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=cast;mesh.receiveShadow=receive;parent.add(mesh);return mesh;
}
function addBox(x,y,z,sx,sy,sz,material,parent=environment,rotationY=0){
  const mesh=addMesh(new THREE.BoxGeometry(sx,sy,sz),material,x,y,z,parent);mesh.rotation.y=rotationY;return mesh;
}
function addRock(x,y,z,sx,sy,sz,material=mats.stone){
  const rock=addMesh(new THREE.IcosahedronGeometry(1,1),material,x,y,z);
  rock.scale.set(sx,sy,sz);rock.rotation.set(Math.random()*.4,Math.random()*Math.PI,Math.random()*.35);return rock;
}
function addTree(x,z,scale=1,variant=0){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);environment.add(g);
  const trunk=addMesh(new THREE.CylinderGeometry(.2,.42,4.7,8),mats.bark,0,2.25,0,g);
  trunk.rotation.z=(Math.random()-.5)*.12;
  // Buttress roots make the rainforest trunks feel rooted in the damp forest floor.
  for(let root=0;root<5;root++){const a=root*Math.PI*2/5;const buttress=addMesh(new THREE.ConeGeometry(.42,.95,5),mats.bark,Math.cos(a)*.48,.42,Math.sin(a)*.48,g);buttress.rotation.z=Math.cos(a)*.9;buttress.rotation.x=-Math.sin(a)*.9;}
  for(let b=0;b<4;b++){
    const branch=addMesh(new THREE.CylinderGeometry(.055,.13,1.65,6),mats.bark,(b%2?-.55:.55),3.1,(b-1.5)*.22,g);
    branch.rotation.z=(b%2?-.75:.75);branch.rotation.x=(b-1.5)*.12;
  }
  for(let c=0;c<7;c++){
    const a=c*Math.PI*2/7, r=.85+Math.random()*.45;
    const crown=addMesh(new THREE.IcosahedronGeometry(.95+Math.random()*.42,1),variant%2?envMaterials.leafDark:envMaterials.leafBright,
      Math.cos(a)*r,4.5+Math.random()*.8,Math.sin(a)*r,g);
    crown.scale.set(1.15,.72,1);crown.rotation.y=Math.random()*Math.PI;
    for(let leaf=0;leaf<3;leaf++){const blade=addMesh(new THREE.SphereGeometry(.42,7,5),leaf%2?envMaterials.leafLight:envMaterials.leafBright,Math.cos(a+leaf*.55)*(r+.42),4.8+Math.random()*.45,Math.sin(a+leaf*.55)*(r+.42),g,false);blade.scale.set(.22,.07,.82);blade.rotation.y=a+leaf*.55;blade.rotation.z=-.22;}
  }
  const mossPatch=addMesh(new THREE.SphereGeometry(.72,8,6),envMaterials.moss,0,.25,.18,g,false);
  mossPatch.scale.set(1,.22,.8);
  return g;
}
function addFern(x,z,scale=1,flower=false){
  const g=new THREE.Group();g.position.set(x,.02,z);g.scale.setScalar(scale);environment.add(g);
  for(let f=0;f<7;f++){
    const a=f*Math.PI*2/7;
    const stem=addMesh(new THREE.CylinderGeometry(.018,.035,1.05,5),envMaterials.fern,Math.cos(a)*.28,.48,Math.sin(a)*.28,g,false);
    stem.rotation.z=Math.cos(a)*.72;stem.rotation.x=Math.sin(a)*.72;
    const leaf=addMesh(new THREE.ConeGeometry(.18,.72,5),f%3===0?envMaterials.leafLight:envMaterials.fern,Math.cos(a)*.48,.73,Math.sin(a)*.48,g,false);
    leaf.rotation.z=Math.cos(a)*-.85;leaf.rotation.x=Math.sin(a)*.85;
  }
  if(flower){const bloom=addMesh(new THREE.SphereGeometry(.12,7,6),Math.random()>.5?envMaterials.flowerA:envMaterials.flowerB,0,.98,0,g,false);bloom.scale.set(1,.7,1);}
  return g;
}
function addRuinColumn(x,z,h=4){
  const g=new THREE.Group();g.position.set(x,0,z);environment.add(g);
  addMesh(new THREE.CylinderGeometry(.48,.62,h,8),envMaterials.ruin,0,h/2,0,g);
  addMesh(new THREE.CylinderGeometry(.68,.68,.28,8),envMaterials.ruinDark,0,.22,0,g);
  addMesh(new THREE.CylinderGeometry(.72,.72,.3,8),envMaterials.ruin,0,h-.12,0,g);
  addMesh(new THREE.BoxGeometry(.22,.55,.08),envMaterials.moss,.28,h*.55,.48,g,false).rotation.z=-.35;
  return g;
}
function addArch(x,z,width=8,height=5){
  const g=new THREE.Group();g.position.set(x,0,z);environment.add(g);
  for(const side of [-1,1]){
    addMesh(new THREE.BoxGeometry(1.1,height,1.25),envMaterials.ruin,side*width/2,height/2,0,g);
    addMesh(new THREE.BoxGeometry(1.5,.38,1.5),envMaterials.ruinDark,side*width/2,height-.18,0,g);
  }
  const lintel=addMesh(new THREE.BoxGeometry(width+1,.8,1.5),envMaterials.ruin,0,height-.25,0,g);
  lintel.rotation.z=.025;
  addMesh(new THREE.BoxGeometry(width*.48,.22,.08),envMaterials.moss,0,height-.68,.79,g,false);
  return g;
}
// A broad forest floor with layered terrain edges instead of visible arena walls.
const ground=addMesh(new THREE.PlaneGeometry(112,124),mats.ground,0,-.72,12);
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
const pathMaterial=mat(0xffffff,.98);pathMaterial.map=surfaceMaps.dirt;pathMaterial.map.repeat.set(2,16);pathMaterial.needsUpdate=true;
const path=addMesh(new THREE.PlaneGeometry(9,62),pathMaterial,0,-.695,10);path.rotation.x=-Math.PI/2;path.rotation.z=.035;
for(let i=0;i<22;i++){
  const side=i%2?1:-1, z=-30+i*4.4;
  addRock(side*(29+Math.random()*7),-.4,z,5+Math.random()*4,3+Math.random()*4,5+Math.random()*4, i%3?mats.stone:envMaterials.ruinDark);
}
// Winding river ribbon with shallow, visible banks.
const riverCurve=new THREE.CatmullRomCurve3([
  new THREE.Vector3(-48,0,27),new THREE.Vector3(-31,0,24),new THREE.Vector3(-16,0,27),
  new THREE.Vector3(0,0,22),new THREE.Vector3(17,0,25),new THREE.Vector3(33,0,19),new THREE.Vector3(48,0,22)
]);
const riverVertices=[],riverIndices=[],riverUvs=[],riverSegments=100;
for(let i=0;i<=riverSegments;i++){
  const t=i/riverSegments,p=riverCurve.getPoint(t),tan=riverCurve.getTangent(t),nx=-tan.z,nz=tan.x;
  for(const side of [-1,1]){riverVertices.push(p.x+nx*side*2.45,-.48,p.z+nz*side*2.45);riverUvs.push(t,side*.5+.5);}
  if(i<riverSegments){const a=i*2;riverIndices.push(a,a+1,a+2,a+1,a+3,a+2);}
}
const riverGeo=new THREE.BufferGeometry();riverGeo.setAttribute('position',new THREE.Float32BufferAttribute(riverVertices,3));riverGeo.setAttribute('uv',new THREE.Float32BufferAttribute(riverUvs,2));riverGeo.setIndex(riverIndices);riverGeo.computeVertexNormals();
const river=addMesh(riverGeo,envMaterials.water,0,0,0);river.material.side=THREE.DoubleSide;river.userData.water=true;
for(let i=0;i<45;i++){
  const t=Math.random(),p=riverCurve.getPoint(t),tan=riverCurve.getTangent(t);
  const foam=addMesh(new THREE.SphereGeometry(.08+Math.random()*.13,6,5),envMaterials.waterFoam,p.x+(Math.random()-.5)*3,-.43,p.z+(Math.random()-.5)*3,environment,false);
  foam.scale.set(1.8,.25,.7);foam.userData.flowOffset=Math.random()*6;foam.userData.flowBaseX=foam.position.x;foam.userData.flowBaseZ=foam.position.z;
}
for(let i=0;i<42;i++){
  const t=Math.random(),p=riverCurve.getPoint(t),tan=riverCurve.getTangent(t);
  const bank=addRock(p.x+(Math.random()-.5)*6,-.35,p.z+(Math.random()-.5)*5,.45+Math.random()*.8,.25+Math.random()*.4,.5+Math.random()*.8,i%2?mats.stone:envMaterials.moss);
}
// Stone footbridge across the river, with chunky rails and individual deck slabs.
const bridge=new THREE.Group();bridge.position.set(0,-.12,23);environment.add(bridge);
addMesh(new THREE.BoxGeometry(4.4,.48,9.5),envMaterials.ruin,0,0,0,bridge);
for(let i=0;i<11;i++)addMesh(new THREE.BoxGeometry(4.15,.12,.78),i%2?envMaterials.ruin:envMaterials.ruinDark,0,.3,-4.35+i*.86,bridge);
for(const side of [-1,1]){
  addMesh(new THREE.BoxGeometry(.32,1.05,9.5),envMaterials.ruin,side*2.05,.68,0,bridge);
  for(let i=0;i<5;i++)addMesh(new THREE.BoxGeometry(.48,.18,.42),envMaterials.ruinDark,side*2.05,1.22,-3.8+i*1.9,bridge);
}
// Ancient temple approach, broken columns, carved lintels and mossy rubble.
addArch(-12,5,9,5.2);addRuinColumn(-17,8,3.2);addRuinColumn(-7,8,4.1);addRuinColumn(-19,17,2.4);
addBox(-12,.1,12,13,.55,1.3,envMaterials.ruin);
for(let i=0;i<24;i++){const x=-22+Math.random()*19,z=1+Math.random()*23;addRock(x,-.28,z,.5+Math.random(),.35+Math.random()*.7,.55+Math.random(),i%2?envMaterials.ruin:envMaterials.moss);}
for(let i=0;i<8;i++){const x=-20+i*2.2;const glyph=addBox(x,1.8,4,.055,1.2,.045,envMaterials.gold);glyph.material=mat(0x8a9a72,.9);}
// Research outpost on the far bank: modular walls, observation glass, antenna and warning lamps.
const lab=new THREE.Group();lab.position.set(13,0,39);lab.rotation.y=-.16;environment.add(lab);
addMesh(new THREE.BoxGeometry(13,4.8,8),envMaterials.concrete,0,2.4,0,lab);
addMesh(new THREE.BoxGeometry(13.2,.35,8.2),envMaterials.ruinDark,0,4.85,0,lab);
addMesh(new THREE.BoxGeometry(8,2.4,.16),envMaterials.glass,0,2.8,4.08,lab,false);
for(let i=0;i<4;i++)addMesh(new THREE.BoxGeometry(.09,2.5,.12),envMaterials.painted,-3+i*2,2.8,4.18,lab,false);
addMesh(new THREE.BoxGeometry(2.4,2.9,.35),envMaterials.metal,0,1.45,4.16,lab);
addMesh(new THREE.BoxGeometry(2.1,.18,.08),envMaterials.lamp,0,3.1,4.38,lab,false);
for(const x of [-5.5,5.5]){addMesh(new THREE.CylinderGeometry(.12,.16,5.5,8),envMaterials.metal,x,5.1,-2.6,lab);addMesh(new THREE.SphereGeometry(.22,8,6),envMaterials.lamp,x,7.9,-2.6,lab,false);}
addMesh(new THREE.CylinderGeometry(.08,.08,4,8),envMaterials.metal,4.7,7,0,lab).rotation.z=.3;
addMesh(new THREE.SphereGeometry(.3,8,6),envMaterials.lamp,4.7,9,0,lab,false);
// Cave mouth and layered rock overhang on the left side of the route.
const cave=new THREE.Group();cave.position.set(-25,0,31);cave.rotation.y=.22;environment.add(cave);
addMesh(new THREE.SphereGeometry(1,12,8),envMaterials.ruinDark,0,2.6,0,cave).scale.set(5.4,3.4,4.2);
addMesh(new THREE.SphereGeometry(1,12,8),mat(0x071d1b,1),0,1.4,1.7,cave,false).scale.set(3.2,1.65,2.7);
addMesh(new THREE.BoxGeometry(6.7,.35,1.2),envMaterials.ruin,-.2,.3,2,cave);
for(let i=0;i<8;i++)addRock(-29+Math.random()*8,-.35,28+Math.random()*7,.8+Math.random(),.7+Math.random(),.9+Math.random(),envMaterials.moss);
// Distant waterfall spilling down the jungle escarpment, with animated veil and mist.
const falls=new THREE.Group();falls.position.set(25,0,10);environment.add(falls);
for(let i=0;i<3;i++){
  const veil=addMesh(new THREE.PlaneGeometry(2.1+i*.25,10-i*.4),envMaterials.waterfall,(i-1)*1.65,4.7,-.1,falls,false);
  veil.userData.waterfall=true;veil.rotation.y=(i-1)*.12;
}
addRock(0,-.4,-.3,7,2.2,3.2,mats.stone).position.x=25;
for(let i=0;i<12;i++){const splash=addMesh(new THREE.SphereGeometry(.22+Math.random()*.35,7,5),envMaterials.waterFoam,24+(Math.random()-.5)*5,.1+Math.random()*2,9+(Math.random()-.5)*3,environment,false);splash.userData.mist=true;splash.userData.phase=Math.random()*6.28;}
// Dense canopy perimeter, mid-height palms, understory ferns and flowering ground cover.
const trees=[];
for(let i=0;i<76;i++){
  const angle=Math.random()*Math.PI*2,r=22+Math.random()*28,x=Math.cos(angle)*r,z=8+Math.sin(angle)*r*1.18;
  if(Math.abs(x)<6&&z<35&&z>-15)continue;
  trees.push(addTree(x,z,.78+Math.random()*.75,i));
}
for(let i=0;i<170;i++){
  const x=(Math.random()-.5)*58,z=-29+Math.random()*70;
  if(Math.abs(x)<5&&z<34&&z>-15)continue;
  addFern(x,z,.55+Math.random()*.85,Math.random()>.86);
}
for(let i=0;i<35;i++){
  const x=(Math.random()-.5)*54,z=-24+Math.random()*64;
  const palm=new THREE.Group();palm.position.set(x,0,z);palm.rotation.y=Math.random()*6.28;environment.add(palm);
  addMesh(new THREE.CylinderGeometry(.12,.22,5.5,7),mats.bark,0,2.7,0,palm).rotation.z=.12;
  for(let f=0;f<7;f++){const frond=addMesh(new THREE.ConeGeometry(.28,3.6,5),f%2?envMaterials.leafDark:envMaterials.leafBright,Math.cos(f*6.28/7)*1.25,5.15,Math.sin(f*6.28/7)*1.25,palm,false);frond.rotation.z=-Math.cos(f*6.28/7)*.9;frond.rotation.x=Math.sin(f*6.28/7)*.9;}
}
// Hanging vines around ruins and canopy edges.
for(let i=0;i<22;i++){
  const x=-24+Math.random()*48,z=-16+Math.random()*43,h=1.5+Math.random()*3;
  const vine=addMesh(new THREE.CylinderGeometry(.018,.025,h,5),envMaterials.fern,x,4.7-h/2,z,environment,false);
  vine.rotation.z=(Math.random()-.5)*.18;
}
// Ambient insects / drifting spores / fireflies. Kept lightweight for mobile.
const moteCount=isTouch?90:180,motePositions=new Float32Array(moteCount*3),motePhases=[];
for(let i=0;i<moteCount;i++){motePositions[i*3]=(Math.random()-.5)*62;motePositions[i*3+1]=.4+Math.random()*8;motePositions[i*3+2]=-22+Math.random()*65;motePhases.push(Math.random()*6.28);}
const moteGeo=new THREE.BufferGeometry();moteGeo.setAttribute('position',new THREE.BufferAttribute(motePositions,3));
const motes=new THREE.Points(moteGeo,new THREE.PointsMaterial({color:0xd7f7a0,size:.055,transparent:true,opacity:.72,sizeAttenuation:true}));
environment.add(motes);
// Warm shafts of sunlight between canopy gaps, using transparent tapered beams.
const sunbeams=new THREE.Group();environment.add(sunbeams);
for(let i=0;i<7;i++){
  const beam=addMesh(new THREE.CylinderGeometry(.08,1.5,18,7,1,true),new THREE.MeshBasicMaterial({color:0xffe8b0,transparent:true,opacity:.055,depthWrite:false,side:THREE.DoubleSide}),-19+i*6,8,-13+(i%3)*13,sunbeams,false);
  beam.rotation.z=.12;beam.rotation.x=.08;
}
// Scatter small stones and broad leaf clumps to soften the path edges.
for(let i=0;i<95;i++){
  const x=(Math.random()-.5)*22,z=-22+Math.random()*54;
  if(Math.abs(x)<4.8)continue;
  addRock(x,-.38,z,.18+Math.random()*.38,.12+Math.random()*.24,.2+Math.random()*.4,i%3?envMaterials.moss:mats.mud);
}


const player={pos:new THREE.Vector3(0,1.7,-7),yaw:Math.PI,pitch:0,health:100,score:0,speed:6,grounded:true,stamina:100,sliding:false,slideTimer:0,slideCooldown:0,slideDir:new THREE.Vector3(),slideBoost:0,crouched:false,recoilKick:0};
camera.position.copy(player.pos);
const weapons=[
 {name:'AR-01',desc:'ASSAULT RIFLE',mag:30,reserve:150,damage:26,rate:115,spread:.012,recoil:.012,auto:true},
 {name:'RAPID-9',desc:'SUBMACHINE GUN',mag:36,reserve:180,damage:14,rate:65,spread:.025,recoil:.008,auto:true},
 {name:'THUNDER-12',desc:'TACTICAL SHOTGUN',mag:8,reserve:48,damage:13,rate:720,spread:.075,recoil:.045,auto:false,pellets:7},
 {name:'LONGSHOT',desc:'PRECISION RIFLE',mag:5,reserve:30,damage:115,rate:950,spread:.002,recoil:.055},
 {name:'PULSE BLASTER',desc:'ENERGY WEAPON',mag:24,reserve:96,damage:34,rate:220,spread:.008,recoil:.016,auto:true}
];
let weaponIndex=0,lastShot=0,reloading=false,paused=true,fireHeld=false,fireTap=false;
let enemies=[],lastFrame=performance.now(),velocityY=0,move={x:0,y:0};
const raycaster=new THREE.Raycaster();
function spawnEnemy(type,pos){
 const group=new THREE.Group();group.position.copy(pos);scene.add(group);
 const scale=type==='Heavy'?1.55:type==='Boss'?2.7:1;
 const torso=new THREE.Mesh(new THREE.BoxGeometry(.8*scale,1.05*scale,.48*scale),mats.robot);torso.position.y=1.1*scale;torso.castShadow=true;group.add(torso);
 const head=new THREE.Mesh(new THREE.BoxGeometry(.58*scale,.48*scale,.5*scale),mats.metal);head.position.y=1.9*scale;head.castShadow=true;group.add(head);
 const eye=new THREE.Mesh(new THREE.BoxGeometry(.36*scale,.09*scale,.06*scale),mats.glow);eye.position.set(0,1.94*scale,.28*scale);group.add(eye);
 for(const side of [-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.23*scale,.7*scale,.25*scale),mats.metal);leg.position.set(side*.22*scale,.36*scale,0);group.add(leg);}
 const hp=type==='Boss'?1100:type==='Heavy'?230:type==='Scout'?55:type==='Exploder'?65:100;
 enemies.push({group,type,hp,maxHp:hp,speed:type==='Scout'?3.3:type==='Heavy'?1.15:type==='Boss'?1.35:2.1,damage:type==='Boss'?20:type==='Heavy'?15:8,range:type==='Exploder'?1.7:11,nextAttack:0,alive:true});
}
spawnEnemy('Scout',new THREE.Vector3(-8,0,12));
spawnEnemy('Soldier',new THREE.Vector3(8,0,18));
spawnEnemy('Heavy',new THREE.Vector3(-6,0,28));
spawnEnemy('Exploder',new THREE.Vector3(6,0,33));
spawnEnemy('Boss',new THREE.Vector3(0,0,43));

function updateHud(){
 $('health').textContent=Math.max(0,Math.ceil(player.health));
 const staminaBar=$('staminabar');if(staminaBar)staminaBar.style.width=Math.max(0,player.stamina)+'%';
 const status=$('status');if(status)status.textContent=player.sliding?'SLIDING':player.crouched?'CROUCHED':player.stamina<25?'LOW STAMINA':'READY';
 $('healthbar').style.width=Math.max(0,player.health)+'%';
 const w=weapons[weaponIndex];$('weapon').textContent=`${w.name} // ${w.desc}`;
 $('ammo').innerHTML=`${w.mag} <em>/ ${w.reserve}</em>`;
 $('score').textContent='SCORE '+String(player.score).padStart(6,'0');
}
function toast(s){$('toast').textContent=s;setTimeout(()=>{$('toast').textContent='';},1500);}
function hitmarker(){const h=$('hitmarker');h.style.opacity=1;setTimeout(()=>h.style.opacity=0,100);}
function selectWeapon(i){if(i>=0&&i<weapons.length){weaponIndex=i;updateHud();}}
function reload(){
 const w=weapons[weaponIndex];if(reloading||w.mag===w.capacity||w.reserve<=0)return;
 reloading=true;toast('RELOADING');
 setTimeout(()=>{const n=Math.min(w.capacity-w.mag,w.reserve);w.mag+=n;w.reserve-=n;reloading=false;updateHud();},950);
}
weapons.forEach((w,i)=>w.capacity=[30,36,8,5,24][i]);
function shoot(){
 const w=weapons[weaponIndex],now=performance.now();
 if(reloading||now-lastShot<w.rate)return;
 if(w.mag<=0){reload();return;}lastShot=now;w.mag--;
 const moving=keys.has('KeyW')||keys.has('KeyA')||keys.has('KeyS')||keys.has('KeyD')||Math.abs(move.x)+Math.abs(move.y)>.2;
 const recoil=(w.recoil||.012)*(player.sliding?1.8:player.crouched?.72:moving?1.35:1);
 player.recoilKick=Math.min(.18,player.recoilKick+recoil);
 player.yaw+=((Math.random()-.5)*(w.recoil||.012))*.28;
 updateHud();
 let didHit=false;
 for(let p=0;p<(w.pellets||1);p++){
  const moveSpread=(player.sliding?.012:player.crouched?-.004:moving?.009:0);
  const spread=Math.max(.001,w.spread+moveSpread);
  const dir=new THREE.Vector3((Math.random()-.5)*spread,(Math.random()-.5)*spread,-1).applyEuler(camera.rotation).normalize();
  raycaster.set(camera.position,dir);raycaster.far=125;
  const targets=[];for(const e of enemies)if(e.alive)targets.push(...e.group.children);
  const hits=raycaster.intersectObjects(targets,false);
  if(hits.length){
   const hit=hits[0],enemy=enemies.find(e=>e.alive&&e.group.children.includes(hit.object));
   if(enemy){enemy.hp-=w.damage;didHit=true;if(enemy.hp<=0){enemy.alive=false;scene.remove(enemy.group);player.score+=enemy.type==='Boss'?1500:enemy.type==='Heavy'?250:100;toast(enemy.type==='Boss'?'BOSS ELIMINATED':'HOSTILE ELIMINATED');}}
  }
 }
 if(didHit)hitmarker();
 if(enemies.every(e=>!e.alive)){$('objective').textContent='OBJECTIVE COMPLETE';toast('AREA SECURED // MISSION COMPLETE');}
}
function updateEnemies(dt,now){
 for(const e of enemies){if(!e.alive)continue;
  const delta=new THREE.Vector3(player.pos.x-e.group.position.x,0,player.pos.z-e.group.position.z),dist=delta.length();
  if(dist>e.range*.8){delta.normalize();e.group.position.addScaledVector(delta,e.speed*dt);}
  e.group.lookAt(player.pos.x,e.group.position.y,player.pos.z);
  if(dist<e.range&&now>e.nextAttack){e.nextAttack=now+(e.type==='Boss'?850:1450);if(e.type==='Exploder'&&dist<2.3){player.health-=28;e.alive=false;scene.remove(e.group);toast('EXPLOSIVE UNIT DETONATED');}else if(dist<e.range*.72){player.health-=e.damage;toast('INCOMING FIRE');}}
 }
 if(player.health<=0){player.health=0;paused=true;pauseScreen.classList.remove('hidden');pauseScreen.querySelector('h2').innerHTML='MISSION <span>FAILED</span>';$('resume').textContent='REDEPLOY';}
 updateHud();
}
function startSlide(){
 if(paused||player.sliding||player.slideCooldown>0||player.pos.y>1.72)return;
 const forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+move.y;
 const side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+move.x;
 const moving=Math.abs(forward)+Math.abs(side)>.2;
 if(!moving){player.crouched=!player.crouched;updateHud();return;}
 if(player.stamina<18){toast('NOT ENOUGH STAMINA');return;}
 const fwd=new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));
 const right=new THREE.Vector3(Math.cos(player.yaw),0,-Math.sin(player.yaw));
 player.slideDir.copy(fwd.multiplyScalar(forward).add(right.multiplyScalar(side)).normalize());
 player.sliding=true;player.crouched=false;player.slideTimer=.78;player.slideCooldown=.28;player.stamina=Math.max(0,player.stamina-18);
 toast('SLIDE');
}
function jumpPlayer(){
 if(player.pos.y<=1.701){
  if(player.sliding){player.sliding=false;player.slideTimer=0;player.slideBoost=.42;toast('SLIDE JUMP');}
  velocityY=player.slideBoost>0?8.4:7.5;player.crouched=false;
 }
}
function movePlayer(dt){
 let forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+move.y;
 let side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+move.x;
 const fwd=new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));
 const right=new THREE.Vector3(Math.cos(player.yaw),0,-Math.sin(player.yaw));
 const dir=fwd.multiplyScalar(forward).add(right.multiplyScalar(side));
 if(dir.lengthSq()>1)dir.normalize();
 const sprinting=keys.has('ShiftLeft')&&!player.sliding&&!player.crouched&&player.stamina>0&&dir.lengthSq()>.05;
 if(player.sliding){
  player.slideTimer-=dt;player.pos.addScaledVector(player.slideDir,11.5*Math.max(.12,player.slideTimer/.78)*dt);
  if(player.slideTimer<=0){player.sliding=false;player.crouched=true;}
 }else{
  const speed=player.crouched?3.1:sprinting?9.1:player.speed;
  const boost=player.slideBoost>0?1.16:1;player.pos.addScaledVector(dir,speed*boost*dt);
 }
 if(sprinting)player.stamina=Math.max(0,player.stamina-23*dt);
 else if(!player.sliding)player.stamina=Math.min(100,player.stamina+17*dt);
 if(player.slideCooldown>0)player.slideCooldown=Math.max(0,player.slideCooldown-dt);
 if(player.slideBoost>0)player.slideBoost=Math.max(0,player.slideBoost-dt);
 velocityY-=20*dt;player.pos.y+=velocityY*dt;if(player.pos.y<1.7){player.pos.y=1.7;velocityY=0;}
 player.pos.x=THREE.MathUtils.clamp(player.pos.x,-28,28);player.pos.z=THREE.MathUtils.clamp(player.pos.z,-22,49);
 const stanceOffset=player.sliding?.52:player.crouched?.34:0;
 player.recoilKick=Math.max(0,player.recoilKick-2.8*dt);
 camera.position.set(player.pos.x,player.pos.y-stanceOffset,player.pos.z);camera.rotation.set(THREE.MathUtils.clamp(player.pitch-player.recoilKick,-1.35,1.35),player.yaw,0,'YXZ');
 updateHud();
}
const keys=new Set();
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyR')reload();if(e.code==='KeyC'&&!e.repeat)startSlide();if(e.code==='Space'&&!e.repeat)jumpPlayer();if(e.code.startsWith('Digit'))selectWeapon(Number(e.code.slice(5))-1);if(e.code==='Escape'&&!paused)pauseGame();});
addEventListener('keyup',e=>keys.delete(e.code));
renderer.domElement.addEventListener('click',()=>{if(!isTouch&&!paused)renderer.domElement.requestPointerLock?.();});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement&&!paused){player.yaw-=e.movementX*.002;player.pitch=THREE.MathUtils.clamp(player.pitch-e.movementY*.002,-1.35,1.35);}});
renderer.domElement.addEventListener('mousedown',e=>{if(e.button===0&&!paused){fireHeld=true;fireTap=true;}});
addEventListener('mouseup',()=>fireHeld=false);
addEventListener('contextmenu',e=>e.preventDefault());
function pauseGame(){paused=true;pauseScreen.classList.remove('hidden');document.exitPointerLock?.();}
$('resume').onclick=()=>{if(player.health<=0){location.reload();return;}paused=false;pauseScreen.classList.add('hidden');if(!isTouch)renderer.domElement.requestPointerLock?.();};
$('start').onclick=()=>{menu.classList.add('hidden');hud.classList.remove('hidden');if(isTouch)mobile.classList.remove('hidden');paused=false;if(!isTouch)renderer.domElement.requestPointerLock?.();};
$('fire').addEventListener('pointerdown',e=>{e.preventDefault();fireHeld=true;fireTap=true;});
$('fire').addEventListener('pointerup',()=>fireHeld=false);$('fire').addEventListener('pointercancel',()=>fireHeld=false);
$('jump').onclick=jumpPlayer;
$('slide').onclick=startSlide;
$('reload').onclick=reload;
let stickPointer=null;
$('stick-zone').addEventListener('pointerdown',e=>{stickPointer=e.pointerId;$('stick-zone').setPointerCapture(stickPointer);updateStick(e);});
$('stick-zone').addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)updateStick(e);});
$('stick-zone').addEventListener('pointerup',resetStick);$('stick-zone').addEventListener('pointercancel',resetStick);
function updateStick(e){const r=$('stick-zone').getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),max=48;const x=THREE.MathUtils.clamp(dx,-max,max),y=THREE.MathUtils.clamp(dy,-max,max);$('stick').style.left=`calc(50% + ${x}px)`;$('stick').style.top=`calc(50% + ${y}px)`;move.x=x/max;move.y=-y/max;}
function resetStick(){stickPointer=null;move={x:0,y:0};$('stick').style.left='50%';$('stick').style.top='50%';}
let lookId=null,lastTouch=null;
renderer.domElement.addEventListener('pointerdown',e=>{if(isTouch&&e.clientX>innerWidth*.35){lookId=e.pointerId;lastTouch={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}});
renderer.domElement.addEventListener('pointermove',e=>{if(isTouch&&e.pointerId===lookId&&lastTouch&&!paused){player.yaw-=(e.clientX-lastTouch.x)*.004;player.pitch=THREE.MathUtils.clamp(player.pitch-(e.clientY-lastTouch.y)*.004,-1.35,1.35);lastTouch={x:e.clientX,y:e.clientY};}});
renderer.domElement.addEventListener('pointerup',e=>{if(e.pointerId===lookId){lookId=null;lastTouch=null;}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused)pauseGame();});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,isTouch?1.5:2));});
function animate(now){
 requestAnimationFrame(animate);const dt=Math.min((now-lastFrame)/1000,.04);lastFrame=now;
 envClock.time+=dt;
 surfaceMaps.water.offset.x=(envClock.time*.018)%1;
 surfaceMaps.water.offset.y=(envClock.time*.045)%1;
 environment.traverse(child=>{if(child.userData.waterfall)child.position.y=4.7+Math.sin(envClock.time*3+child.position.x)*.08;if(child.userData.mist){child.position.y=.3+Math.abs(Math.sin(envClock.time*.7+child.userData.phase))*1.6;child.position.x+=Math.sin(envClock.time*.35+child.userData.phase)*.002;}if(child.userData.flowBaseX!==undefined){child.position.x=child.userData.flowBaseX+Math.sin(envClock.time*1.4+child.userData.flowOffset)*.35;child.position.z=child.userData.flowBaseZ+Math.cos(envClock.time*1.1+child.userData.flowOffset)*.45;}});
 const mp=moteGeo.attributes.position;for(let i=0;i<moteCount;i++){const phase=motePhases[i];mp.setX(i,motePositions[i*3]+Math.sin(envClock.time*.35+phase)*.18);mp.setY(i,motePositions[i*3+1]+Math.sin(envClock.time*.7+phase)*.24);mp.setZ(i,motePositions[i*3+2]+Math.cos(envClock.time*.28+phase)*.16);}mp.needsUpdate=true;
 if(!paused){movePlayer(dt);updateEnemies(dt,now);if(fireHeld||fireTap)shoot();fireTap=false;}
 renderer.render(scene,camera);
}
updateHud();requestAnimationFrame(animate);
