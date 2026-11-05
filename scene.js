import * as T from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

// Every object belongs to this one little square of the world.
const scene = new T.Scene();
const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.setClearColor(0x111923, 0);
renderer.domElement.setAttribute('aria-label', '雨夜便利店三维微缩景观。拖动旋转，滚轮或双指缩放，右键拖动平移。');
document.body.appendChild(renderer.domElement);

const camera = new T.PerspectiveCamera(33, innerWidth / innerHeight, .1, 150);
camera.position.set(17.2, 13.4, 24);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.25, 0);
controls.enableDamping = true; controls.dampingFactor = .055;
controls.minDistance = 12; controls.maxDistance = 48;
controls.minPolarAngle = .22; controls.maxPolarAngle = Math.PI / 2.05;
controls.enablePan = true; controls.panSpeed = .55;
controls.zoomSpeed = .65; controls.rotateSpeed = .6;
controls.mouseButtons = { LEFT: T.MOUSE.ROTATE, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.PAN };
controls.touches = { ONE: T.TOUCH.ROTATE, TWO: T.TOUCH.DOLLY_PAN };
const world = new T.Group(); scene.add(world);
const parts = []; const productBatches = new Map();
let seed = 61503;
function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const C = { asphalt: '#253b47', curb: '#72858a', concrete: '#adb3ab', wall: '#b6b9a2', dark: '#203943', metal: '#56747b', cream: '#ede6c8', green: '#73bdac', coral: '#ee7867', yellow: '#f7d58c' };
const ramp = new T.DataTexture(new Uint8Array([90, 143, 195, 225, 255]), 5, 1, T.RedFormat);
ramp.minFilter = T.NearestFilter; ramp.magFilter = T.NearestFilter; ramp.needsUpdate = true;
const mats = new Map();
function mat(color, glow = 0, transparent = false) {
  const k = color + ':' + glow + ':' + transparent;
  if (!mats.has(k)) mats.set(k, new T.MeshToonMaterial({color, gradientMap:ramp, emissive:color, emissiveIntensity:glow, transparent, opacity:transparent ? .18 : 1}));
  return mats.get(k);
}
const outlineMat = new T.LineBasicMaterial({color:0x152832,transparent:true,opacity:.56});
const boxGeo = new T.BoxGeometry(1,1,1);
function box(parent,x,y,z,w,h,d,color,edge=false,glow=0) {
  const mesh = new T.Mesh(boxGeo, typeof color === 'string' ? mat(color,glow) : color);
  mesh.position.set(x,y,z); mesh.scale.set(w,h,d); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  if(edge){const e = new T.LineSegments(new T.EdgesGeometry(boxGeo),outlineMat); mesh.add(e);}
  return mesh;
}
function cyl(parent,x,y,z,r,h,color,r2=r,segments=16){
  const m = new T.Mesh(new T.CylinderGeometry(r2,r,h,segments),typeof color==='string'?mat(color):color); m.position.set(x,y,z); parent.add(m); m.castShadow=true; m.receiveShadow=true; return m;
}
function sphere(parent,x,y,z,r,color){const m=new T.Mesh(new T.SphereGeometry(r,12,8),mat(color));m.position.set(x,y,z);parent.add(m);return m;}
function rod(parent,a,b,r,color){const v1=new T.Vector3(...a),v2=new T.Vector3(...b),delta=v2.clone().sub(v1);const m=cyl(parent,...v1.clone().add(v2).multiplyScalar(.5).toArray(),r,delta.length(),color);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
function wire(parent, points, color, radius=.022){const curve = new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))); const mesh=new T.Mesh(new T.TubeGeometry(curve,48,radius,6,false),mat(color));parent.add(mesh);return mesh;}
function group(x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);return g;}
function piece(g, delay, lift=4, turn=0){world.add(g);parts.push({g,delay,position:g.position.clone(),lift,turn});return g;}
function plane(parent,x,y,z,w,h,material,rotX=0,rotY=0){const m=new T.Mesh(new T.PlaneGeometry(w,h),material);m.position.set(x,y,z);m.rotation.set(rotX,rotY,0);parent.add(m);return m;}
function textTexture(lines, {width=1024,height=256,bg='transparent',color='#fff6d5',font=90,spacing=1.1}={}){
  const c=document.createElement('canvas'); c.width=width;c.height=height;const ctx=c.getContext('2d');
  if(bg!=='transparent'){ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);}
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;
  lines=(Array.isArray(lines)?lines:[lines]);
  lines.forEach((line,i)=>{ctx.font=`600 ${font*(i? .43:1)}px "Yu Gothic","Noto Sans JP","Microsoft YaHei",sans-serif`;ctx.fillText(line,width/2,height/2+(i-(lines.length-1)/2)*font*spacing,width*.93);});
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
function label(parent,x,y,z,w,h,lines,opts={},ry=0){const tex=textTexture(lines,opts);return plane(parent,x,y,z,w,h,new T.MeshBasicMaterial({map:tex,transparent:opts.bg===undefined||opts.bg==='transparent',side:T.DoubleSide,toneMapped:false}),0,ry);}
function glowTexture(color){const c=document.createElement('canvas');c.width=128;c.height=128;const a=c.getContext('2d'),g=a.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,color);g.addColorStop(.3,color.replace('1)', '.35)'));g.addColorStop(1,color.replace('1)','0)'));a.fillStyle=g;a.fillRect(0,0,128,128);return new T.CanvasTexture(c);}
function glow(parent,x,y,z,w,d,color,opacity=.35){return plane(parent,x,y,z,w,d,new T.MeshBasicMaterial({map:glowTexture(color),transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending}),-Math.PI/2);}

scene.add(new T.HemisphereLight(0x9ebed7,0x3b3c4e,.85));
const moon = new T.DirectionalLight(0xb1cced,1.15);moon.position.set(-8,17,9);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.5,far:50});moon.shadow.normalBias=.025;moon.shadow.bias=-.00015;moon.shadow.radius=3;scene.add(moon);
const rim=new T.DirectionalLight(0x56a7b4,.9);rim.position.set(4,8,-7);scene.add(rim);
function point(parent,x,y,z,color,intensity,distance){const p=new T.PointLight(color,intensity,distance,2);p.position.set(x,y,z);parent.add(p);return p;}

// Square plinth, continuous road, raised sidewalk, and the two arms of a street corner.
const base=group();
box(base,0,-.43,0,14,.8,14,'#142936',true);
box(base,0,-.03,0,14,.08,14,C.asphalt);
box(base,0,-.77,0,13.7,.08,13.7,'#0c1c29');
box(base,0,-.38,7.012,13.9,.035,.018,'#42606a');
box(base,7.012,-.38,0,.018,.035,13.9,'#42606a');
piece(base,0,.4);
const paving=group();
box(paving,-1.05,.14,-1.9,11.9,.28,10.2,C.curb,true);
box(paving,-1.07,.29,-1.95,11.75,.05,10.08,'#879394');
// Front sidewalk joints and curb stones are individually modeled.
for(let x=-6.7;x<4.9;x+=.59){box(paving,x,.31,2.99,.55,.14,.2,'#a5b0ad');}
for(let z=-6.7;z<3;z+=.59){box(paving,4.85,.31,z,.2,.14,.55,'#a5b0ad');}
for(let x=-6.6;x<4.8;x+=.58)for(let z=1.18;z<3;z+=.57){box(paving,x,.324,z,.55,.012,.54,rand()>.65?'#89999a':'#9ba4a0');}
for(let z=-6.7;z<1;z+=.58)for(let x=3.7;x<4.8;x+=.55)box(paving,x,.324,z,.52,.014,.55,'#929e9b');
// Tactile paving travels across the storefront and turns at the intersection.
for(let x=-6.6;x<4.5;x+=.36){box(paving,x,.343,2.21,.34,.025,.36,'#c1ad64');for(let j=0;j<3;j++)box(paving,x-.1+j*.1,.363,2.21,.025,.015,.29,'#ddc77e');}
for(let z=2.52;z<3;z+=.25)box(paving,4.4,.35,z,.36,.03,.22,'#c5b271');
piece(paving,.22,.7);
const markings=group();
for(let i=0;i<6;i++){box(markings,1.05+i*.81,.023,4.77,.48,.02,2.4,'#a9b8b5');}
box(markings,-4.85,.02,3.65,3.3,.02,.065,'#a0b7b8');box(markings,-6.48,.02,4.65,.065,.02,2,'#a0b7b8');box(markings,-3.22,.02,4.65,.065,.02,2,'#a0b7b8');
label(markings,-4.85,.041,4.65,1.0,.75,'P',{font:170,color:'#93afad'},0).rotation.x=-Math.PI/2;
for(let z=-6.5;z<2.5;z+=1.6)box(markings,6.08,.025,z,.075,.02,.7,'#99a8a2');
for(let x=-6.2;x<.5;x+=1.5)box(markings,x,.025,6.15,.7,.02,.075,'#c5b98e');
// Covered drains, on both street edges.
for(let x=-6.4;x<4.5;x+=1.23){box(markings,x,.04,3.24,1.12,.025,.19,'#142c38');for(let j=0;j<12;j++)box(markings,x-.5+j*.09,.06,3.24,.026,.025,.17,'#526971');}
for(let z=-6.5;z<2.7;z+=1.23){box(markings,5.08,.04,z,.19,.025,1.1,'#142c38');for(let j=0;j<12;j++)box(markings,5.08,.06,z-.5+j*.09,.17,.025,.026,'#526971');}
const man=cyl(markings,-1.35,.025,5.52,.43,.03,'#294550',.43,32);for(let i=0;i<4;i++){const r=new T.Mesh(new T.TorusGeometry(.1+i*.075,.009,4,32),mat('#536770'));r.rotation.x=Math.PI/2;r.position.set(-1.35,.047,5.52);markings.add(r);}
piece(markings,.45,.8);

// Store foundation and walls. Front and east elevations are almost entirely glazed.
const structure=group(-.9,0,-1.55);
box(structure,0,.43,0,7.4,.2,4.8,'#d6cdb2',true);
box(structure,0,.55,0,7.16,.05,4.6,'#cfc6ab');
box(structure,0,1.97,-2.3,7.4,2.95,.16,C.wall,true);
box(structure,-3.63,1.97,0,.15,2.95,4.6,C.wall,true);
// Interior tiled floor.
for(let x=-3.3;x<3.5;x+=.57)for(let z=-2;z<2.2;z+=.57)box(structure,x,.585,z,.55,.015,.55,rand()>.8?'#c1bea8':'#ddd4b7');
for(const x of [-3.6,-1.2,1.0,3.6])box(structure,x,1.95,2.3,.12,2.8,.13,'#b4c5bb',true);
box(structure,0,.88,2.3,7.3,.62,.15,'#a9ad99',true);
box(structure,0,3.2,2.3,7.4,.16,.2,'#d6d3b7');
box(structure,3.62,.88,0,.15,.62,4.6,'#a9ad99',true);
for(const z of [-2.2,0,2.2])box(structure,3.62,1.96,z,.12,2.8,.12,'#b1c3b9',true);
box(structure,3.62,3.2,0,.15,.15,4.6,'#c8ceb4');
piece(structure,.7,3);
// Glass stays almost invisible: merchandise, reflections and thin mullions do the work.
const glass = new T.MeshPhysicalMaterial({color:0x9cd7d3,transparent:true,opacity:.075,roughness:.08,metalness:0,side:T.DoubleSide,depthWrite:false});
const glazing=group(-.9,0,-1.55);
for(const [x,w] of [[-2.4,2.25],[2.3,2.45]]){
  box(glazing,x,2.05,2.315,w,2.15,.025,glass);
  box(glazing,x,1.45,2.34,w,.035,.025,'#d7e3cb');
}
for(const z of [-1.1,1.1])box(glazing,3.63,2.04,z,.025,2.12,2.1,glass);
// Sliding automatic doors, with rails, handles, stickers and transom.
box(glazing,-.12,.68,2.39,2.17,.06,.36,'#6c8587');
for(const x of [-.63,.43]){
  box(glazing,x,1.92,2.38,1.02,2.45,.025,glass);
  for(const dx of [-.51,.51])box(glazing,x+dx,1.92,2.4,.045,2.48,.06,'#56747b');
  box(glazing,x,3.13,2.4,1.04,.06,.06,'#56747b');box(glazing,x,.72,2.4,1.04,.08,.06,'#56747b');
  box(glazing,x,1.52,2.42,1.04,.07,.02,C.green);
  box(glazing,x+(x<0?.3:-.3),1.85,2.45,.035,.32,.04,'#c3d7cb');
  label(glazing,x,2.14,2.43,.37,.12,'自動',{font:70,color:'#eff4da'});
}
box(glazing,-.1,3.23,2.46,.2,.08,.09,'#223c45');
// Reflected slender ceiling lights in the shopfront glass.
for(let i=0;i<5;i++){const p=plane(glazing,-3.15+i*1.35,2.72,2.35,.032,.51,new T.MeshBasicMaterial({color:0xe4ffe1,transparent:true,opacity:.2,depthWrite:false}));p.rotation.z=-.18;}
piece(glazing,2.8,2);

// Interior: refrigerated wall, stocked gondolas, cashier, warmer, coffee and magazine rack.
const interior=group(-.9,0,-1.55);
const packColors=['#e8be68','#bce1b0','#df7d69','#f0dfb2','#a4c9c8','#83ac95','#cfa2b4'];
function pack(parent,x,y,z,w,h,d,color){
  let a=productBatches.get(parent);if(!a){a=[];productBatches.set(parent,a);}a.push({x,y,z,w,h,d,color});
}
function shelf(parent,x,z,w,d,levels=4,ry=0){
  const s=group(x,0,z);s.rotation.y=ry;parent.add(s);
  const backHeight=levels*.36+.04,backCenter=.61+backHeight/2;
  box(s,0,backCenter,0,w,backHeight,.055,'#8d998a');
  for(const px of [-w/2,w/2])box(s,px,backCenter,0,.035,backHeight+.07,d,'#c2c4ab');
  for(let l=0;l<levels;l++){
    const y=.69+l*.36;box(s,0,y,0,w,.055,d,'#d9d4b9');box(s,0,y-.02,d/2,.98*w,.09,.027,C.coral);
    for(let j=0;j<Math.floor(w/.16);j++){
      const h=.13+rand()*.1,c=packColors[(j+l*2)%packColors.length];
      for(let row=0;row<2;row++)pack(s,-w/2+.1+j*.16,y+h/2+.035,-.08+row*.19,.105,h,.12,c);
    }
    for(let j=0;j<5;j++)box(s,-w*.4+j*w*.2,y-.025,d/2+.018,.085,.035,.008,'#fff3ce');
  }
  return s;
}
for(let i=0;i<5;i++){
 const x=-2.83+i*1.19;
 box(interior,x,1.73,-1.96,1.12,2.15,.44,'#e0dfc2',true);
 box(interior,x,1.79,-1.7,.96,1.78,.018,'#abc5b8');
 for(let l=0;l<5;l++){
  const y=.88+l*.34;box(interior,x,y,-1.64,1.0,.035,.28,'#e4e4ce');
  for(let j=0;j<6;j++){
   const px=x-.4+j*.16;pack(interior,px,y+.13,-1.6,.105,.23,.1,packColors[(i+j+l)%7]);
   box(interior,px,y+.14,-1.54,.085,.07,.01,'#e9ead1');
  }
 }
 box(interior,x+.4,1.7,-1.48,.027,.47,.035,'#e8ead3');
 box(interior,x,2.68,-1.68,1.04,.055,.04,mat('#d7ffe2',1.4));
 label(interior,x,2.82,-1.70,.8,.13,['お飲みもの','DRINKS'],{font:65,bg:'#5b8e7e',height:256});
}
shelf(interior,-1.65,-.25,1.85,.57,4);
shelf(interior,.75,-.22,1.85,.57,4);
shelf(interior,2.48,.47,1.9,.50,4,Math.PI/2);
// Low front display does not obstruct the view into the store.
const frontShelf=shelf(interior,1.9,1.53,1.55,.4,2);frontShelf.scale.y=.88;
box(interior,-2.5,1.04,1.05,1.72,.91,.75,'#d6c7a5',true);
box(interior,-2.5,1.53,1.05,1.83,.1,.86,'#738c86',true);
box(interior,-2.64,1.68,.99,.1,.28,.08,'#293e42');
const screen=box(interior,-2.64,1.87,.99,.43,.29,.07,'#253c43',true);screen.rotation.x=-.18;
box(interior,-2.64,1.88,1.038,.35,.2,.012,mat('#a1d7ba',.5));
box(interior,-1.97,1.82,1.13,.47,.49,.43,'#c59e62',true);
box(interior,-1.97,1.84,1.36,.38,.33,.01,glass);
for(let j=0;j<3;j++)for(let k=0;k<2;k++)sphere(interior,-2.1+j*.13,1.73+k*.18,1.2,.062,'#e5bd6c');
box(interior,-3.12,1.87,.95,.34,.6,.35,'#2f4545',true);cyl(interior,-3.12,2.24,.95,.1,.15,'#776c55');
box(interior,-2.5,.9,1.444,1.4,.13,.01,C.green);
label(interior,-2.5,1.18,1.44,1.0,.2,'いらっしゃいませ',{font:60,color:'#47685d'});
// Small wall menus and back room door.
box(interior,-3.49,1.76,-.8,.04,2.2,.85,'#7b8e81',true);
box(interior,-3.45,1.7,-.52,.035,.06,.06,'#e5d3a3');
label(interior,1.95,3.0,-2.2,1.2,.2,'おにぎり ・ お弁当',{font:70,color:'#4d6e60'});
// Warm light panels are below the ceiling; they are visible from the windows.
for(const x of [-2,0,2]){
 box(interior,x,3.19,-.25,1.55,.055,.21,'#677d74');
 box(interior,x,3.15,-.25,1.45,.025,.15,mat('#fff1bf',2.3));
 point(interior,x,2.6,-.1,0xffd99a,7,5);
}
piece(interior,1.25,2.5);
// Product packaging is instanced per display: hundreds of real solids, few draw calls.
for(const [parent,items] of productBatches){
 const m=new T.InstancedMesh(boxGeo,mat('#ffffff'),items.length);const obj=new T.Object3D();
 items.forEach((a,i)=>{obj.position.set(a.x,a.y,a.z);obj.scale.set(a.w,a.h,a.d);obj.updateMatrix();m.setMatrixAt(i,obj.matrix);m.setColorAt(i,new T.Color(a.color));});
 m.castShadow=true;m.receiveShadow=true;parent.add(m);
}

// Layered roof, luminous fascia, projecting canopy, gutter and rain chain.
const roof=group(-.9,0,-1.55);
box(roof,0,3.51,0,7.65,.48,5.03,'#b5b9a2',true);
box(roof,0,3.8,0,7.9,.16,5.22,'#31545b',true);
box(roof,0,3.91,0,7.7,.09,5.04,'#527271');
for(let x=-3.5;x<=3.5;x+=.55)box(roof,x,3.965,-.04,.025,.022,4.9,'#6a8580');
// Main sign, with a purpose-designed Japanese identity.
box(roof,0,3.51,2.585,7.42,.51,.14,'#d7eed6',true,.3);
box(roof,0,3.74,2.67,7.44,.055,.035,C.green,false,.8);
box(roof,0,3.29,2.67,7.44,.055,.035,C.coral,false,.6);
label(roof,-.25,3.53,2.668,4.6,.39,'雨 宿 り',{font:190,color:'#174e49',width:1024,height:256});
label(roof,2.55,3.53,2.67,1.0,.29,['AMAYADORI','OPEN 24H'],{font:65,color:'#47756a',width:512,height:256});
// Little umbrella mark, physically part of the sign.
const emblem=group(-3.0,3.51,2.68);roof.add(emblem);
const umbshape=new T.Shape();umbshape.absarc(0,0,.17,0,Math.PI,false);umbshape.lineTo(.17,0);
const um=new T.Mesh(new T.ShapeGeometry(umbshape),new T.MeshBasicMaterial({color:0xdb7e66}));emblem.add(um);rod(emblem,[0,0,0],[0,-.15,0],.013,'#41756c');
box(roof,3.85,3.5,0,.13,.5,5.0,'#c5e5ce',true,.45);
label(roof,3.928,3.51,.3,3.5,.32,'雨宿り  ·  24H',{font:100,color:'#32655e'},Math.PI/2);
box(roof,0,3.12,2.88,7.7,.12,.85,'#547c78',true);
box(roof,0,3.04,3.3,7.78,.18,.075,'#335f62',true);
for(let x=-3.6;x<3.8;x+=.48)box(roof,x,3.19,2.89,.025,.04,.78,'#81a399');
box(roof,0,2.99,2.85,6.7,.025,.09,mat('#fff0ba',1.5));
point(roof,0,2.65,3.02,0xffd28b,10,7);
// Air conditioning and roof fixtures, with concentric fan grille.
box(roof,-2.25,4.24,-.75,1.35,.55,.85,'#a7b2a4',true);
for(let x=-2.8;x<-1.65;x+=.12)box(roof,x,4.26,-.305,.028,.36,.02,'#526b67');
cyl(roof,1.9,4.11,-1.5,.22,.3,'#6b8784');cyl(roof,1.9,4.28,-1.5,.32,.08,'#73908b');
piece(roof,2.35,5,.1);

const outside=group();
box(outside,-1.02,.36,1.27,2.0,.055,.67,'#31514d',true);
for(let x=-1.9;x<0;x+=.09)box(outside,x,.391,1.27,.015,.01,.56,'#517169');
label(outside,-1.02,.399,1.27,1.2,.35,'WELCOME',{font:95,color:'#96ac92'}).rotation.x=-Math.PI/2;
// Posters on the glass: deliberately small, so the interior remains clear.
for(const [x,color,title] of [[-3.77,'#e4ac79','新発売'],[1.66,'#b5c68b','おいしい']]){
 box(outside,x,1.38,.817,.42,.55,.02,color,true);
 label(outside,x,1.55,.832,.36,.12,title,{font:80,color:'#3f665d'});
 const food=cyl(outside,x,1.34,.852,.11,.025,'#f3e2b1');food.rotation.x=Math.PI/2;
}
// A vending machine: illuminated product bays, selection buttons, coin slot and retrieval tray.
const vend=group(-5.35,.34,.17);outside.add(vend);
box(vend,0,1.11,0,1.1,2.22,.76,'#c77765',true);
box(vend,0,2.19,0,1.12,.12,.8,'#e7ad8e',true);
box(vend,-.08,1.49,.397,.83,1.1,.015,'#d9ead4',true,1);
for(let l=0;l<3;l++)for(let j=0;j<5;j++){
 const x=-.4+j*.155,y=1.1+l*.34;
 cyl(vend,x,y,.46,.047,.20,packColors[(l+j)%7]);
 box(vend,x,y+.02,.511,.075,.06,.008,'#f0e7bf');
 box(vend,x,y-.14,.45,.09,.028,.04,mat('#a9e5bc',.8));
}
box(vend,.41,1.18,.41,.12,.57,.04,'#3b5552');box(vend,.41,1.3,.44,.075,.035,.012,'#c7d6b7');
cyl(vend,.41,1.06,.46,.025,.02,'#e6c57d').rotation.x=Math.PI/2;
box(vend,-.08,.45,.407,.68,.25,.04,'#293c3d',true);
box(vend,-.08,.32,.45,.73,.045,.12,'#a4aba0');
label(vend,0,2.1,.409,.83,.13,'つめた〜い',{font:90,color:'#f6e6be'});
point(vend,0,1.6,.9,0x91e0d2,6,3.2);
// Recycling bins with three unmistakable round openings.
for(let j=0;j<3;j++){
 const x=2.36+j*.49;box(outside,x,.76,1.38,.43,.84,.44,'#98aba2',true);box(outside,x,1.22,1.38,.46,.13,.47,j===2?'#88ad99':'#bdc5ad',true);
 const hole=cyl(outside,x,1.299,1.38,.105,.008,'#29464a');
 label(outside,x,.96,1.608,.29,.14,j===0?'びん':j===1?'かん':'PET',{font:65,color:'#345d59'});
}
// Umbrella stand and unoccupied umbrellas.
box(outside,-2.92,.55,1.35,.57,.41,.4,'#557c78',true);
for(let j=0;j<4;j++){
 const x=-3.13+j*.13,z=1.36+(j%2)*.07;
 rod(outside,[x,.6,z],[x+.08,1.47,z],.018,'#d8d5ba');
 const u=new T.Mesh(new T.ConeGeometry(.062,.59,7),mat(j%2?'#cad8d0':'#6f92a0'));u.position.set(x+.023,.97,z);u.rotation.z=-.09;outside.add(u);
 wire(outside,[[x+.08,1.44,z],[x+.075,1.55,z],[x+.14,1.59,z],[x+.2,1.54,z],[x+.17,1.49,z]],'#b3c0b4',.016);
}
// Vertical lightbox attached to the east corner.
box(outside,3.19,2.8,1.05,.47,1.17,.18,'#416d66',true);
box(outside,3.19,2.8,1.155,.38,1.08,.035,mat('#d9f1c9',1.0));
label(outside,3.19,2.82,1.18,.32,.94,['雨','宿','り'],{font:115,spacing:.8,width:256,height:768,color:'#38675d'});
piece(outside,3.05,3.5,.1);

// Narrow alley to the back: service door, utility equipment, crates and noticeboard.
const alley=group();
box(alley,-.9,.35,-5.45,7.4,.08,2.55,'#4f686d');
for(let x=-4.4;x<2.9;x+=.35)box(alley,x,.398,-5.45,.015,.01,2.5,'#748687');
box(alley,-4.7,.95,-5.9,.12,1.3,1.8,'#53756b',true);
for(let j=0;j<9;j++)box(alley,-4.7,.9,-6.65+j*.18,.14,1.2,.035,'#778f7b');
const ac=group(3.4,.4,-4.05);alley.add(ac);box(ac,0,.48,0,1.0,.83,.46,'#a5b5a8',true);
for(let j=0;j<6;j++){const ring=new T.Mesh(new T.TorusGeometry(.05+j*.04,.012,4,24),mat('#647b78'));ring.position.set(-.08,.5,.243);ac.add(ring);}
rod(ac,[-.36,.5,.26],[.2,.5,.26],.014,'#637b77');rod(ac,[-.08,.2,.26],[-.08,.8,.26],.014,'#637b77');
wire(alley,[[3.65,.6,-4.05],[3.95,.6,-4.05],[3.95,1.9,-4.02],[2.86,2.7,-4.02]],'#b3ba9f',.045);
for(let j=0;j<3;j++)box(alley,-3.4+j*.66,.65,-4.64,.58,.53,.48,j%2?'#7a9678':'#a28460',true);
// Side notice board; model faces the east street.
box(alley,2.91,2,-2.5,.05,1.15,1.3,'#426b65',true);box(alley,2.949,2,-2.5,.025,1.02,1.17,'#c6b990');
for(let j=0;j<4;j++){
 const p=box(alley,2.97,1.77+(j%2)*.43,-2.8+Math.floor(j/2)*.55,.01,.34,.4,j%2?'#b4cbd0':'#e0d2ab');
 for(let l=0;l<3;l++)box(alley,2.98,1.73+(j%2)*.43+l*.055,-2.8+Math.floor(j/2)*.55,.01,.012,.28,'#7d8c80');
}
// Downpipes from the eaves.
for(const x of [-4.47,2.69]){rod(alley,[x,.4,-3.94],[x,3.6,-3.94],.045,'#6c8b80');for(let y=.7;y<3.5;y+=.8)box(alley,x,y,-3.94,.13,.06,.13,'#839d8b');}
piece(alley,2.0,2.5);

// Bicycle, modeled from tubing, fine spokes, fenders, pedals, basket and kickstand.
const bike=group(-5.26,.36,-2.05);bike.rotation.y=-.18;
for(const x of [-.63,.65]){
 const tire=new T.Mesh(new T.TorusGeometry(.43,.045,8,40),mat('#1c3038'));tire.position.set(x,.46,0);bike.add(tire);
 const rim=new T.Mesh(new T.TorusGeometry(.365,.016,6,40),mat('#a2b7ac'));rim.position.set(x,.46,0);bike.add(rim);
 for(let j=0;j<16;j++){const a=j*Math.PI/8;rod(bike,[x,.46,.006],[x+Math.sin(a)*.36,.46+Math.cos(a)*.36,.006],.006,'#879f9e');}
}
for(const [a,b] of [[[-.63,.46,0],[-.2,.52,0]],[[-.63,.46,0],[-.31,1.04,0]],[[-.31,1.04,0],[-.2,.52,0]],[[-.31,1.04,0],[.4,1.02,0]],[[.4,1.02,0],[-.2,.52,0]],[[.4,1.02,0],[.65,.46,0]]])rod(bike,a,b,.025,'#b9c9ac');
rod(bike,[-.31,1.04,0],[-.35,1.2,0],.022,'#94aba2');box(bike,-.38,1.22,0,.3,.07,.16,'#2d4145');
rod(bike,[.4,1.02,0],[.37,1.34,0],.022,'#9eb5a8');rod(bike,[.37,1.34,-.2],[.37,1.34,.2],.025,'#9fb5aa');
box(bike,.65,1.2,0,.4,.29,.37,'#688b86',true);
for(let j=0;j<5;j++){box(bike,.46+j*.09,1.21,.193,.012,.24,.014,'#abc2ad');box(bike,.46+j*.09,1.21,-.193,.012,.24,.014,'#abc2ad');}
rod(bike,[-.2,.52,-.05],[-.2,.52,.18],.02,'#809992');box(bike,-.2,.51,.2,.15,.03,.1,'#2f4549');
rod(bike,[-.21,.52,0],[-.4,.03,.17],.012,'#92aaa5');
piece(bike,3.4,3,.2);

// Street lights, utility pole, signal, curved safety railing, and fine overhead cables.
const street=group();
const lamp=group(4.34,.34,2.17);street.add(lamp);
cyl(lamp,0,.09,0,.16,.18,'#33535c');cyl(lamp,0,2.32,0,.061,4.55,'#48666a',.048);
wire(lamp,[[0,4.5,0],[0,4.78,0],[-.15,4.94,0],[-.47,4.94,0],[-.66,4.8,0]],'#708d86',.05);
const shade=new T.Mesh(new T.ConeGeometry(.28,.13,16,1,true),mat('#354f56'));shade.position.set(-.66,4.77,0);lamp.add(shade);
cyl(lamp,-.66,4.71,0,.21,.045,mat('#ffe5aa',2));
point(lamp,-.66,4.51,0,0xffd48d,19,8);
// Pole is behind the left corner: cables frame, rather than cover, the shop.
const pole=group(-5.95,.33,-4.47);street.add(pole);
cyl(pole,0,3.1,0,.11,6.2,'#687d79',.077);
cyl(pole,0,.52,0,.125,1.04,'#a8a789');
for(let j=0;j<6;j++){const band=box(pole,.006,.25+j*.15,.124,.18,.075,.015,j%2?'#a5a78d':'#344a46');band.rotation.z=-.25;}
box(pole,0,5.4,0,1.3,.09,.12,'#45656b',true);box(pole,0,5.96,0,.82,.07,.11,'#45656b');
for(const x of [-.5,0,.5]){cyl(pole,x,5.56,0,.062,.22,'#b5bcab');cyl(pole,x,5.68,0,.08,.035,'#8ca39a');}
cyl(pole,.24,4.73,0,.21,.65,'#829b90');rod(pole,[0,4.45,0],[.24,4.45,0],.04,'#476970');
for(let j=0;j<3;j++)wire(street,[[-6.45+j*.5,5.98,-4.47],[-2,5.13-j*.03,-5.5],[2.4,5.75,-6.45]],'#1d3541',.018);
wire(street,[[-5.95,5.3,-4.47],[-6.44,4.6,-.8],[-6.7,4.7,2.3]],'#223d45',.015);
// Small overhead bracket at the rear edge; everything stays within the plinth.
cyl(street,2.4,2.98,-6.45,.055,5.9,'#526e71');
box(street,2.4,5.8,-6.45,1.1,.08,.12,'#547476');
// Guardrails on both streets.
for(const [x,z,len,ry] of [[-1.3,2.9,1.7,0],[1.15,2.9,1.5,0],[4.65,-.8,1.7,Math.PI/2],[4.65,-3.25,1.7,Math.PI/2]]){
 const g=group(x,.35,z);g.rotation.y=ry;street.add(g);
 for(const px of [-len/2,len/2]){cyl(g,px,.42,0,.04,.84,'#b1beb0');cyl(g,px,.04,0,.09,.08,'#627b7d');}
 rod(g,[-len/2,.8,0],[len/2,.8,0],.037,'#b6c6b4');rod(g,[-len/2,.36,0],[len/2,.36,0],.025,'#829e96');
}
// Traffic mirror and Japanese neighborhood signs.
const sign=group(5.05,0,-4.75);street.add(sign);cyl(sign,0,1.9,0,.042,3.8,'#698c91');
box(sign,0,3.08,0,.65,.64,.075,'#5b959d',true);label(sign,0,3.08,.045,.57,.56,'止',{font:190,color:'#ecedcc',width:256,height:256});
box(sign,0,2.51,0,1.0,.3,.07,'#bed1bd',true);label(sign,0,2.51,.04,.93,.25,'桜町 二丁目',{font:90,color:'#386168'});
const mirror=cyl(street,5.04,3.98,-4.72,.31,.06,'#dc9271');mirror.rotation.x=Math.PI/2;
const mirr=cyl(street,5.04,3.98,-4.678,.26,.012,'#9bbbc2');mirr.rotation.x=Math.PI/2;
// A small red stop sign on the front-left street boundary.
cyl(street,-6.3,1.55,2.75,.036,2.5,'#7e9690');
const tri=new T.Mesh(new T.CircleGeometry(.37,3),mat('#bd7169'));tri.position.set(-6.3,2.85,2.75);tri.rotation.z=Math.PI;street.add(tri);
label(street,-6.3,2.84,2.765,.46,.19,'止まれ',{font:100,color:'#f5dfba'});
piece(street,3.8,5,.08);

// Living details, with no inhabitants.
const details=group();
for(const [x,z] of [[-4.68,.95],[3.65,-2.58],[-6.3,-5.4]]){
 cyl(details,x,.55,z,.18,.4,'#9d8b69',.23,8);
 for(let j=0;j<8;j++){const a=j*2.4;const l=sphere(details,x+Math.cos(a)*.15,.83+rand()*.2,z+Math.sin(a)*.15,.16,j%2?'#5b8f78':'#80a382');l.scale.set(.5,1.3,.75);l.rotation.z=Math.cos(a)*.5;}
}
// A-frame poster at the entrance.
const af=group(.65,.36,1.61);details.add(af);
const board=box(af,0,.52,0,.53,.77,.055,'#587e70',true);board.rotation.x=-.12;
label(af,0,.62,.065,.43,.46,['ほっと','ひといき'],{font:95,color:'#f6dfae',width:256,height:384,spacing:.85});
for(const x of [-.26,.26]){rod(af,[x,0,-.24],[x,.95,0],.021,'#b4a486');rod(af,[x,0,.24],[x,.95,0],.021,'#b4a486');}
// Orange alley cone and discarded delivery boxes.
box(details,3.83,.35,-5.2,.45,.06,.45,'#b68165');cyl(details,3.83,.69,-5.2,.16,.63,'#d5936c',.035,12);cyl(details,3.83,.72,-5.2,.11,.09,'#d4d2b1',.095,12);
piece(details,4.2,2.5,.1);

// Wet asphalt: irregular puddle silhouettes, broken elongated neon reflections.
const wet=group();
const puddleMat=new T.MeshPhysicalMaterial({color:'#648e9b',metalness:.65,roughness:.17,transparent:true,opacity:.23,depthWrite:false});
for(let j=0;j<33;j++){
 const x=-6.6+rand()*13.2,z=3.4+rand()*3.2;const shape=new T.Shape();
 const rx=.18+rand()*.8,rz=.07+rand()*.2;
 for(let k=0;k<=12;k++){const a=k/12*Math.PI*2,r=.8+rand()*.3;const px=Math.cos(a)*rx*r,pz=Math.sin(a)*rz*r;k?shape.lineTo(px,pz):shape.moveTo(px,pz);}
 const p=new T.Mesh(new T.ShapeGeometry(shape),puddleMat);p.rotation.x=-Math.PI/2;p.position.set(x,.047,z);wet.add(p);
}
for(let j=0;j<13;j++){
 const p=new T.Mesh(new T.CircleGeometry(.25+rand()*.3,16),puddleMat);p.rotation.x=-Math.PI/2;p.scale.set(1,.3+rand()*.5,1);p.position.set(5.4+rand()*1.1,.05,-6+rand()*8);wet.add(p);
}
// Reflections are painted light fields, not duplicate solid buildings under the road.
function reflection(x,z,width,length,color){
 glow(wet,x,.066,z,width,length,color,.32);
 for(let j=0;j<22;j++){
 const d=j/22,w=width*(.3+rand()*.6)*(1-d*.6);
 const mesh=box(wet,x+(rand()-.5)*width*.55,.069,z-length*.43+d*length,w,.007,.02+rand()*.07,new T.MeshBasicMaterial({color:new T.Color(color.startsWith('rgba(255')?'#e8bf7c':color.includes('119,')?'#86c6b0':'#b4d9cc'),transparent:true,opacity:(1-d)*(.09+rand()*.16),depthWrite:false}));mesh.castShadow=false;
 }
}
reflection(-.9,3.58,5.5,4.0,'rgba(255,211,142,1)');
reflection(-5.32,3.2,1.4,3.6,'rgba(119,218,199,1)');
reflection(3.68,4.2,1.1,3.1,'rgba(255,211,142,1)');
glow(wet,-1,.335,1.85,8,2.1,'rgba(255,208,127,1)',.4);
glow(wet,3.65,.336,-.8,2.5,4.4,'rgba(255,222,160,1)',.18);
piece(wet,4.6,.05);

// Fine rain contained above the square plinth; a seeded field avoids visible clumps.
const rainCount=1150, rainPos=new Float32Array(rainCount*6), rainData=[];
for(let i=0;i<rainCount;i++)rainData.push({x:(rand()-.5)*13.8,y:rand()*9,z:(rand()-.5)*13.8,s:.12+rand()*.15,v:5+rand()*4});
const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));
const rainMat=new T.LineBasicMaterial({color:0x9ebecb,transparent:true,opacity:0,depthWrite:false});
const rain=new T.LineSegments(rainGeo,rainMat);scene.add(rain);
const ripCount=80;const rippleMat=new T.MeshBasicMaterial({color:'#a7c8cc',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false});
const ripples=new T.InstancedMesh(new T.RingGeometry(.93,1,24),rippleMat,ripCount);ripples.rotation.x=-Math.PI/2;scene.add(ripples);
const ripData=Array.from({length:ripCount},()=>{let x=(rand()-.5)*13.6,z=(rand()-.5)*13.6;const sidewalk=z<3&&x<4.9; if(sidewalk && x>-4.6&&x<2.9&&z>-4&&z<1.1)z=3.5+rand()*3;return{x,z,y:sidewalk?.37:.086,phase:rand(),speed:.5+rand()*.5};});
const dummy=new T.Object3D();
// Dots sparkling along canopy runoff, without particles leaking beyond the base.
const dropsGeo=new T.BufferGeometry(),dropArr=new Float32Array(50*3);dropsGeo.setAttribute('position',new T.BufferAttribute(dropArr,3));
const drops=new T.Points(dropsGeo,new T.PointsMaterial({color:'#f5dfb6',size:.025,transparent:true,opacity:.6}));scene.add(drops);

// Subtle optical halation, without interface overlays.
const rt=new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType,depthBuffer:true,samples:4});
const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
const postMat=new T.ShaderMaterial({uniforms:{image:{value:rt.texture},resolution:{value:new T.Vector2(innerWidth,innerHeight)},time:{value:0}},vertexShader:`varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position,1.0);}`,fragmentShader:`
uniform sampler2D image;uniform vec2 resolution;uniform float time;varying vec2 uv0;
vec3 bright(vec2 p){vec3 c=texture2D(image,p).rgb;return max(c-vec3(1.15),vec3(0.0));}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
void main(){vec4 raw=texture2D(image,uv0);vec3 bloom=vec3(0.0);vec2 px=1.0/resolution;for(int i=0;i<12;i++){float a=float(i)*.5235988;vec2 dir=vec2(cos(a),sin(a));bloom+=bright(uv0+dir*px*3.0)*.045; bloom+=bright(uv0+dir*px*9.0)*.025; bloom+=bright(uv0+dir*px*19.0)*.012;}
vec3 col=aces(raw.rgb+bloom*.4);col=pow(col,vec3(1.0/2.2));float v=1.0-.14*pow(length((uv0-.5)*1.3),2.0);col*=v;
float noise=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);col+=(noise-.5)*.008;
gl_FragColor=vec4(col,raw.a);}` ,depthTest:false,depthWrite:false,transparent:true,toneMapped:false});
postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMat));
// A softly lit ground shadow beneath the collectible base.
const shadow=plane(scene,0,-.88,0,22,22,new T.MeshBasicMaterial({map:glowTexture('rgba(0,0,0,1)'),transparent:true,opacity:.5,depthWrite:false}),-Math.PI/2);
const start=performance.now(), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize(){
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);rt.setSize(innerWidth,innerHeight);postMat.uniforms.resolution.value.set(innerWidth,innerHeight);
}
addEventListener('resize',resize);
// A portrait viewport needs a little extra camera distance to retain the entire square.
const fitFactor=Math.max(1,1.35/(innerWidth/innerHeight));
camera.position.sub(controls.target).multiplyScalar(fitFactor).add(controls.target);
controls.maxDistance=48*fitFactor;
let prev=0;
function animate(now){
 const t=(now-start)/1000,dt=Math.min(t-prev,.04);prev=t;
 for(const a of parts){const p=reduced?1:T.MathUtils.clamp((t-a.delay)/1.7,0,1);const eased=1-Math.pow(1-p,3);a.g.visible=p>0;a.g.position.copy(a.position);a.g.position.y+=(1-eased)*a.lift;a.g.scale.setScalar(.8+.2*eased);a.g.rotation.y=(1-eased)*a.turn+(a.g===bike?-.18:0);}
 const fade=T.MathUtils.smoothstep(t,4.3,7.0);rainMat.opacity=.19*fade;rippleMat.opacity=.19*fade;
 for(let i=0;i<rainCount;i++){
  const a=rainData[i];a.y-=dt*a.v;if(a.y<.3)a.y=8.7;
  const onRoof=a.x>-4.75&&a.x<3.05&&a.z>-4.15&&a.z<1.55;if(onRoof&&a.y<4.1)a.y=8.7;
  const k=i*6;rainPos[k]=a.x;rainPos[k+1]=a.y;rainPos[k+2]=a.z;rainPos[k+3]=a.x-.025;rainPos[k+4]=a.y+a.s;rainPos[k+5]=a.z-.015;
 }
 rainGeo.attributes.position.needsUpdate=true;
 ripData.forEach((a,i)=>{const p=(t*a.speed+a.phase)%1;dummy.position.set(a.x,-a.z,a.y);dummy.scale.setScalar(.015+p*.18);dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix);});ripples.instanceMatrix.needsUpdate=true;
 for(let i=0;i<50;i++){const p=(t*1.6+i*.431)%1;dropArr[i*3]=-4.55+(i/50)*7.35;dropArr[i*3+1]=3.05-p*2.7;dropArr[i*3+2]=1.77;}
 dropsGeo.attributes.position.needsUpdate=true;drops.visible=t>5;
 controls.update();renderer.setRenderTarget(rt);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.clear();postMat.uniforms.time.value=t;renderer.render(postScene,postCamera);
 requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
// Read-only diagnostics used when verifying the miniature, with no visible controls.
window.__miniature={scene,camera,controls,renderer,parts,ready:()=>performance.now()-start>7000};
