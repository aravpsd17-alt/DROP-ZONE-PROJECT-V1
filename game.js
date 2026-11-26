import * as THREE from 'three';

// DROPZONE: Neon Fall, a self-contained procedural battle-royale slice.
const canvas = document.querySelector('#game-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ac4ce);
scene.fog = new THREE.FogExp2(0x94b7bd, 0.00225);
const camera = new THREE.PerspectiveCamera(67, innerWidth / innerHeight, 0.1, 700);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const v3 = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const mats={
  ground:new THREE.MeshStandardMaterial({color:0x536e59,roughness:.96}), road:new THREE.MeshStandardMaterial({color:0x293943,roughness:.86}),
  concrete:new THREE.MeshStandardMaterial({color:0x52636c,roughness:.78}), dark:new THREE.MeshStandardMaterial({color:0x172b37,metalness:.55,roughness:.5}),
  glass:new THREE.MeshStandardMaterial({color:0x58c8cf,emissive:0x143a42,emissiveIntensity:.8,metalness:.48,roughness:.2}),
  window:new THREE.MeshStandardMaterial({color:0x72bbc0,emissive:0x173b40,emissiveIntensity:.62,metalness:.25,roughness:.25}),
  neon:new THREE.MeshStandardMaterial({color:0x46ffe3,emissive:0x21c8b3,emissiveIntensity:2.6}),
  magenta:new THREE.MeshStandardMaterial({color:0xff4bcb,emissive:0xbb167f,emissiveIntensity:2.1}),
  foliage:new THREE.MeshStandardMaterial({color:0x315b48,roughness:1}),
  trunk:new THREE.MeshStandardMaterial({color:0x57483a,roughness:1}),
  loot:new THREE.MeshStandardMaterial({color:0xefff72,emissive:0xb5c92b,emissiveIntensity:1.5}),
  white:new THREE.MeshStandardMaterial({color:0xd9e7e2,roughness:.42}),
};
const hemi=new THREE.HemisphereLight(0xd7f4ff,0x35483c,2.0);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe6c6,3.0);sun.position.set(-90,140,75);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-190;sun.shadow.camera.right=190;sun.shadow.camera.top=190;sun.shadow.camera.bottom=-190;sun.shadow.bias=-.00015;scene.add(sun);
const fill=new THREE.DirectionalLight(0x7ad8e6,1.1);fill.position.set(80,50,-90);scene.add(fill);
const world=new THREE.Group();scene.add(world);
const colliders=[];const destructibles=[];const loot=[];const bots=[];const particles=[];const tracers=[];const decorations=[];
function mesh(geo,mat,parent=world,pos=v3(),rot=null){const o=new THREE.Mesh(geo,mat);o.position.copy(pos);if(rot)o.rotation.set(...rot);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(parent,mat,pos,size,rot){return mesh(new THREE.BoxGeometry(...size),mat,parent,pos,rot);}
function addCollider(x,z,w,d,top=14){colliders.push({x,z,w,d,top});}

// A broad island, an elevated ridge, roads and a ring of forest break up the skyline.
const land=mesh(new THREE.CylinderGeometry(220,230,13,96),mats.ground,world,v3(0,-7,0));
land.receiveShadow=true;
const beach=mesh(new THREE.CylinderGeometry(225,236,4,96),new THREE.MeshStandardMaterial({color:0xb5aa86,roughness:1}),world,v3(0,-13,0));
const water=mesh(new THREE.CircleGeometry(420,96),new THREE.MeshStandardMaterial({color:0x2d8192,roughness:.3,metalness:.15}),world,v3(0,-15.1,0));water.rotation.x=-Math.PI/2;water.receiveShadow=true;
const roadMat=mats.road;
function road(x,z,w,d){box(world,roadMat,v3(x,-.25,z),[w,.25,d]);if(w>d){for(let q=x-w/2+5;q<x+w/2-3;q+=10)box(world,new THREE.MeshStandardMaterial({color:0xb9c4b0,emissive:0x626e64,emissiveIntensity:.3}),v3(q,-.1,z),[4,.035,.16]);}else{for(let q=z-d/2+5;q<z+d/2-3;q+=10)box(world,new THREE.MeshStandardMaterial({color:0xb9c4b0}),v3(x,-.1,q),[.16,.035,4]);}}
road(0,0,290,13);road(0,0,13,280);road(-77,-8,12,150);road(74,7,12,160);road(0,-76,165,11);road(0,78,160,11);
// Sidewalks and lights make the main routes legible and usable.
for(let axis=0;axis<2;axis++)for(let q=-132;q<=132;q+=22){const x=axis?q:rand(-3,3),z=axis?rand(-3,3):q;const pole=mesh(new THREE.CylinderGeometry(.13,.2,6,8),mats.dark,world,v3(x,3,z));const arm=box(world,mats.dark,v3(x+.65,5.8,z),[1.4,.15,.15]);mesh(new THREE.SphereGeometry(.22,8,6),mats.neon,world,v3(x+1.25,5.65,z));}
function createBuilding(x,z,w,d,h,style='tower'){
 const palette=style==='factory'?[0x52616a,0x414f55,0x69757a]:style==='old'?[0x756e65,0x665d54,0x83796b]:[0x1d3440,0x294653,0x3c5960];
 const baseMat=new THREE.MeshStandardMaterial({color:pick(palette),roughness:.73,metalness:style==='tower'?.38:.12});
 const body=box(world,baseMat,v3(x,h/2,z),[w,h,d]);
 body.userData.building=true;addCollider(x,z,w*.88,d*.88,h);
 // Recessed-looking facade grid: long, narrow illuminated glazing bands, deep mullions.
 const floors=Math.max(2,Math.floor(h/3.5));const columns=Math.max(2,Math.floor(w/3.4));
 for(let f=1;f<floors;f++){const yy=f*h/floors;
  for(let col=0;col<columns;col++){
   const xx=x-w/2+(col+.5)*w/columns;const ww=Math.min(1.25,w/columns*.62);
   for(const side of [-1,1]){const zz=z+side*(d/2+.012);const win=box(world,Math.random()<.14?mats.magenta:mats.window,v3(xx,yy,zz),[ww,1.55,.055]);win.castShadow=false;}
   for(const side of [-1,1]){const xx2=x+side*(w/2+.012);const zz=z-d/2+(col+.5)*d/columns;box(world,mats.window,v3(xx2,yy,zz),[.055,1.55,Math.min(1.25,d/columns*.62)]);}
  }
  box(world,mats.dark,v3(x,yy-1.08,z),[w+.08,.13,d+.08]);
 }
 // Distinct rooftop silhouette, HVAC, antennae, and a lit signage blade.
 box(world,mats.dark,v3(x,h+.22,z),[w+.45,.45,d+.45]);
 for(let j=0;j<Math.ceil(w/8);j++){const ax=x-w/2+4+j*8;box(world,mats.concrete,v3(ax,h+.62,z),[2.2,.7,1.6]);box(world,mats.dark,v3(ax,h+1.04,z),[1.3,.16,1.1]);}
 if(style==='tower'&&h>25){const mast=mesh(new THREE.CylinderGeometry(.08,.14,h*.2,8),mats.dark,world,v3(x,h+h*.1,z));mesh(new THREE.SphereGeometry(.25,8,6),mats.magenta,world,v3(x,h+h*.2,z));}
 if(w>12&&style==='tower'){const sign=box(world,mats.neon,v3(x+w*.5+.14,h*.76,z),[.12,2.8,Math.min(d*.7,6)]);sign.material=mats.magenta;}
 if(style==='factory'){
  for(let i=0;i<3;i++){const sx=x-w*.27+i*w*.27;mesh(new THREE.CylinderGeometry(1.15,1.25,8,12),new THREE.MeshStandardMaterial({color:0x69777b,metalness:.62,roughness:.45}),world,v3(sx,h+4,z));mesh(new THREE.CylinderGeometry(1.3,1.16,.4,12),mats.dark,world,v3(sx,h+8,z));}
  for(let i=0;i<5;i++)box(world,mats.magenta,v3(x-w/2+3+i*3,2,z+d/2+.08),[1.6,.2,.08]);
 }
 if(style==='old'){for(let i=0;i<3;i++)box(world,mats.dark,v3(x-w/2-1.2,2+i*2,z+d/2),[2.4,.16,.28]);}
 return body;
}
// Downtown: tall cores and mid-rise blocks with varied proportions and color.
for(const [x,z,w,d,h] of [[-52,-49,21,22,43],[-24,-51,18,21,59],[18,-50,24,20,75],[50,-49,20,23,49],[-51,-20,22,19,55],[-23,-20,23,20,36],[23,-20,22,20,51],[51,-18,19,21,67],[-50,18,21,20,41],[-23,20,23,22,65],[22,20,20,20,40],[50,19,23,21,56],[-48,48,20,22,61],[-20,49,22,20,46],[20,48,24,22,57],[49,49,21,20,43]])createBuilding(x,z,w,d,h,'tower');
// Landmark: the Arcology crown and luminous skybridge.
const arc=box(world,new THREE.MeshStandardMaterial({color:0x162c39,metalness:.55,roughness:.4}),v3(0,43,48),[15,86,17]);addCollider(0,48,14,16,86);
for(let f=0;f<18;f++){const y=9+f*4.4;box(world,f%3===0?mats.magenta:mats.neon,v3(0,y,39.25),[10,1.25,.12]);box(world,mats.dark,v3(0,y,57),[10,1.2,.15]);}
mesh(new THREE.TorusGeometry(12,.34,8,48),mats.neon,world,v3(0,88,48),[Math.PI/2,0,0]);
// Industrial yards, warehouse shells, tanks, loading bays, pipes and cargo containers.
for(const [x,z] of [[-111,-52],[-119,5],[-102,71],[115,-61],[116,9],[106,76]]){
 createBuilding(x,z,28,25,rand(12,18),'factory');
 for(let i=0;i<4;i++){const cx=x+rand(-18,18),cz=z+rand(-17,17);const c=box(world,new THREE.MeshStandardMaterial({color:pick([0x9c5e40,0x375d71,0x9a8b48]),metalness:.35,roughness:.7}),v3(cx,1.5,cz),[rand(5,9),3,rand(3,5)]);addCollider(cx,cz,4,3,3);for(let rib=-2;rib<=2;rib++)box(world,mats.dark,v3(cx+rib,1.55,cz+2.55),[.07,2.8,.05]);}
 for(let i=0;i<3;i++){const px=x+rand(-15,15);mesh(new THREE.CylinderGeometry(2.4,2.4,8,16),new THREE.MeshStandardMaterial({color:0x64777a,metalness:.6,roughness:.4}),world,v3(px,4,z+18));}
}
// Residential fringe and small structures make the edge of town explorable.
for(let i=0;i<22;i++){let x=rand(-160,160),z=rand(-160,160);if(Math.abs(x)<85&&Math.abs(z)<85)continue;if(x*x+z*z>34000)continue;createBuilding(x,z,rand(9,15),rand(9,15),rand(7,14),Math.random()<.5?'old':'tower');}
// Walkable ramps/steps on a selection of low structures and rooftop access ladders.
for(const c of colliders.filter(c=>c.top<18).slice(0,14)){
 const stairMat=new THREE.MeshStandardMaterial({color:0x62747a,metalness:.35,roughness:.65});
 for(let i=0;i<8;i++){const rise=(i+1)*.52;box(world,stairMat,v3(c.x-c.w*.25+i*.55,rise,c.z+c.d*.5+1.5+i*.62),[.7,.16,1.3]);}
}
// Ridges and pine forests. Foliage uses tapered silhouettes rather than primitive block trees.
for(let i=0;i<13;i++){const a=i/13*Math.PI*2,r=178+rand(-10,14),x=Math.cos(a)*r,z=Math.sin(a)*r,h=rand(16,35);const hill=mesh(new THREE.ConeGeometry(rand(14,22),h,9),new THREE.MeshStandardMaterial({color:pick([0x506b55,0x66765a,0x495f53]),roughness:1}),world,v3(x,h/2-1,z));hill.receiveShadow=true;}
function tree(x,z,scale=1){const group=new THREE.Group();group.position.set(x,0,z);group.scale.setScalar(scale);world.add(group);mesh(new THREE.CylinderGeometry(.25,.55,4,7),mats.trunk,group,v3(0,2,0));for(let i=0;i<4;i++){const crown=mesh(new THREE.ConeGeometry(2.6-i*.32,4.4,7),new THREE.MeshStandardMaterial({color:pick([0x24493e,0x315d48,0x3b644d]),roughness:1}),group,v3(0,4.1+i*1.9,0));crown.castShadow=true;} }
for(let i=0;i<190;i++){const a=rand(0,Math.PI*2),r=rand(112,203),x=Math.cos(a)*r,z=Math.sin(a)*r;if(x*x+z*z>43500)continue;if(Math.abs(x)<123&&Math.abs(z)<115)continue;tree(x,z,rand(.65,1.3));}
// Three named landmarks and a handful of lighted billboards.
function billboard(x,y,z,textColor=0xff4bcb){const frame=box(world,mats.dark,v3(x,y,z),[.3,6,9]);box(world,new THREE.MeshStandardMaterial({color:textColor,emissive:textColor,emissiveIntensity:1.3}),v3(x-.18,y,z),[.08,4.7,7.6]);for(let i=0;i<4;i++)box(world,mats.dark,v3(x-.24,y-1.5+i, z),[.1,.12,4.8]);}
billboard(-34,22,-70);billboard(69,29,6,0x40f5da);billboard(99,9,92,0xffb93f);
// Airship in the distance gives the deployment scene a moving focal point.
const ship=new THREE.Group();scene.add(ship);ship.position.set(-125,91,-155);
mesh(new THREE.SphereGeometry(12,20,12),new THREE.MeshStandardMaterial({color:0x364952,metalness:.62,roughness:.4}),ship,v3(0,0,0));
mesh(new THREE.CylinderGeometry(2,2,25,12),mats.dark,ship,v3(0,-3,0),[0,0,Math.PI/2]);
for(let i=0;i<4;i++)mesh(new THREE.SphereGeometry(.45,8,6),mats.magenta,ship,v3(-7+i*4,-1,0));

// Articulated operator: layered, recognizable sci-fi armor and a real shoulder-held rifle.
function makeOperator(isBot=false){
 const root=new THREE.Group();const rig=new THREE.Group();root.add(rig);
 const suit=new THREE.MeshStandardMaterial({color:isBot?pick([0xc45142,0x52917c,0x8170ae,0xc28b46]):0x273b48,roughness:.45,metalness:.32});
 const armor=new THREE.MeshStandardMaterial({color:isBot?0x263640:0x3d5862,roughness:.35,metalness:.5});
 const accent=new THREE.MeshStandardMaterial({color:isBot?0xff755e:0x4ef4dc,emissive:isBot?0x67271b:0x0d6258,emissiveIntensity:.7,metalness:.25});
 const skin=new THREE.MeshStandardMaterial({color:isBot?0x927966:0xb5896e,roughness:.65});
 const torso=mesh(new THREE.CapsuleGeometry(.43,.75,5,9),suit,rig,v3(0,1.55,0));torso.scale.set(1,1,.72);
 const chest=mesh(new THREE.BoxGeometry(.61,.49,.2),armor,rig,v3(0,1.7,-.31));
 for(let side of [-1,1]){mesh(new THREE.SphereGeometry(.25,9,8),armor,rig,v3(side*.48,1.91,0));mesh(new THREE.BoxGeometry(.13,.38,.16),accent,rig,v3(side*.27,1.72,-.423));}
 const pack=mesh(new THREE.BoxGeometry(.52,.67,.28),mats.dark,rig,v3(0,1.63,.32));
 mesh(new THREE.SphereGeometry(.3,12,10),skin,rig,v3(0,2.3,-.01));
 const helmet=mesh(new THREE.SphereGeometry(.33,12,9,0,Math.PI*2,0,Math.PI*.57),armor,rig,v3(0,2.4,0));
 const visor=mesh(new THREE.BoxGeometry(.43,.13,.4),new THREE.MeshStandardMaterial({color:0x68fff0,emissive:0x239c9b,emissiveIntensity:1.4,metalness:.6,roughness:.12}),rig,v3(0,2.43,-.25));
 const limbs=[];
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.22,1.08,0);rig.add(leg);mesh(new THREE.CapsuleGeometry(.15,.55,4,7),suit,leg,v3(0,-.34,0));mesh(new THREE.BoxGeometry(.3,.18,.48),mats.dark,leg,v3(0,-.74,-.08));limbs.push(leg);
  const arm=new THREE.Group();arm.position.set(side*.53,1.93,-.02);rig.add(arm);mesh(new THREE.CapsuleGeometry(.13,.44,4,7),suit,arm,v3(0,-.3,0));mesh(new THREE.SphereGeometry(.15,8,7),armor,arm,v3(0,-.62,-.09));limbs.push(arm);
 }
 // Detailed, recognizable carbine: receiver, barrel, optic, stock, grip, magazine, rails.
 const gun=new THREE.Group();rig.add(gun);gun.position.set(.35,1.64,-.67);gun.rotation.y=.03;
 const gunMetal=new THREE.MeshStandardMaterial({color:0x273841,metalness:.72,roughness:.31});
 mesh(new THREE.BoxGeometry(.19,.16,.62),gunMetal,gun,v3(0,0,0));mesh(new THREE.CylinderGeometry(.035,.035,.48,8),gunMetal,gun,v3(0,.015,-.49),[Math.PI/2,0,0]);
 mesh(new THREE.BoxGeometry(.2,.07,.29),armor,gun,v3(0,.105,.2));mesh(new THREE.BoxGeometry(.16,.27,.12),mats.dark,gun,v3(0,-.2,.07),[-.22,0,0]);
 mesh(new THREE.BoxGeometry(.1,.17,.13),gunMetal,gun,v3(0,-.13,-.04));mesh(new THREE.BoxGeometry(.1,.12,.17),mats.dark,gun,v3(0,.12,-.11));
 mesh(new THREE.BoxGeometry(.24,.025,.5),accent,gun,v3(0,.115,-.13));
 const muzzle=mesh(new THREE.SphereGeometry(.1,8,6),new THREE.MeshBasicMaterial({color:0xffcf70}),gun,v3(0,0,-.77));muzzle.visible=false;
 root.userData={rig,limbs,gun,muzzle,visor,health:100,isBot};return root;
}
const player=makeOperator(false);scene.add(player);player.position.set(0,32,115);
const playerState={health:100,shield:50,kills:0,ammo:30,reserve:120,weapon:'ASSAULT RIFLE',rarity:'COMMON',reloading:false,landed:false,drop:3.4,alive:true,aim:false,sprinting:false,crouch:false,slide:0,velocity:v3(),yaw:0,pitch:-.08,groundY:0,lastShot:0,matchStarted:0};
const keys={};let pointer=false,paused=false,gameStarted=false,muted=false;

function rarityColor(r){return ({COMMON:0xd8e1de,UNCOMMON:0x63e879,RARE:0x50caff,EPIC:0xc579ff,LEGENDARY:0xffc64a})[r]||0xffffff;}
function createLoot(x,z,type='weapon',rarity=pick(['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'])){
 const group=new THREE.Group();group.position.set(x,.8,z);group.userData={type,rarity,claimed:false};world.add(group);
 const color=rarityColor(rarity);const glowMat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.7,metalness:.2,roughness:.3});
 mesh(new THREE.OctahedronGeometry(.38,1),glowMat,group,v3(0,.35,0));mesh(new THREE.CylinderGeometry(.45,.45,.06,16),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65}),group,v3(0,.02,0));
 mesh(new THREE.BoxGeometry(.38,.09,.75),new THREE.MeshStandardMaterial({color:0x27363b,metalness:.65,roughness:.35}),group,v3(0,-.19,0));
 group.userData.label=type==='weapon'?`${rarity} ${pick(['BURST RIFLE','SMG','PUMP SHOTGUN','SCOUT RIFLE'])}`:type==='heal'?'MED KIT':type==='shield'?'SHIELD CELL':'AMMO';
 loot.push(group);return group;
}
for(let i=0;i<90;i++){
 let x,z;let attempts=0;do{x=rand(-145,145);z=rand(-145,145);attempts++;}while(attempts<30&&colliders.some(c=>Math.abs(x-c.x)<c.w*.52&&Math.abs(z-c.z)<c.d*.52));
 const roll=Math.random();createLoot(x,z,roll<.58?'weapon':roll<.73?'ammo':roll<.87?'shield':'heal');
}
// Random rooftop caches / hidden stash points.
for(const c of colliders.filter(c=>c.top>25).slice(0,11))createLoot(c.x+rand(-c.w*.25,c.w*.25),c.z+rand(-c.d*.25,c.d*.25),'weapon',pick(['RARE','EPIC','LEGENDARY']));

// Bot roster: 24 rival operators drop in and hunt, seek nearby loot, and shoot with readable tracers.
for(let i=0;i<24;i++){
 const bot=makeOperator(true);const a=rand(0,Math.PI*2),r=rand(35,145);bot.position.set(Math.cos(a)*r,24+rand(0,20),Math.sin(a)*r);bot.rotation.y=rand(0,Math.PI*2);scene.add(bot);
 bot.userData.health=100;bot.userData.alive=true;bot.userData.target=v3(bot.position.x,0,bot.position.z);bot.userData.cooldown=rand(.5,3);bot.userData.speed=rand(2.0,3.4);bot.userData.phase=rand(0,8);bot.userData.name=pick(['NOVA','KITE','RIFT','ECHO','VEX','MICA','ASH','JUNO','VOLT','ONYX','FLUX','ROOK']);bots.push(bot);
}
const aliveStart=bots.length+1;
// Storm wall and minimap ring. Its actual boundary is reflected in the HUD/map.
const stormMat=new THREE.MeshBasicMaterial({color:0x52efff,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false});
const storm=mesh(new THREE.CylinderGeometry(1,1,100,128,1,true),stormMat,scene,v3(0,44,0));
const stormEdge=mesh(new THREE.TorusGeometry(1,.8,4,128),new THREE.MeshBasicMaterial({color:0x47eaff,transparent:true,opacity:.76}),scene,v3(0,1,0),[Math.PI/2,0,0]);
let stormRadius=178,stormTimer=120,stormPhase=0;

// Camera follows the player; mouse yaw/pitch are smoothed independently for an over-shoulder view.
let desiredYaw=0,desiredPitch=-.08,cameraYaw=0,cameraPitch=-.08,cameraZoom=6.7;
function updateCamera(dt){
 cameraYaw=lerp(cameraYaw,desiredYaw,1-Math.exp(-dt*12));cameraPitch=lerp(cameraPitch,desiredPitch,1-Math.exp(-dt*12));
 const aimed=playerState.aim;const dist=aimed?4.1:(playerState.crouch?5.4:6.7);cameraZoom=lerp(cameraZoom,dist,1-Math.exp(-dt*7));
 const target=v3(player.position.x,player.position.y+(playerState.crouch?1.35:2.0),player.position.z);
 const forward=v3(Math.sin(cameraYaw),0,-Math.cos(cameraYaw));
 const side=v3(Math.cos(cameraYaw),0,Math.sin(cameraYaw));
 const desired=target.clone().addScaledVector(forward,-cameraZoom).addScaledVector(side,aimed?.72:.58);desired.y+=1.05+cameraPitch*5;
 camera.position.lerp(desired,1-Math.exp(-dt*10));camera.lookAt(target.clone().addScaledVector(forward,aimed?1.2:1.8).add(v3(0,.38+cameraPitch*1.5,0)));
 camera.fov=lerp(camera.fov,aimed?55:67,1-Math.exp(-dt*8));camera.updateProjectionMatrix();
 player.rotation.y=lerpAngle(player.rotation.y,desiredYaw,1-Math.exp(-dt*10));
}
function lerpAngle(a,b,t){let d=(b-a+Math.PI)%(Math.PI*2)-Math.PI;return a+d*t;}
function blocked(x,z,r=.48){return colliders.some(c=>Math.abs(x-c.x)<c.w/2+r&&Math.abs(z-c.z)<c.d/2+r);}
function moveActor(actor,dx,dz,r=.45){let x=actor.position.x+dx,z=actor.position.z;if(!blocked(x,z,r))actor.position.x=x;else if(!blocked(actor.position.x+dx,z-r*.6)&&!blocked(actor.position.x+dx,z+r*.6))actor.position.x+=dx;
 x=actor.position.x;z=actor.position.z+dz;if(!blocked(x,z,r))actor.position.z=z;else if(!blocked(x-r*.6,actor.position.z+dz)&&!blocked(x+r*.6,actor.position.z+dz))actor.position.z+=dz;
}
function groundHeight(x,z){let y=0;for(const c of colliders)if(Math.abs(x-c.x)<c.w*.48&&Math.abs(z-c.z)<c.d*.48)y=Math.max(y,c.top);return y;}
function updatePlayer(dt,t){
 if(!playerState.alive)return;
 const f=v3(Math.sin(desiredYaw),0,-Math.cos(desiredYaw)),s=v3(Math.cos(desiredYaw),0,Math.sin(desiredYaw));
 let dir=v3();if(keys.KeyW)dir.add(f);if(keys.KeyS)dir.sub(f);if(keys.KeyD)dir.add(s);if(keys.KeyA)dir.sub(s);if(dir.lengthSq()>0)dir.normalize();
 playerState.sprinting=!!keys.ShiftLeft&&!playerState.aim&&dir.lengthSq()>0;playerState.crouch=!!keys.KeyC;
 if(keys.Space&&player.position.y<=playerState.groundY+.06)playerState.velocity.y=playerState.landed?7.4:0;
 if(playerState.slide>0)playerState.slide-=dt;
 if(playerState.sprinting&&keys.KeyC&&playerState.landed)playerState.slide=.65;
 const speed=playerState.slide>0?10:playerState.sprinting?8.3:playerState.crouch?2.1:5.1;
 moveActor(player,dir.x*speed*dt,dir.z*speed*dt,.5);
 const targetGround=groundHeight(player.position.x,player.position.z);playerState.groundY=targetGround;
 if(!playerState.landed||player.position.y>targetGround+.05){playerState.velocity.y-=17*dt;player.position.y+=playerState.velocity.y*dt;if(player.position.y<=targetGround){player.position.y=targetGround;playerState.velocity.y=0;playerState.landed=true;}}
 player.userData.rig.position.y=playerState.crouch||playerState.slide>0?-.38:0;
 const moving=dir.lengthSq()>.01,runPhase=t*(playerState.sprinting?12:7);
 player.userData.limbs[0].rotation.x=moving?Math.sin(runPhase)*.75:lerp(player.userData.limbs[0].rotation.x,0,dt*8);
 player.userData.limbs[2].rotation.x=moving?Math.sin(runPhase+Math.PI)*.75:lerp(player.userData.limbs[2].rotation.x,0,dt*8);
 player.userData.limbs[1].rotation.x=moving?-.2:0;player.userData.limbs[3].rotation.x=moving?.12:0;
 if(playerState.drop>0){playerState.drop-=dt;document.querySelector('#drop-timer').textContent=String(Math.max(0,Math.ceil(playerState.drop)).toString().padStart(2,'0'));if(playerState.drop<=0)document.querySelector('#drop-banner').classList.add('hidden');}
}

// Hit feedback, damage, loot pickups, and elimination notifications.
let audioCtx=null;
function sound(freq=180,duration=.08,type='square',volume=.035){if(muted)return;try{audioCtx??=new AudioContext();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch{}}
function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2100);}
function feed(msg){const e=document.createElement('div');e.className='feed-item';e.innerHTML=msg;const box=document.querySelector('#feed');box.prepend(e);setTimeout(()=>e.remove(),5200);}
function hitFlash(){const el=document.querySelector('#hit-marker');el.classList.add('show');setTimeout(()=>el.classList.remove('show'),160);}
function damagePlayer(amount,source='ENEMY FIRE'){
 if(!playerState.alive)return;let left=amount;if(playerState.shield>0){const absorbed=Math.min(playerState.shield,left);playerState.shield-=absorbed;left-=absorbed;}playerState.health=Math.max(0,playerState.health-left);
 document.querySelector('#damage-vignette').classList.add('show');setTimeout(()=>document.querySelector('#damage-vignette').classList.remove('show'),180);
 sound(95,.12,'sawtooth',.045);updateHUD();if(playerState.health<=0)endMatch(false,source);
}
function eliminateBot(bot,byPlayer=false){if(!bot.userData.alive)return;bot.userData.alive=false;scene.remove(bot);if(byPlayer){playerState.kills++;feed(`<span>YOU</span> ELIMINATED ${bot.userData.name}`);sound(620,.12,'triangle',.05);if(Math.random()<.65)createLoot(bot.position.x,bot.position.z,Math.random()<.5?'ammo':'shield');}else feed(`<span>${bot.userData.name}</span> WAS ELIMINATED`);updateHUD();checkWin();}
function checkWin(){if(bots.filter(b=>b.userData.alive).length===0&&playerState.alive)endMatch(true);}
function endMatch(won,reason=''){if(!playerState.alive&&document.querySelector('#result-screen').classList.contains('hidden')===false)return;playerState.alive=false;paused=true;pointer=false;document.exitPointerLock?.();document.querySelector('#hud').classList.add('hidden');const panel=document.querySelector('#result-screen');panel.classList.remove('hidden');document.querySelector('#result-title').innerHTML=won?'LAST ONE<br><span>STANDING.</span>':'BETTER<br><span>LUCK NEXT TIME.</span>';document.querySelector('#result-title').style.setProperty('--result-color',won?'#d5ff3f':'#ff8262');document.querySelector('#result-copy').textContent=won?'The island is yours. For now.':reason==='STORM'?'The storm claimed you. The island always gets another shot.':'The island always gets another shot.';document.querySelector('#result-eyebrow').textContent=won?'VICTORY / SECTOR 07':'MATCH COMPLETE / SECTOR 07';document.querySelector('#result-kills').textContent=String(playerState.kills).padStart(2,'0');const left=bots.filter(b=>b.userData.alive).length+1;document.querySelector('#result-place').textContent=won?'#1':`#${Math.min(aliveStart,Math.max(2,left+1))}`;const sec=Math.floor((performance.now()/1000-playerState.matchStarted));document.querySelector('#result-time').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
function makeTracer(from,to,color=0xffc879){const g=new THREE.BufferGeometry().setFromPoints([from,to]);const line=new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}));scene.add(line);tracers.push({line,life:.09});}
function muzzleEffect(){const muzzle=player.userData.muzzle;muzzle.visible=true;setTimeout(()=>muzzle.visible=false,55);const flash=new THREE.PointLight(0xffbd68,4,8);flash.position.copy(player.localToWorld(v3(.35,1.65,-1.25)));scene.add(flash);setTimeout(()=>scene.remove(flash),55);}
function shoot(){if(!gameStarted||paused||!playerState.alive||playerState.reloading||playerState.drop>0)return;const now=performance.now();if(now-playerState.lastShot<135)return;if(playerState.ammo<=0){sound(110,.05,'square',.018);toast('MAG EMPTY — PRESS R TO RELOAD');return;}playerState.lastShot=now;playerState.ammo--;muzzleEffect();sound(130+Math.random()*40,.075,'sawtooth',.028);player.userData.gun.position.z=-.62;setTimeout(()=>{player.userData.gun.position.z=-.67;},45);
 const origin=camera.position.clone();const direction=new THREE.Vector3();camera.getWorldDirection(direction);direction.x+=(Math.random()-.5)*(playerState.aim?.008:.025);direction.y+=(Math.random()-.5)*(playerState.aim?.008:.025);raycaster.set(origin,direction.normalize());raycaster.far=155;
 const targets=bots.filter(b=>b.userData.alive).map(b=>b.userData.rig);const hits=raycaster.intersectObjects([...targets,...destructibles],true);
 if(hits.length){const hit=hits[0];const victim=bots.find(b=>b.userData.alive&&hit.object.parent?.parent===b.userData.rig||b.userData.alive&&isDescendant(hit.object,b.userData.rig));if(victim){const dmg=playerState.aim?34:25;victim.userData.health-=dmg;hitFlash();makeTracer(origin,hit.point,0x65fff0);if(victim.userData.health<=0)eliminateBot(victim,true);}else{spark(hit.point);}}
 else makeTracer(origin,origin.clone().addScaledVector(direction,120),0xffcf78);
 updateHUD();}
function isDescendant(obj,parent){let p=obj;while(p){if(p===parent)return true;p=p.parent;}return false;}
function spark(p){for(let i=0;i<4;i++){const m=mesh(new THREE.SphereGeometry(.045,5,4),new THREE.MeshBasicMaterial({color:0xffce70}),scene,p.clone());particles.push({mesh:m,life:.2,vel:v3(rand(-3,3),rand(1,5),rand(-3,3))});}}
function reload(){if(playerState.reloading||playerState.ammo>=30||playerState.reserve<=0)return;playerState.reloading=true;document.querySelector('#reload-indicator').classList.remove('hidden');document.querySelector('#reload-state').textContent='RELOADING';sound(390,.05,'triangle',.02);const start=performance.now();const tick=()=>{if(!playerState.reloading)return;const p=Math.min(1,(performance.now()-start)/1650);document.querySelector('#reload-progress').style.width=`${p*100}%`;if(p<1)requestAnimationFrame(tick);else{const needed=30-playerState.ammo,load=Math.min(needed,playerState.reserve);playerState.ammo+=load;playerState.reserve-=load;playerState.reloading=false;document.querySelector('#reload-indicator').classList.add('hidden');document.querySelector('#reload-state').textContent='FULL AUTO';sound(560,.07,'triangle',.025);updateHUD();}};tick();}
function nearestLoot(){let best=null,dist=2.7;for(const item of loot){if(item.userData.claimed)continue;const d=player.position.distanceTo(item.position);if(d<dist){best=item;dist=d;}}return best;}
function collect(item){if(!item||item.userData.claimed)return;item.userData.claimed=true;world.remove(item);const type=item.userData.type;if(type==='weapon'){playerState.weapon=item.userData.label.split(' ').slice(1).join(' ');playerState.rarity=item.userData.rarity;playerState.ammo=Math.min(30,playerState.ammo+8);playerState.reserve+=24;}else if(type==='ammo')playerState.reserve+=36;else if(type==='shield')playerState.shield=Math.min(100,playerState.shield+35);else if(type==='heal')playerState.health=Math.min(100,playerState.health+35);sound(720,.09,'sine',.04);toast(`PICKED UP ${item.userData.label}`);updateHUD();}

function updateBots(dt,t){const living=bots.filter(b=>b.userData.alive);for(const bot of living){const u=bot.userData;u.phase+=dt;u.cooldown-=dt;
 if(bot.position.y>groundHeight(bot.position.x,bot.position.z)){bot.position.y=Math.max(groundHeight(bot.position.x,bot.position.z),bot.position.y-14*dt);}
 const distance=bot.position.distanceTo(player.position);let target=null;
 if(playerState.alive&&distance<63)target=player.position;
 else if(stormRadius<90&&Math.hypot(bot.position.x,bot.position.z)>stormRadius*.72)target=v3(bot.position.x*.5,0,bot.position.z*.5);
 else if(bot.position.distanceTo(u.target)<4||Math.random()<.004){const a=rand(0,Math.PI*2),r=rand(18,70);u.target.set(Math.cos(a)*r,0,Math.sin(a)*r);}
 else target=u.target;
 if(target){const delta=v3(target.x-bot.position.x,0,target.z-bot.position.z);const len=delta.length();if(len>0.1){const pace=distance<12?u.speed*.3:u.speed;delta.normalize();moveActor(bot,delta.x*pace*dt,delta.z*pace*dt,.42);bot.rotation.y=Math.atan2(delta.x,-delta.z);bot.userData.limbs[0].rotation.x=Math.sin(t*8+u.phase)*.42;bot.userData.limbs[2].rotation.x=Math.sin(t*8+u.phase+Math.PI)*.42;}}
 if(playerState.alive&&distance<55&&distance>4&&u.cooldown<=0){u.cooldown=rand(.75,1.8);const aimFactor=distance<20?.17:.09;if(Math.random()<aimFactor){const from=bot.position.clone().add(v3(0,1.7,0)),to=player.position.clone().add(v3(0,1.4,0));makeTracer(from,to,0xff734e);damagePlayer(rand(5,10),u.name);}}
 if(Math.hypot(bot.position.x,bot.position.z)>stormRadius&&stormPhase>0&&Math.random()<dt*.55){u.health-=5;if(u.health<=0)eliminateBot(bot,false);}
 }}
function updateStorm(dt){stormTimer-=dt;if(stormTimer<=0){stormPhase++;stormTimer=stormPhase===1?70:stormPhase===2?55:40;stormRadius=Math.max(24,stormRadius-48);toast('STORM SURGE — MOVE TO THE SAFE ZONE');sound(80,.6,'sawtooth',.04);}
 if(stormPhase>0&&Math.hypot(player.position.x,player.position.z)>stormRadius&&Math.random()<dt*.7)damagePlayer(4,'STORM');
 storm.scale.set(stormRadius,1,stormRadius);stormEdge.scale.set(stormRadius,stormRadius,stormRadius);stormEdge.position.set(0,.7,0);storm.rotation.y+=dt*.04;
 const mins=Math.floor(Math.max(0,stormTimer)/60),secs=Math.floor(Math.max(0,stormTimer)%60);document.querySelector('#storm-clock').textContent=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
 document.querySelector('#zone-label').textContent=stormPhase?'STORM CLOSING':'SAFE ZONE';document.querySelector('#zone-label').style.color=stormPhase?'#ff8b67':'#e5f0ec';}
function updateLoot(dt,t){for(const item of loot){if(item.userData.claimed)continue;item.rotation.y+=dt*.65;item.position.y=.78+Math.sin(t*2+item.position.x)*.16;}}
function updateParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.mesh.position.addScaledVector(p.vel,dt);p.vel.y-=9*dt;if(p.life<=0){scene.remove(p.mesh);particles.splice(i,1);}}
 for(let i=tracers.length-1;i>=0;i--){tracers[i].life-=dt;if(tracers[i].life<=0){scene.remove(tracers[i].line);tracers.splice(i,1);}}}
function updateHUD(){document.querySelector('#health-fill').style.width=`${playerState.health}%`;document.querySelector('#shield-fill').style.width=`${playerState.shield}%`;document.querySelector('#health-value').textContent=Math.ceil(playerState.health);document.querySelector('#shield-value').textContent=Math.ceil(playerState.shield);document.querySelector('#ammo-current').textContent=playerState.ammo;document.querySelector('#ammo-reserve').textContent=playerState.reserve;document.querySelector('#kill-count').textContent=playerState.kills;document.querySelector('#alive-count').textContent=bots.filter(b=>b.userData.alive).length+(playerState.alive?1:0);document.querySelector('#weapon-type').textContent=playerState.weapon;document.querySelector('#weapon-rarity').textContent=playerState.rarity;document.querySelector('#weapon-rarity').style.color=`#${rarityColor(playerState.rarity).toString(16).padStart(6,'0')}`;}
function drawMinimap(){const c=document.querySelector('#minimap'),ctx=c.getContext('2d'),w=c.width,h=c.height,scale=w/400;ctx.clearRect(0,0,w,h);ctx.fillStyle='#193d47';ctx.fillRect(0,0,w,h);ctx.fillStyle='#627361';ctx.beginPath();ctx.arc(w/2,h/2,Math.min(w,h)*.47,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(w/2,h/2);ctx.scale(scale,scale);
 ctx.fillStyle='#273d46';for(const c of colliders){ctx.fillRect(c.x-c.w/2,c.z-c.d/2,c.w,c.d);}ctx.strokeStyle='#bac8b5';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-145,0);ctx.lineTo(145,0);ctx.moveTo(0,-140);ctx.lineTo(0,140);ctx.stroke();
 ctx.strokeStyle='#5deaff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,stormRadius,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ecfff8';for(const b of bots){if(!b.userData.alive)continue;ctx.fillRect(b.position.x-1.4,b.position.z-1.4,2.8,2.8);}ctx.fillStyle='#d5ff3f';ctx.beginPath();ctx.arc(player.position.x,player.position.z,4,0,Math.PI*2);ctx.fill();ctx.restore();}

function gameLoop(){requestAnimationFrame(gameLoop);const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;if(gameStarted&&!paused){updatePlayer(dt,t);updateBots(dt,t);updateStorm(dt);updateLoot(dt,t);updateCamera(dt);if(Math.floor(t*4)%4===0)drawMinimap();const near=nearestLoot();const prompt=document.querySelector('#pickup-prompt');if(near&&playerState.drop<=0){prompt.classList.remove('hidden');document.querySelector('#pickup-name').textContent=near.userData.label;}else prompt.classList.add('hidden');
 // Scene height-aware backdrop and time-of-day color shifts.
 ship.position.x=Math.sin(t*.035)*135-30;ship.position.z=Math.cos(t*.035)*145;ship.rotation.y=t*.04;
 }else if(!gameStarted){camera.position.lerp(v3(94,57,177),.004);camera.lookAt(v3(0,17,0));ship.position.x=Math.sin(t*.035)*135-30;ship.position.z=Math.cos(t*.035)*145;ship.rotation.y=t*.04;}
 updateParticles(dt);renderer.render(scene,camera);}

function startGame(){document.querySelector('#menu-screen').classList.add('hidden');document.querySelector('#operator-screen').classList.add('hidden');document.querySelector('#result-screen').classList.add('hidden');document.querySelector('#hud').classList.remove('hidden');gameStarted=true;paused=false;playerState.alive=true;playerState.health=100;playerState.shield=50;playerState.ammo=30;playerState.reserve=120;playerState.kills=0;playerState.drop=3.4;playerState.landed=false;playerState.velocity.set(0,0,0);player.position.set(rand(-18,18),43,rand(92,130));playerState.matchStarted=performance.now()/1000;stormRadius=178;stormPhase=0;stormTimer=120;
 for(const b of bots){b.userData.alive=true;b.userData.health=100;const a=rand(0,Math.PI*2),r=rand(32,150);b.position.set(Math.cos(a)*r,rand(25,43),Math.sin(a)*r);scene.add(b);b.userData.cooldown=rand(1,4);}
 for(const l of loot){l.userData.claimed=false;world.add(l);}updateHUD();drawMinimap();renderer.domElement.requestPointerLock?.();toast('DROP IN — YOU ARE NOT ALONE');}
function pauseGame(){if(!gameStarted||!playerState.alive)return;paused=true;document.querySelector('#pause-screen').classList.remove('hidden');document.exitPointerLock?.();}
function resumeGame(){document.querySelector('#pause-screen').classList.add('hidden');paused=false;renderer.domElement.requestPointerLock?.();}

// Inputs; canvas click captures pointer and a lost pointer lock opens a small resume affordance.
document.querySelector('#play-button').addEventListener('click',startGame);
document.querySelector('#again-button').addEventListener('click',startGame);
document.querySelector('#loadout-button').addEventListener('click',()=>document.querySelector('#operator-screen').classList.remove('hidden'));
document.querySelector('#operator-close').addEventListener('click',()=>document.querySelector('#operator-screen').classList.add('hidden'));
document.querySelector('#pause-button').addEventListener('click',pauseGame);
document.querySelector('#resume-button').addEventListener('click',resumeGame);
document.querySelector('#resume-action').addEventListener('click',resumeGame);
document.querySelector('#sound-toggle').addEventListener('click',e=>{muted=!muted;e.currentTarget.querySelector('span').textContent=muted?'SOUND OFF':'SOUND ON';});
renderer.domElement.addEventListener('click',()=>{if(gameStarted&&!paused&&playerState.alive&&!pointer)renderer.domElement.requestPointerLock?.();});
document.addEventListener('pointerlockchange',()=>{pointer=document.pointerLockElement===renderer.domElement;const over=document.querySelector('#interaction-overlay');if(gameStarted&&!paused&&playerState.alive&&!pointer)over.classList.remove('hidden');else over.classList.add('hidden');});
document.querySelector('#interaction-overlay').addEventListener('click',()=>renderer.domElement.requestPointerLock?.());
document.addEventListener('mousemove',e=>{if(!pointer)return;desiredYaw-=e.movementX*.00235;desiredPitch=clamp(desiredPitch-e.movementY*.0019,-.58,.42);});
document.addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if(!document.querySelector('#operator-screen').classList.contains('hidden'))document.querySelector('#operator-screen').classList.add('hidden');else if(gameStarted&&!paused)pauseGame();else if(paused)resumeGame();}if(e.code==='KeyR')reload();if(e.code==='KeyE'){const item=nearestLoot();if(item)collect(item);}if(/^Digit[1-5]$/.test(e.code)){document.querySelectorAll('.inventory-slot').forEach(x=>x.classList.toggle('active',Number(x.dataset.slot)===Number(e.code.slice(-1))-1));}});
document.addEventListener('keyup',e=>keys[e.code]=false);
document.addEventListener('mousedown',e=>{if(e.button===0)shoot();if(e.button===2){playerState.aim=true;}});document.addEventListener('mouseup',e=>{if(e.button===2)playerState.aim=false;});document.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));});
updateHUD();gameLoop();
