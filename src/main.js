import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const $ = (id) => document.getElementById(id);
const game = $('game');
const menu = $('menu'), hud = $('hud'), mobile = $('mobile'), pauseScreen = $('pause');
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa9c9d2);
scene.fog = new THREE.FogExp2(0x9bb8ad, 0.0068);

const camera = new THREE.PerspectiveCamera(74, innerWidth/innerHeight, .1, 180);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({antialias:!isTouch, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.15 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = !isTouch;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
game.appendChild(renderer.domElement);

// Real photographic 360-degree HDRI sky and image-based environment lighting.
// The CC0 Poly Haven asset is vendored locally so the scene also works offline.
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
new RGBELoader().load('/assets/hdri/qwantani_mid_morning_puresky_2k.hdr', (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = hdr;
  const environmentMap = pmremGenerator.fromEquirectangular(hdr).texture;
  scene.environment = environmentMap;
  scene.environmentIntensity = 0.72;
  scene.backgroundIntensity = 0.92;
  pmremGenerator.dispose();
  console.info('Jungle Rush HDRI loaded: Poly Haven Qwantani Mid Morning (Pure Sky), CC0');
}, undefined, (error) => {
  console.error('HDRI failed to load; using fallback sky color', error);
  scene.background = new THREE.Color(0x83b9d0);
  pmremGenerator.dispose();
});

scene.add(new THREE.HemisphereLight(0xd7f4df,0x34432d,1.9));
scene.add(new THREE.AmbientLight(0x91bca0,0.28));
const sun = new THREE.DirectionalLight(0xffe5b7,3.1);
sun.position.set(-25,40,-10); sun.castShadow=!isTouch; sun.shadow.mapSize.set(768,768); scene.add(sun);

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
// PINE FOREST ENVIRONMENT — scanned assets placed at human scale in a shaped landscape.
const environment = new THREE.Group();
scene.add(environment);
const windObjects = [];
const floorMaterial = new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,map:surfaceMaps.ground});
const trailMaterial = new THREE.MeshStandardMaterial({color:0x59452e,roughness:1,map:surfaceMaps.dirt});
const streamMaterial = new THREE.MeshStandardMaterial({color:0xffffff,map:surfaceMaps.water,roughness:.2,metalness:.08,transparent:true,opacity:.84});

function forestTerrainHeight(x,z){
 return .24*Math.sin(x*.17+z*.055)+.18*Math.sin(z*.13-x*.08)
  +.32*Math.exp(-((x-27)**2+(z-28)**2)/360)
  +.26*Math.exp(-((x+25)**2+(z+18)**2)/300);
}
const terrainGeometry=new THREE.PlaneGeometry(76,96,64,80);
const terrainPositions=terrainGeometry.attributes.position;
for(let i=0;i<terrainPositions.count;i++){
 const x=terrainPositions.getX(i),z=terrainPositions.getY(i)+12;
 terrainPositions.setZ(i,forestTerrainHeight(x,z));
}
terrainGeometry.computeVertexNormals();
const ground=new THREE.Mesh(terrainGeometry,floorMaterial);
ground.rotation.x=-Math.PI/2;ground.position.set(0,0,12);ground.receiveShadow=true;environment.add(ground);

function makeForestRibbon(curve,width,material,yOffset=.02,segments=140){
 const positions=[],uvs=[],indices=[];
 for(let i=0;i<=segments;i++){
  const t=i/segments,p=curve.getPointAt(t),tan=curve.getTangentAt(t).normalize();
  const side=new THREE.Vector3(tan.z,0,-tan.x).normalize().multiplyScalar(width*.5);
  const y=forestTerrainHeight(p.x,p.z)+yOffset;
  positions.push(p.x+side.x,y,p.z+side.z,p.x-side.x,y,p.z-side.z);
  uvs.push(0,t*18,1,t*18);
  if(i<segments){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 g.setIndex(indices);g.computeVertexNormals();
 const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;environment.add(mesh);return mesh;
}
const forestTrail=new THREE.CatmullRomCurve3([
 new THREE.Vector3(0,0,-36),new THREE.Vector3(-1.2,0,-22),new THREE.Vector3(1.6,0,-8),
 new THREE.Vector3(2.4,0,7),new THREE.Vector3(-1.4,0,21),new THREE.Vector3(.5,0,36),new THREE.Vector3(0,0,57)
]);
makeForestRibbon(forestTrail,5.2,trailMaterial,.035);
const forestStream=new THREE.CatmullRomCurve3([
 new THREE.Vector3(15,0,-34),new THREE.Vector3(18,0,-19),new THREE.Vector3(14.5,0,-4),
 new THREE.Vector3(17,0,12),new THREE.Vector3(13,0,28),new THREE.Vector3(16,0,45),new THREE.Vector3(12.5,0,57)
]);
makeForestRibbon(forestStream,2.2,streamMaterial,.055,110);

function forestAssetProfile(entry,size){
 const id=entry.id.toLowerCase();
 const label=`${entry.name||''} ${entry.category||''} ${(entry.tags||[]).join(' ')}`.toLowerCase();
 if(/pine_tree|fir_tree/.test(id)&&!/sapling/.test(label))return{kind:'tree',metres:13.5,axis:'y',count:5};
 if(/sapling/.test(label))return{kind:'sapling',metres:id.includes('small')?1.8:id.includes('medium')?3.1:2.5,axis:'y',count:5};
 if(/fern/.test(label))return{kind:'fern',metres:.95,axis:'y',count:7};
 if(/grass/.test(label))return{kind:'grass',metres:.48,axis:'y',count:8};
 if(/moss/.test(label))return{kind:'moss',metres:.38,axis:'y',count:6};
 if(/rock|stone/.test(label))return{kind:'rock',metres:1.45,axis:'max',count:4};
 if(/stump/.test(label))return{kind:'stump',metres:.85,axis:'y',count:3};
 if(/log|branch|root|trunk/.test(label))return{kind:'wood',metres:3.2,axis:'max',count:3};
 return{kind:'prop',metres:1.2,axis:'y',count:2};
}
function trailXAt(z){return forestTrail.getPointAt(THREE.MathUtils.clamp((z+36)/93,0,1)).x;}
function forestPlacement(kind,random){
 for(let attempt=0;attempt<24;attempt++){
  const side=random()>.5?1:-1,z=-34+random()*88;
  const x=side*(kind==='tree'?10+random()*22:kind==='sapling'?6.5+random()*23:
   ['fern','grass','moss'].includes(kind)?4.1+random()*15:6+random()*22);
  if(Math.abs(x-trailXAt(z))<(kind==='tree'?7.5:3.7))continue;
  const streamT=THREE.MathUtils.clamp((z+34)/91,0,1);
  const streamX=forestStream.getPointAt(streamT).x;
  if(x>0&&Math.abs(x-streamX)<(kind==='tree'?3.2:1.8))continue;
  if(kind!=='tree'&&Math.abs(z-28)<5&&Math.abs(x)<8)continue;
  return{x,z};
 }
 return{x:18,z:0};
}
async function loadPineForestCollection(){
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
 const toastEl=$('toast'),menuStatus=$('asset-status');
 const setStatus=s=>{if(toastEl)toastEl.textContent=s;if(menuStatus)menuStatus.textContent=s;};
 try{
  setStatus('PINE FOREST // READING LOCAL ASSET MANIFEST');
  const response=await fetch('/assets/polyhaven/collection-manifest.json',{cache:'no-cache'});
  if(!response.ok)throw new Error(`Pine Forest manifest request failed: HTTP ${response.status}`);
  const manifest=await response.json();
  if(manifest.collection!=='pine_forest'||!Array.isArray(manifest.models)||!manifest.models.length)
   throw new Error('Pine Forest collection manifest is empty or has the wrong collection ID');
  const queue=manifest.models.map((entry,index)=>({entry,index})),loaded=new Array(queue.length);
  let completed=0;
  const worker=async()=>{
   while(queue.length){
    const task=queue.shift();
    try{
     const gltf=await loader.loadAsync(`/assets/polyhaven/${task.entry.id}/model.glb`);
     const prototype=gltf.scene;prototype.updateMatrixWorld(true);
     const bounds=new THREE.Box3().setFromObject(prototype),size=bounds.getSize(new THREE.Vector3());
     const profile=forestAssetProfile(task.entry,size);
     const measured=profile.axis==='max'?Math.max(size.x,size.y,size.z):size.y;
     if(!measured||!Number.isFinite(measured))throw new Error('Invalid GLB dimensions');
     loaded[task.index]={entry:task.entry,prototype,bounds,profile,scale:profile.metres/measured};
    }catch(error){console.error(`Pine Forest model failed: ${task.entry.id}`,error);loaded[task.index]=null;}
    finally{completed++;setStatus(`PINE FOREST // LOADING ${completed}/${manifest.models.length}`);}
   }
  };
  await Promise.all(Array.from({length:Math.min(3,queue.length)},worker));
  const models=loaded.filter(Boolean);
  if(!models.length)throw new Error('No Pine Forest models loaded successfully');
  let seed=721;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const placements=[];
  for(const model of models)for(let i=0;i<model.profile.count;i++){
   const p=forestPlacement(model.profile.kind,random);
   const jitter=model.profile.kind==='tree'?.86+random()*.24:.78+random()*.42;
   placements.push({model,...p,scale:model.scale*jitter,rotation:random()*Math.PI*2});
  }
  for(const p of placements){
   const instance=p.model.prototype.clone(true);
   instance.scale.setScalar(p.scale);
   instance.position.set(p.x,forestTerrainHeight(p.x,p.z)-p.model.bounds.min.y*p.scale,p.z);
   instance.rotation.y=p.rotation;
   instance.traverse(node=>{
    if(!node.isMesh)return;
    node.castShadow=!isTouch;node.receiveShadow=true;
    const materials=Array.isArray(node.material)?node.material:[node.material];
    for(const material of materials){
     if(material.map)material.map.colorSpace=THREE.SRGBColorSpace;
     if(material.emissiveMap)material.emissiveMap.colorSpace=THREE.SRGBColorSpace;
     material.needsUpdate=true;
    }
   });
   environment.add(instance);
   if(p.model.profile.kind==='tree'||p.model.profile.kind==='sapling')
    windObjects.push({object:instance,phase:random()*Math.PI*2,strength:p.model.profile.kind==='tree'?.004:.009});
  }
  const message=`PINE FOREST // ${models.length}/${manifest.models.length} SCANNED MODELS · ${placements.length} NATURAL-SCALE INSTANCES`;
  console.info(message);setStatus(message);
 }catch(error){console.error('Pine Forest collection failed to load',error);setStatus('ENVIRONMENT ASSETS FAILED // CHECK CONNECTION AND RELOAD');}
}
loadPineForestCollection();

const player={pos:new THREE.Vector3(0,forestTerrainHeight(0,-7)+1.7,-7),yaw:Math.PI,pitch:0,health:100,score:0,speed:6,grounded:true,stamina:100,sliding:false,slideTimer:0,slideCooldown:0,slideDir:new THREE.Vector3(),slideBoost:0,crouched:false,recoilKick:0};
camera.position.copy(player.pos);
scene.add(camera);
const weaponRig=new THREE.Group();weaponRig.position.set(.30,-.27,-.68);camera.add(weaponRig);
const riflePivot=new THREE.Group();weaponRig.add(riflePivot);
const smgPivot=new THREE.Group();smgPivot.visible=false;weaponRig.add(smgPivot);
const weaponAnim={kick:0,pitch:0,muzzle:0,reloadElapsed:0,boltCycle:1};
let smgMixer=null,smgActions={};
let rifleBolt=null,rifleBoltBase=null;
const sleeveMaterial=new THREE.MeshStandardMaterial({color:0x344b3b,roughness:.92});
const gloveMaterial=new THREE.MeshStandardMaterial({color:0x92775a,roughness:.88});
function addViewArm(parent,start,end,radius,material){
 const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),delta=b.clone().sub(a);
 const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(radius,Math.max(.01,delta.length()-radius*2),4,8),material);
 mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
 mesh.frustumCulled=false;parent.add(mesh);return mesh;
}
function addGlove(parent,position){
 const palm=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),gloveMaterial);
 palm.position.set(...position);palm.scale.set(1.12,.82,1.25);parent.add(palm);
 for(let i=0;i<3;i++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.018,.075,3,6),gloveMaterial);finger.position.set(position[0]-.035+i*.035,position[1]-.035,position[2]-.045);finger.rotation.x=.55;parent.add(finger);}
}
const triggerHand=new THREE.Group();weaponRig.add(triggerHand);
addViewArm(triggerHand,[.32,-.30,.20],[.19,-.12,.02],.075,sleeveMaterial);addGlove(triggerHand,[.17,-.105,-.015]);
const supportHand=new THREE.Group();weaponRig.add(supportHand);
addViewArm(supportHand,[-.46,-.43,-.30],[-.13,-.17,-.35],.073,sleeveMaterial);addGlove(supportHand,[-.11,-.155,-.36]);
const muzzleFlash=new THREE.Group();muzzleFlash.visible=false;riflePivot.add(muzzleFlash);
const flashCore=new THREE.Mesh(new THREE.SphereGeometry(.045,8,8),new THREE.MeshBasicMaterial({color:0xffe4a0}));flashCore.scale.set(.8,.8,1.8);muzzleFlash.add(flashCore);
const flashFlare=new THREE.Mesh(new THREE.ConeGeometry(.035,.16,8),new THREE.MeshBasicMaterial({color:0xff8a32}));flashFlare.rotation.x=-Math.PI/2;flashFlare.position.z=-.075;muzzleFlash.add(flashFlare);
const muzzleLight=new THREE.PointLight(0xffa04a,0,3);muzzleFlash.add(muzzleLight);muzzleFlash.position.set(0,0,-.49);
const smgMetal=new THREE.MeshStandardMaterial({color:0x252d31,metalness:.78,roughness:.38});
const smgPolymer=new THREE.MeshStandardMaterial({color:0x202a27,metalness:.12,roughness:.82});
const smgAccent=new THREE.MeshStandardMaterial({color:0x69736b,metalness:.65,roughness:.42});
function smgPart(parent,geometry,material,position,rotation=[0,0,0]){
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.castShadow=false;mesh.receiveShadow=false;parent.add(mesh);return mesh;
}
smgPart(smgPivot,new THREE.BoxGeometry(.19,.17,.43),smgMetal,[0,.005,-.055]);
smgPart(smgPivot,new THREE.BoxGeometry(.16,.12,.24),smgPolymer,[0,-.015,-.34]);
smgPart(smgPivot,new THREE.CylinderGeometry(.027,.027,.35,10),smgMetal,[0,.015,-.61],[Math.PI/2,0,0]);
smgPart(smgPivot,new THREE.CylinderGeometry(.043,.043,.08,10),smgAccent,[0,.015,-.81],[Math.PI/2,0,0]);
smgPart(smgPivot,new THREE.BoxGeometry(.115,.23,.12),smgPolymer,[0,-.19,-.045],[.12,0,0]);
smgPart(smgPivot,new THREE.BoxGeometry(.12,.19,.105),smgPolymer,[0,-.16,.12],[.18,0,0]);
smgPart(smgPivot,new THREE.BoxGeometry(.16,.075,.25),smgPolymer,[0,.025,.28]);
smgPart(smgPivot,new THREE.BoxGeometry(.13,.035,.14),smgMetal,[0,.105,-.06]);
smgPart(smgPivot,new THREE.BoxGeometry(.07,.04,.14),smgAccent,[0,.14,-.06]);
const smgMuzzleFlash=new THREE.Group();smgPivot.add(smgMuzzleFlash);smgMuzzleFlash.position.set(0,.015,-.84);
const smgFlashCore=new THREE.Mesh(new THREE.SphereGeometry(.04,8,8),new THREE.MeshBasicMaterial({color:0xffe4a0}));smgFlashCore.scale.set(.8,.8,1.8);smgMuzzleFlash.add(smgFlashCore);
const smgFlashFlare=new THREE.Mesh(new THREE.ConeGeometry(.035,.15,8),new THREE.MeshBasicMaterial({color:0xff8a32}));smgFlashFlare.rotation.x=-Math.PI/2;smgFlashFlare.position.z=-.075;smgMuzzleFlash.add(smgFlashFlare);
const smgMuzzleLight=new THREE.PointLight(0xffa04a,0,3);smgMuzzleFlash.add(smgMuzzleLight);smgMuzzleFlash.visible=false;
const smgLoader=new GLTFLoader();smgLoader.setMeshoptDecoder(MeshoptDecoder);
fetch('/assets/weapons/fps_animated_smg/manifest.json').then(response=>response.ok?response.json():null).then(manifest=>{
 if(!manifest?.modelAvailable){console.info('SMG placeholder active; awaiting the user-provided Sketchfab model archive.');return;}
 smgLoader.load('/assets/weapons/fps_animated_smg/model.glb',gltf=>{
  const modelRoot=new THREE.Group();modelRoot.add(gltf.scene);modelRoot.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(modelRoot),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const longest=Math.max(size.x,size.y,size.z);
  if(!longest)throw new Error('Downloaded SMG model has empty geometry');
  gltf.scene.position.sub(center);gltf.scene.scale.setScalar(.88/longest);
  smgPivot.add(modelRoot);smgPivot.userData.authoredModel=modelRoot;
  if(gltf.animations?.length){
   smgMixer=new THREE.AnimationMixer(modelRoot);
   for(const clip of gltf.animations)smgActions[clip.name.toLowerCase()]=smgMixer.clipAction(clip);
   console.info('SMG animation clips:',gltf.animations.map(c=>c.name));
  }
  smgPivot.children.filter(child=>child!==modelRoot&&child!==smgMuzzleFlash).forEach(child=>child.visible=false);
  console.info('Sketchfab fps animated smg loaded');
 },undefined,error=>console.error('Sketchfab SMG model failed to load:',error));
}).catch(error=>console.warn('SMG asset manifest could not be read:',error));
function playSmgAnimation(kind){
 if(!smgMixer)return;
 const keys=Object.keys(smgActions),match=keys.find(key=>kind==='fire'?/fire|shoot|shot/.test(key):/reload/.test(key));
 if(match){for(const action of Object.values(smgActions))action.stop();const action=smgActions[match];action.reset();action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();}
}
const rifleLoader=new GLTFLoader();rifleLoader.setMeshoptDecoder(MeshoptDecoder);
rifleLoader.load('/assets/weapons/bolt_action_rifle_7_62/model.glb',gltf=>{
 const rifle=gltf.scene;rifle.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(rifle);
 const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),longest=Math.max(size.x,size.y,size.z);
 rifle.position.set(-center.x,-center.y,-center.z);if(size.x>=size.z)rifle.rotation.y=Math.PI/2;rifle.scale.setScalar(.88/longest);
 rifle.traverse(node=>{
  if(node.isMesh){node.castShadow=false;node.receiveShadow=false;node.frustumCulled=false;const materials=Array.isArray(node.material)?node.material:[node.material];for(const material of materials){if(material.map)material.map.colorSpace=THREE.SRGBColorSpace;material.needsUpdate=true;}}
  if(!rifleBolt&&/bolt|charging.handle/i.test(node.name||''))rifleBolt=node;
 });
 if(rifleBolt)rifleBoltBase={position:rifleBolt.position.clone(),rotation:rifleBolt.rotation.clone()};
 riflePivot.add(rifle);console.info('Poly Haven Bolt Action Rifle 7.62 viewmodel loaded (CC0)');
},undefined,error=>console.error('Bolt-action rifle viewmodel failed to load',error));
const weapons=[
 {id:'rifle',name:'BOLT ACTION 7.62',desc:'BOLT-ACTION PRECISION RIFLE',capacity:5,mag:5,reserve:40,damage:118,fireInterval:820,baseSpread:.0018,movingSpread:.0045,verticalRecoil:.043,horizontalRecoil:.0022,weaponKick:.105,weaponRise:.082,recoilReturn:8.5,reloadDuration:2.35,automatic:false},
 {id:'smg',name:'DJM-45 SMG',desc:'COMPACT AUTOMATIC SMG',capacity:30,mag:30,reserve:120,damage:19,fireInterval:92,baseSpread:.009,movingSpread:.009,verticalRecoil:.012,horizontalRecoil:.0045,weaponKick:.035,weaponRise:.022,recoilReturn:13,reloadDuration:1.65,automatic:true}
];
let weaponIndex=0,weapon=weapons[weaponIndex];
function switchWeapon(index){
 if(index<0||index>=weapons.length||index===weaponIndex||reloading)return;
 weaponIndex=index;weapon=weapons[weaponIndex];lastShot=0;weaponAnim.kick=0;weaponAnim.pitch=0;weaponAnim.muzzle=0;weaponAnim.boltCycle=1;
 riflePivot.visible=weapon.id==='rifle';smgPivot.visible=weapon.id==='smg';
 muzzleFlash.visible=false;smgMuzzleFlash.visible=false;
 updateHud();toast("EQUIPPED // "+weapon.name);
}
function cycleWeapon(){switchWeapon((weaponIndex+1)%weapons.length);}
let lastShot=0,reloading=false,paused=true,fireHeld=false,fireTap=false;
let enemies=[],lastFrame=performance.now(),velocityY=0,move={x:0,y:0};
const raycaster=new THREE.Raycaster();
function spawnEnemy(type,pos){
 const group=new THREE.Group();group.position.set(pos.x,forestTerrainHeight(pos.x,pos.z),pos.z);scene.add(group);
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
 $('weapon').textContent=`${weapon.name} // ${weapon.desc}`;
 $('ammo').innerHTML=`${weapon.mag} <em>/ ${weapon.reserve}</em>`;
 $('score').textContent='SCORE '+String(player.score).padStart(6,'0');
}
function toast(s){$('toast').textContent=s;setTimeout(()=>{$('toast').textContent='';},1500);}
function hitmarker(){const h=$('hitmarker');h.style.opacity=1;setTimeout(()=>h.style.opacity=0,100);}
function reload(){
 if(reloading||weapon.mag===weapon.capacity||weapon.reserve<=0)return;
 reloading=true;weaponAnim.reloadElapsed=0;weaponAnim.boltCycle=1;playSmgAnimation('reload');toast(weapon.id==='rifle'?'RELOADING // WORKING THE BOLT':'RELOADING // SMG MAGAZINE');
}
function updateWeaponAnimations(dt){
 weaponAnim.kick=Math.max(0,weaponAnim.kick-Math.max(0,weaponAnim.kick)*weapon.recoilReturn*dt);
 weaponAnim.pitch=Math.max(0,weaponAnim.pitch-Math.max(0,weaponAnim.pitch)*weapon.recoilReturn*dt);
 const moving=keys.has('KeyW')||keys.has('KeyA')||keys.has('KeyS')||keys.has('KeyD')||Math.abs(move.x)+Math.abs(move.y)>.2;
 const bob=(!player.sliding&&moving)?Math.sin(performance.now()*.012)*.008:0;
 let reloadWave=0;
 if(reloading){
  weaponAnim.reloadElapsed+=dt;const progress=Math.min(1,weaponAnim.reloadElapsed/weapon.reloadDuration);reloadWave=Math.sin(progress*Math.PI);
  if(progress>=1){const amount=Math.min(weapon.capacity-weapon.mag,weapon.reserve);weapon.mag+=amount;weapon.reserve-=amount;reloading=false;toast(weapon.id==='rifle'?'RIFLE READY':'SMG READY');updateHud();}
 }
 weaponRig.position.set(.30+(moving?Math.sin(performance.now()*.006)*.006:0),-.27+bob-reloadWave*.19,-.68+weaponAnim.kick+reloadWave*.10);
 riflePivot.rotation.x=weaponAnim.pitch+reloadWave*.17;riflePivot.rotation.z=reloadWave*.26;
 smgPivot.rotation.x=weaponAnim.pitch+reloadWave*.11;smgPivot.rotation.z=reloadWave*.18;
 supportHand.position.set(reloadWave*.20,-reloadWave*.11,reloadWave*.08);triggerHand.position.y=-reloadWave*.045;
 weaponAnim.muzzle=Math.max(0,weaponAnim.muzzle-dt);muzzleFlash.visible=weapon.id==='rifle'&&weaponAnim.muzzle>0;muzzleLight.intensity=muzzleFlash.visible?3.2:0;smgMuzzleFlash.visible=weapon.id==='smg'&&weaponAnim.muzzle>0;smgMuzzleLight.intensity=smgMuzzleFlash.visible?3.2:0;
 if(smgMixer)smgMixer.update(dt);
 if(rifleBolt&&rifleBoltBase){const cycle=weaponAnim.boltCycle;if(cycle<1){const phase=Math.min(1,cycle/.34);rifleBolt.rotation.x=rifleBoltBase.rotation.x+Math.sin(phase*Math.PI)*.58;rifleBolt.position.z=rifleBoltBase.position.z-Math.sin(phase*Math.PI)*.035;weaponAnim.boltCycle=Math.min(1,cycle+dt);}else{rifleBolt.rotation.copy(rifleBoltBase.rotation);rifleBolt.position.copy(rifleBoltBase.position);}}
}
function shoot(){
 const now=performance.now();if(reloading||now-lastShot<weapon.fireInterval)return;
 if(weapon.mag<=0){reload();return;}lastShot=now;weapon.mag--;
 const moving=keys.has('KeyW')||keys.has('KeyA')||keys.has('KeyS')||keys.has('KeyD')||Math.abs(move.x)+Math.abs(move.y)>.2;
 const movementPenalty=player.sliding?.010:player.crouched?-.0005:moving?weapon.movingSpread:0;
 const recoilScale=player.sliding?1.45:player.crouched?.78:moving?1.18:1;
 player.recoilKick=Math.min(.20,player.recoilKick+weapon.verticalRecoil*recoilScale);
 player.yaw+=(Math.random()-.5)*weapon.horizontalRecoil*recoilScale;
 weaponAnim.kick=Math.min(.16,weaponAnim.kick+weapon.weaponKick);weaponAnim.pitch=Math.min(.14,weaponAnim.pitch+weapon.weaponRise);
 weaponAnim.muzzle=.055;weaponAnim.boltCycle=weapon.id==='rifle'?0:1;if(weapon.id==='smg')playSmgAnimation('fire');updateHud();
 let didHit=false;const spread=Math.max(.0008,weapon.baseSpread+movementPenalty);
 const dir=new THREE.Vector3((Math.random()-.5)*spread,(Math.random()-.5)*spread,-1).applyEuler(camera.rotation).normalize();
 raycaster.set(camera.position,dir);raycaster.far=125;
 const targets=[];for(const e of enemies)if(e.alive)targets.push(...e.group.children);
 const hits=raycaster.intersectObjects(targets,false);
 if(hits.length){const hit=hits[0],enemy=enemies.find(e=>e.alive&&e.group.children.includes(hit.object));if(enemy){enemy.hp-=weapon.damage;didHit=true;if(enemy.hp<=0){enemy.alive=false;scene.remove(enemy.group);player.score+=enemy.type==='Boss'?1500:enemy.type==='Heavy'?250:100;toast(enemy.type==='Boss'?'BOSS ELIMINATED':'HOSTILE ELIMINATED');}}}
 if(didHit)hitmarker();if(enemies.every(e=>!e.alive)){$('objective').textContent='OBJECTIVE COMPLETE';toast('AREA SECURED // MISSION COMPLETE');}
}
function updateEnemies(dt,now){
 for(const e of enemies){if(!e.alive)continue;
  const delta=new THREE.Vector3(player.pos.x-e.group.position.x,0,player.pos.z-e.group.position.z),dist=delta.length();
  if(dist>e.range*.8){delta.normalize();e.group.position.addScaledVector(delta,e.speed*dt);}
  e.group.position.y=forestTerrainHeight(e.group.position.x,e.group.position.z);e.group.lookAt(player.pos.x,e.group.position.y,player.pos.z);
  if(dist<e.range&&now>e.nextAttack){e.nextAttack=now+(e.type==='Boss'?850:1450);if(e.type==='Exploder'&&dist<2.3){player.health-=28;e.alive=false;scene.remove(e.group);toast('EXPLOSIVE UNIT DETONATED');}else if(dist<e.range*.72){player.health-=e.damage;toast('INCOMING FIRE');}}
 }
 if(player.health<=0){player.health=0;paused=true;pauseScreen.classList.remove('hidden');pauseScreen.querySelector('h2').innerHTML='MISSION <span>FAILED</span>';$('resume').textContent='REDEPLOY';}
}
function startSlide(){
 if(paused||player.sliding||player.slideCooldown>0||player.pos.y>forestTerrainHeight(player.pos.x,player.pos.z)+1.72)return;
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
 if(player.pos.y<=forestTerrainHeight(player.pos.x,player.pos.z)+1.701){
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
 velocityY-=20*dt;player.pos.y+=velocityY*dt;const floorY=forestTerrainHeight(player.pos.x,player.pos.z)+1.7;if(player.pos.y<floorY){player.pos.y=floorY;velocityY=0;}
 player.pos.x=THREE.MathUtils.clamp(player.pos.x,-28,28);player.pos.z=THREE.MathUtils.clamp(player.pos.z,-22,49);
 const stanceOffset=player.sliding?.52:player.crouched?.34:0;
 player.recoilKick=Math.max(0,player.recoilKick-2.8*dt);
 camera.position.set(player.pos.x,player.pos.y-stanceOffset,player.pos.z);camera.rotation.set(THREE.MathUtils.clamp(player.pitch-player.recoilKick,-1.35,1.35),player.yaw,0,'YXZ');
}
const keys=new Set();
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyR')reload();if((e.code==='Digit1'||e.code==='Digit2')&&!e.repeat)switchWeapon(Number(e.code.slice(5))-1);if(e.code==='KeyQ'&&!e.repeat)cycleWeapon();if(e.code==='KeyC'&&!e.repeat)startSlide();if(e.code==='Space'&&!e.repeat)jumpPlayer();if(e.code==='Escape'&&!paused)pauseGame();});
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
$('switch-weapon').onclick=cycleWeapon;
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
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,isTouch?1.15:1.5));});
let lastHudUpdate=0;
function animate(now){
 requestAnimationFrame(animate);const dt=Math.min((now-lastFrame)/1000,.04);lastFrame=now;
  for(const wind of windObjects)wind.object.rotation.z=Math.sin(now*.00045+wind.phase)*wind.strength;
 if(!paused){movePlayer(dt);updateEnemies(dt,now);if(fireTap||(fireHeld&&weapon.automatic))shoot();fireTap=false;updateWeaponAnimations(dt);}
 if(now-lastHudUpdate>=100){updateHud();lastHudUpdate=now;}

 renderer.render(scene,camera);
}
updateHud();requestAnimationFrame(animate);
