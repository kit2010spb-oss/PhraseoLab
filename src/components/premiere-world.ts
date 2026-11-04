import * as T from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

export type PremiereWorld={update:(time:number,ambient:number,reduced:boolean)=>void;resize:()=>void;dispose:()=>void}
export function createPremiereWorld(host:HTMLElement):PremiereWorld {
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'})
 const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info')
 const software=debug&&/swiftshader|llvmpipe/i.test(String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)))
 renderer.setPixelRatio(software?1:Math.min(devicePixelRatio,1.4));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap
 host.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true')
 const scene=new T.Scene();scene.background=new T.Color('#160a25');scene.fog=new T.FogExp2('#25102c',.022)
 const camera=new T.PerspectiveCamera(42,1,.1,80)
 const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(room,.06);room.dispose();pmrem.dispose();scene.environment=env.texture;scene.environmentIntensity=.5
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new T.Vector2(1,1),.28,.5,1.8);composer.addPass(bloom);composer.addPass(new OutputPass())
 const root=new T.Group();scene.add(root)
 const gold=new T.MeshStandardMaterial({color:'#e7b455',metalness:.95,roughness:.22})
 const leather=new T.MeshStandardMaterial({color:'#351149',roughness:.34,metalness:.22})
 const glow=new T.MeshStandardMaterial({color:'#ffc774',emissive:'#ff9b38',emissiveIntensity:2.6})
 const textures:T.Texture[]=[]
 const mesh=(g:T.BufferGeometry,m:T.Material,parent:T.Object3D,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 function tube(points:T.Vector3[],radius:number,material:T.Material,parent:T.Object3D){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),80,radius,8,false),material,parent)}
 function texture(kind:'cover'|'page'|'clock'){
  const c=document.createElement('canvas');c.width=c.height=1024;const x=c.getContext('2d')!
  x.fillStyle=kind==='cover'?'#381244':kind==='page'?'#edcf9c':'#fff0ce';x.fillRect(0,0,1024,1024)
  let seed=42;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647}
  for(let i=0;i<14000;i++){x.fillStyle=kind==='cover'?`rgba(211,137,167,${rand()*.07})`:`rgba(104,54,24,${rand()*.07})`;x.fillRect(rand()*1024,rand()*1024,2,2)}
  x.strokeStyle=kind==='cover'?'#d9aa52':'#ad763e';x.lineWidth=4
  for(const inset of [28,40,67])x.strokeRect(inset,inset,1024-inset*2,1024-inset*2)
  for(let corner=0;corner<4;corner++){x.save();x.translate(corner%2?960:64,corner>1?960:64);x.scale(corner%2?-1:1,corner>1?-1:1)
   for(let j=0;j<7;j++){x.beginPath();x.moveTo(0,j*12);x.bezierCurveTo(140,j*7,210,120,80+j*10,170);x.bezierCurveTo(10,150,50,40,100,70);x.stroke()}
   x.restore()}
  if(kind==='page'){
   x.save();x.translate(512,480);x.strokeStyle='#8b603a';x.lineWidth=3
   x.beginPath();x.ellipse(0,-65,110,145,0,0,Math.PI*2);x.stroke();for(let i=-2;i<=2;i++){x.beginPath();x.ellipse(0,-65,Math.abs(i)*45+5,145,0,0,Math.PI*2);x.stroke()}
   x.beginPath();x.moveTo(-70,65);x.lineTo(-42,180);x.lineTo(42,180);x.lineTo(70,65);x.stroke();x.strokeRect(-44,180,88,50)
   for(let i=0;i<9;i++){x.beginPath();x.ellipse((i-4)*45,240+Math.sin(i)*15,60,14,0,0,Math.PI*2);x.stroke()}x.restore()
   x.font='italic 48px Georgia';x.textAlign='center';x.fillStyle='#78482d';x.fillText('Витать в облаках',512,850)
  }else if(kind==='clock'){
   x.fillStyle='#50362c';x.textAlign='center';x.textBaseline='middle';x.font='66px Georgia'
   const nums=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];nums.forEach((n,i)=>{const a=i/12*Math.PI*2;x.fillText(n,512+Math.sin(a)*350,512-Math.cos(a)*350)})
   x.strokeStyle='#694225';x.lineWidth=15;x.beginPath();x.moveTo(512,230);x.lineTo(512,512);x.lineTo(710,610);x.stroke()
  }
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(t);return t
 }
 const coverMat=new T.MeshStandardMaterial({map:texture('cover'),color:'#ad6c9d',roughness:.34,metalness:.3})
 const pageTexture=texture('page');pageTexture.center.set(.5,.5);pageTexture.rotation=Math.PI
 const paper=new T.MeshStandardMaterial({map:pageTexture,roughness:.72,color:'#ffe3ba',side:T.DoubleSide})
 const edge=new T.MeshStandardMaterial({color:'#dfbd7c',roughness:.5,metalness:.25,side:T.DoubleSide})
 const book=new T.Group();book.position.set(0,-.85,.3);book.scale.setScalar(1.3);root.add(book)
 const halves:T.Group[]=[]
 for(const side of [-1,1]){
  const half=new T.Group();book.add(half);halves.push(half)
  mesh(new T.BoxGeometry(2.8,.15,3.1),coverMat,half,side*1.4,-.14,0)
  for(const z of [-1.53,1.53]){mesh(new T.BoxGeometry(2.8,.07,.055),gold,half,side*1.4,-.07,z)}
  mesh(new T.BoxGeometry(.065,.1,3.08),gold,half,side*2.78,-.07,0)
  // Real stacked, curved sheets; each surface has a smoothly lifted gutter.
  for(let layer=0;layer<26;layer++){
   const geometry=new T.PlaneGeometry(2.67,2.89,34,10);const attr=geometry.attributes.position
   for(let i=0;i<attr.count;i++){const u=(attr.getX(i)+1.335)/2.67,z=attr.getY(i);attr.setXYZ(i,side*(.025+u*2.67),.02+layer*.009+.22*Math.sin(u*Math.PI)-.06*u,z)}geometry.computeVertexNormals()
   mesh(geometry,layer===25?paper:edge,half)
  }
  // Raised gold arabesques run along both leather cover edges.
  for(let j=0;j<8;j++){const pts:T.Vector3[]=[];for(let i=0;i<30;i++){const a=i/29*Math.PI*1.7;pts.push(new T.Vector3(side*(.25+j*.3+Math.sin(a)*.12),-.045+Math.cos(a)*.035,1.55))}tube(pts,.012,gold,half)}
 }
 mesh(new T.CylinderGeometry(.16,.16,3.12,24),leather,book,0,-.1,0).rotation.x=Math.PI/2
 const jewel=mesh(new T.OctahedronGeometry(.16,1),new T.MeshPhysicalMaterial({color:'#d579f5',metalness:.2,roughness:.08,transmission:.45,thickness:.3,emissive:'#8b2eb4',emissiveIntensity:.5}),book,0,-.05,1.66)
 mesh(new T.TorusGeometry(.22,.038,12,48),gold,book,0,-.05,1.6)
 const turning:{mesh:T.Mesh;offset:number}[]=[]
 for(let n=0;n<3;n++){const g=new T.PlaneGeometry(2.65,2.88,42,12);const page=mesh(g,paper,book);turning.push({mesh:page,offset:n*.38})}
 const floor=mesh(new T.CircleGeometry(12,64),new T.ShadowMaterial({color:'#100517',opacity:.3}),scene,0,-1.55,0);floor.rotation.x=-Math.PI/2
 // Authored ornamental motifs share the book's materials, lighting and world coordinates.
 const motifs:T.Group[]=[]
 function motif(x:number,y:number,z:number){const g=new T.Group();g.userData.target=new T.Vector3(x,y,z);root.add(g);motifs.push(g);return g}
 const clock=motif(-4.6,3,-.7)
 mesh(new T.CylinderGeometry(.61,.61,.16,72),gold,clock).rotation.x=Math.PI/2
 mesh(new T.CircleGeometry(.54,72),new T.MeshStandardMaterial({map:texture('clock'),roughness:.4}),clock,0,0,.09)
 mesh(new T.TorusGeometry(.58,.035,12,72),gold,clock,0,0,.12)
 mesh(new T.TorusGeometry(.12,.035,12,32),gold,clock,0,.75,0)
 for(let i=0;i<16;i++){const a=i/15*Math.PI;const link=mesh(new T.TorusGeometry(.048,.012,6,16),gold,clock,-.5-i*.055,.7+Math.sin(a)*.3,-.08);link.rotation.y=i%2*Math.PI/2}
 const key=motif(4.7,2.7,0)
 mesh(new T.TorusGeometry(.27,.045,12,48),gold,key,0,.55,0)
 for(let i=0;i<3;i++)mesh(new T.TorusGeometry(.11,.025,10,30),gold,key,Math.sin(i/3*Math.PI*2)*.14,.55+Math.cos(i/3*Math.PI*2)*.14,.01)
 mesh(new T.CylinderGeometry(.035,.035,1.1,16),gold,key,0,-.18,0)
 for(const y of [-.52,-.69])mesh(new T.BoxGeometry(.21,.065,.07),gold,key,.085,y,0)
 const heart=motif(2.8,3,-1.6),shape=new T.Shape();shape.moveTo(0,-.55);shape.bezierCurveTo(-1,.05,-.5,.95,0,.38);shape.bezierCurveTo(.5,.95,1,.05,0,-.55)
 mesh(new T.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelThickness:.12,bevelSize:.09,bevelSegments:6,curveSegments:24}),new T.MeshPhysicalMaterial({color:'#b71350',roughness:.1,metalness:.18,clearcoat:1,transmission:.35,thickness:.6,emissive:'#9b073a',emissiveIntensity:.22}),heart)
 const quill=motif(-4,-.05,.5)
 tube([new T.Vector3(0,-.7,0),new T.Vector3(.1,0,0),new T.Vector3(.4,.8,0)],.018,gold,quill)
 const feather=new T.MeshPhysicalMaterial({color:'#a062c1',metalness:.55,roughness:.3,side:T.DoubleSide})
 for(let i=0;i<28;i++){const t=i/28;for(const sign of [-1,1]){const s=new T.Shape();s.moveTo(t*.35,t*1.3-.5);s.quadraticCurveTo(t*.35+sign*.4*Math.sin(t*Math.PI),t*1.3-.2,t*.35+sign*.27*Math.sin(t*Math.PI),t*1.3+.12);s.lineTo(t*.35+.05,t*1.3-.4);mesh(new T.ShapeGeometry(s),feather,quill,0,0,i*.001)}}
 const hourglass=motif(4,-.35,.7)
 for(const y of [-.55,.55])mesh(new T.CylinderGeometry(.37,.37,.06,48),gold,hourglass,0,y)
 for(let i=0;i<3;i++){const a=i/3*Math.PI*2;mesh(new T.CylinderGeometry(.022,.022,1.1,10),gold,hourglass,Math.cos(a)*.31,0,Math.sin(a)*.31)}
 const profile=[new T.Vector2(.24,-.5),new T.Vector2(.27,-.38),new T.Vector2(.15,-.18),new T.Vector2(.025,0),new T.Vector2(.15,.18),new T.Vector2(.27,.38),new T.Vector2(.24,.5)]
 mesh(new T.LatheGeometry(profile,40),new T.MeshPhysicalMaterial({color:'#eac8f6',roughness:.05,transmission:.95,thickness:.15,ior:1.45}),hourglass)
 mesh(new T.ConeGeometry(.22,.26,32),new T.MeshStandardMaterial({color:'#f0ba72',roughness:.65}),hourglass,0,-.36)
 tube([new T.Vector3(0,.24,0),new T.Vector3(0,-.3,0)],.009,glow,hourglass)
 // Translucent ribbons are curved surfaces in world space, rather than screen-space rings.
 const ribbons:T.Mesh[]=[]
 for(let j=0;j<3;j++){
  const path=new T.CatmullRomCurve3(Array.from({length:65},(_,i)=>{const t=i/64,a=t*Math.PI*1.6+j*1.5;return new T.Vector3(Math.sin(a)*(1+t*4),-.8+t*4,Math.cos(a)*(1+t*1.5)-1)}))
  const ribbon=mesh(new T.TubeGeometry(path,150,.025,8,false),new T.MeshStandardMaterial({color:j%2?'#b877dc':'#ffe1ad',emissive:j%2?'#8b32cf':'#ffb650',emissiveIntensity:2,transparent:true,opacity:.5}),root);ribbons.push(ribbon)
 }
 const count=software?450:1100,positions=new Float32Array(count*3),colors=new Float32Array(count*3)
 for(let i=0;i<count;i++){const c=new T.Color(i%4?'#ffc26d':'#df78dd');c.toArray(colors,i*3)}
 const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.BufferAttribute(positions,3));dustGeo.setAttribute('color',new T.BufferAttribute(colors,3))
 const sprite=document.createElement('canvas');sprite.width=sprite.height=32;const sx=sprite.getContext('2d')!,sg=sx.createRadialGradient(16,16,0,16,16,16);sg.addColorStop(0,'white');sg.addColorStop(.2,'#ffdf99');sg.addColorStop(1,'transparent');sx.fillStyle=sg;sx.fillRect(0,0,32,32);const sparkle=new T.CanvasTexture(sprite);textures.push(sparkle)
 const dustMat=new T.PointsMaterial({size:.07,map:sparkle,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending})
 root.add(new T.Points(dustGeo,dustMat))
 // Painted volumetric cloud layers sit behind the geometry and receive camera parallax.
 const cloudCanvas=document.createElement('canvas');cloudCanvas.width=1024;cloudCanvas.height=512;const cx=cloudCanvas.getContext('2d')!
 for(let i=0;i<90;i++){const x=(Math.sin(i*73.2)*.5+.5)*1024,y=(Math.cos(i*41.3)*.5+.5)*512,r=35+i%7*16,g=cx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%3?'#c075c61c':'#f7b18f30');g.addColorStop(1,'transparent');cx.fillStyle=g;cx.fillRect(x-r,y-r,r*2,r*2)}
 cx.globalCompositeOperation='destination-in';cx.save();cx.translate(512,256);cx.scale(1,.5);const mask=cx.createRadialGradient(0,0,100,0,0,512);mask.addColorStop(0,'white');mask.addColorStop(1,'transparent');cx.fillStyle=mask;cx.fillRect(-512,-512,1024,1024);cx.restore();
 const clouds=new T.CanvasTexture(cloudCanvas);clouds.colorSpace=T.SRGBColorSpace;textures.push(clouds)
 const cloudMeshes:T.Mesh[]=[];for(let i=0;i<4;i++){const o=mesh(new T.PlaneGeometry(25,12),new T.MeshBasicMaterial({map:clouds,transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending}),scene,0,2,-5-i*2);cloudMeshes.push(o)}
 const hemisphere=new T.HemisphereLight('#d7a1fa','#4b1930',1.5);scene.add(hemisphere)
 const warm=new T.PointLight('#ffb653',32,15,2);warm.position.set(0,-.3,1);scene.add(warm)
 const pink=new T.PointLight('#ed75b3',35,20,2);pink.position.set(-4,3,3);scene.add(pink)
 const rim=new T.DirectionalLight('#e9c8ff',3);rim.position.set(3,5,-3);scene.add(rim)
 const front=new T.SpotLight('#ffe4b1',65,25,.75,.7,1.3);front.position.set(-2,7,6);front.castShadow=true;front.shadow.mapSize.set(1024,1024);scene.add(front)
 const pointer=new T.Vector2();let w=1,h=1,disposed=false,slow=0,quality=software?1:Math.min(devicePixelRatio,1.4)
 function resize(){w=host.clientWidth;h=host.clientHeight;renderer.setSize(w,h);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
 function move(e:PointerEvent){const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,(e.clientY-r.top)/r.height*2-1)}
 function leave(){pointer.set(0,0)}host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);resize()
 const smooth=(a:number,b:number,t:number)=>{const u=T.MathUtils.clamp((t-a)/(b-a),0,1);return u*u*(3-2*u)}
 return {resize,update(t,ambient,reduced){if(disposed)return;host.dataset.sceneTime=t.toFixed(2);const start=performance.now(),open=smooth(2.2,6.2,t),birth=smooth(.4,3.5,t),objects=smooth(5,8.8,t),idle=reduced?0:ambient
   root.visible=t>0;scene.background=new T.Color('#160a25').multiplyScalar(birth);hemisphere.intensity=.7*birth;front.intensity=16*birth;pink.intensity=9*birth;warm.intensity=(1.5+3*open)*birth
   camera.position.set((reduced?0:pointer.x*.18),2.9+(1-birth)*1.5, w/h<1?15.5:9.5+(1-birth)*2);camera.lookAt(0,.55,0)
   root.rotation.y=T.MathUtils.lerp(root.rotation.y,reduced?0:pointer.x*.055,.05)
   book.position.y=-.85-(1-birth)*2.5;book.rotation.y=(1-birth)*-.35+Math.sin(idle*.2)*.015
   halves[0].rotation.z=-(1-open)*1.48;halves[1].rotation.z=(1-open)*1.48
   turning.forEach(({mesh:page,offset})=>{const stamp=Math.min(t,8);if(page.userData.stamp===stamp)return;page.userData.stamp=stamp;const turn=smooth(4+offset,6.2+offset,t),angle=turn*Math.PI,attr=page.geometry.attributes.position
    for(let i=0;i<attr.count;i++){const u=(i%43)/42,v=Math.floor(i/43)/12;const bend=Math.sin(u*Math.PI)*Math.sin(angle)*.55;attr.setXYZ(i,Math.cos(angle)*u*2.65,.22+Math.sin(angle)*u*2.65+bend+.15*Math.sin(u*Math.PI),(v-.5)*2.88)}page.geometry.computeVertexNormals();page.visible=t>3.4;})
   motifs.forEach((g,i)=>{const target=g.userData.target as T.Vector3,p=smooth(5+i*.25,8.4+i*.12,t);g.position.copy(target).multiplyScalar(p);g.position.y+=(-.7)*(1-p)+Math.sin(idle*.5+i)*.045*p;g.scale.setScalar(Math.max(.001,p));g.rotation.set(Math.sin(idle*.2+i)*.08,Math.sin(idle*.25+i)*.18,(i%2?1:-1)*.15+(1-p)*1.5)})
   ribbons.forEach((o,i)=>{o.scale.setScalar(Math.max(.001,objects));o.rotation.y=Math.sin(idle*.1+i)*.06;(o.material as T.MeshStandardMaterial).opacity=.2+objects*.25})
   for(let i=0;i<count;i++){const a=i*2.399+idle*(.03+i%4*.008),r=(.15+(i%113)/113*4.5)*birth;positions[i*3]=Math.sin(a)*r;positions[i*3+1]=-.7+((i*.017+idle*.08)%4.8)*birth;positions[i*3+2]=Math.cos(a)*r*.6}dustGeo.attributes.position.needsUpdate=true;dustMat.opacity=birth*.85
   jewel.rotation.z=idle*.08;cloudMeshes.forEach((o,i)=>{o.position.x=Math.sin(idle*.04+i)*.4;(o.material as T.MeshBasicMaterial).opacity=birth*.65})
   composer.render();if(performance.now()-start>45)slow++;if(slow>35&&quality>.7){quality=.7;renderer.setPixelRatio(quality);composer.setPixelRatio(quality);dustGeo.setDrawRange(0,Math.min(count,500));resize();slow=0}
  },dispose(){disposed=true;host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Points){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m))}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());env.dispose();composer.passes.forEach(pass=>pass.dispose());composer.dispose();renderer.dispose();renderer.domElement.remove()}}
}
