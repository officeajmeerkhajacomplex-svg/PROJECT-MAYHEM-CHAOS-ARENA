import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const $ = (id) => document.getElementById(id);
const game = $('game');
const menu = $('menu'), hud = $('hud'), mobile = $('mobile'), pauseScreen = $('pause');
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9eb8ad);
scene.fog = new THREE.FogExp2(0x718a7b, 0.012);
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
// PINE FOREST — scanned Poly Haven collection assets replace procedural environment props.
const environment = new THREE.Group();
scene.add(environment);
const envClock = { time: 0 };
const groundMaterial = new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,map:surfaceMaps.ground});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(76,96),groundMaterial);
ground.rotation.x=-Math.PI/2;
ground.position.set(0,-.72,12);
ground.receiveShadow=true;
environment.add(ground);

// Environment props come exclusively from the locally vendored Pine Forest collection.
// Load the complete locally vendored Pine Forest model collection.
async function loadPineForestCollection() {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const toastEl = $('toast');
  const menuStatus = $('asset-status');
  const setStatus = (message) => {
    if (toastEl) toastEl.textContent = message;
    if (menuStatus) menuStatus.textContent = message;
  };
  try {
    setStatus('PINE FOREST // READING LOCAL ASSET MANIFEST');
    const response = await fetch('/assets/polyhaven/collection-manifest.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Pine Forest manifest request failed: HTTP ${response.status}`);
    const manifest = await response.json();
    if (manifest.collection !== 'pine_forest' || !Array.isArray(manifest.models) || !manifest.models.length) {
      throw new Error('Pine Forest collection manifest is empty or has the wrong collection ID');
    }

    // Load a small number of GLBs concurrently: much faster than serial loading,
    // without creating a burst of 80+ MB of simultaneous decode work on phones.
    const queue = manifest.models.map((entry, index) => ({ entry, index }));
    const loaded = new Array(queue.length);
    let completed = 0;
    const worker = async () => {
      while (queue.length) {
        const task = queue.shift();
        try {
          const gltf = await loader.loadAsync(`/assets/polyhaven/${task.entry.id}/model.glb`);
          const prototype = gltf.scene;
          prototype.updateMatrixWorld(true);
          const bounds = new THREE.Box3().setFromObject(prototype);
          const size = bounds.getSize(new THREE.Vector3());
          const height = Math.max(size.x, size.y, size.z);
          if (!height || !Number.isFinite(height)) throw new Error('Invalid model dimensions');
          const text = `${task.entry.id} ${task.entry.name || ''} ${task.entry.category || ''} ${(task.entry.tags || []).join(' ')}`.toLowerCase();
          const kind = /sapling|fern|grass|moss|flower|shrub|bush|plant|vegetation/.test(text) ? 'understory'
            : /rock|boulder|stone/.test(text) ? 'rock'
            : /log|stump|wood|branch|root|trunk/.test(text) ? 'wood'
            : /tree|conifer|spruce|fir|pine/.test(text) ? 'tree' : 'prop';
          loaded[task.index] = { entry: task.entry, prototype, bounds, height, kind };
        } catch (error) {
          console.error(`Pine Forest model failed to load: ${task.entry.id}`, error);
          loaded[task.index] = null;
        } finally {
          completed++;
          setStatus(`PINE FOREST // LOADING ${completed}/${queue.length + completed}`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker));
    const models = loaded.filter(Boolean);
    if (!models.length) throw new Error('No Pine Forest models loaded successfully');

    let seed = 721;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const placements = [];
    for (const model of models) {
      const count = model.kind === 'tree' ? 7 : model.kind === 'understory' ? 7 : model.kind === 'rock' ? 4 : model.kind === 'wood' ? 2 : 2;
      for (let i = 0; i < count; i++) {
        let x = 0, z = 0;
        if (model.kind === 'tree') {
          const side = random() > .5 ? 1 : -1;
          x = side * (10 + random() * 15);
          z = -17 + random() * 62;
        } else if (model.kind === 'understory') {
          const side = random() > .5 ? 1 : -1;
          x = side * (5.5 + random() * 17);
          z = -17 + random() * 62;
        } else {
          x = (random() > .5 ? 1 : -1) * (6 + random() * 19);
          z = -17 + random() * 62;
        }
        const targetHeight = model.kind === 'tree' ? 8 + random() * 5
          : model.kind === 'understory' ? .55 + random() * 1.5
          : model.kind === 'rock' ? .8 + random() * 2.4
          : model.kind === 'wood' ? 1.2 + random() * 2.5 : 1.5 + random() * 3;
        placements.push({ model, x, z, scale: targetHeight / model.height, rotation: random() * Math.PI * 2 });
      }
    }
    for (const placement of placements) {
      const instance = placement.model.prototype.clone(true);
      instance.scale.setScalar(placement.scale);
      instance.position.set(placement.x, -placement.model.bounds.min.y * placement.scale, placement.z);
      instance.rotation.y = placement.rotation;
      instance.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = !isTouch; node.receiveShadow = true;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) {
          if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
          if (material.emissiveMap) material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
          material.needsUpdate = true;
        }
      });
      environment.add(instance);
    }
    const message = `PINE FOREST // ${models.length}/${manifest.models.length} MODELS · ${placements.length} PLACEMENTS`;
    console.info(message);
    setStatus(message);
  } catch (error) {
    console.error('Pine Forest collection failed to load', error);
    setStatus('ENVIRONMENT ASSETS FAILED // CHECK CONNECTION AND RELOAD');
  }
}
loadPineForestCollection();

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
 if(!paused){movePlayer(dt);updateEnemies(dt,now);if(fireHeld||fireTap)shoot();fireTap=false;}
 renderer.render(scene,camera);
}
updateHud();requestAnimationFrame(animate);
