import * as T from 'three'
import { createBookArt, createLeatherMaps } from './book-art'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

// A single, static reflection capture, assigned only to the binding and gemstone.
// These softboxes never enter the visible scene or illuminate the other objects.
function bookReflections(renderer:T.WebGLRenderer) {
 const studio=new T.Scene();studio.background=new T.Color('#89748d')
 const panel=(width:number,height:number,position:T.Vector3,color:T.Color)=>{
  const p=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({color,side:T.DoubleSide}))
  p.position.copy(position);p.lookAt(0,0,0);studio.add(p)
 }
 panel(2.5,6,new T.Vector3(-4,3,5),new T.Color().setRGB(5,3.7,2.6))
 panel(1,5,new T.Vector3(4,1,3),new T.Color().setRGB(2.2,1.8,3.5))
 panel(4,2,new T.Vector3(0,5,-2),new T.Color().setRGB(3.5,3,2.5))
 panel(6,2,new T.Vector3(0,-2,5),new T.Color().setRGB(2.8,2.3,1.9))
 panel(.65,4,new T.Vector3(-1,-1,5),new T.Color().setRGB(4,3.3,5))
 const generator=new T.PMREMGenerator(renderer),target=generator.fromScene(studio,.035,.1,30,{size:128})
 studio.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose()}})
 generator.dispose();return target
}

function amethystGeometry() {
 // Oval brilliant cut: table, alternating star/kite facets, a girdle and pavilion.
 const vertices:number[]=[]
 const vertex=(i:number,n:number,r:number,z:number)=>{const a=i/n*Math.PI*2;return new T.Vector3(Math.sin(a)*r,Math.cos(a)*r*1.15,z)}
 const table=Array.from({length:8},(_,i)=>vertex(i,8,.09,.18))
 const stars=Array.from({length:8},(_,i)=>vertex(i+.5,8,.16,.125))
 const edge=Array.from({length:16},(_,i)=>vertex(i,16,.235,.015))
 const back=Array.from({length:16},(_,i)=>vertex(i,16,.23,-.015))
 const face=(a:T.Vector3,b:T.Vector3,c:T.Vector3)=>vertices.push(...a.toArray(),...b.toArray(),...c.toArray())
 for(let i=0;i<8;i++){
  const next=(i+1)%8,previous=(i+7)%8,k=i*2
  face(new T.Vector3(0,0,.18),table[next],table[i])
  face(table[i],table[next],stars[i])
  face(table[i],stars[i],edge[k]);face(table[i],edge[k],stars[previous])
  face(stars[i],edge[(k+2)%16],edge[k+1]);face(stars[i],edge[k+1],edge[k])
 }
 for(let i=0;i<16;i++){
  const next=(i+1)%16
  face(edge[i],edge[next],back[i]);face(edge[next],back[next],back[i])
  face(back[i],back[next],new T.Vector3(0,0,-.15))
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry
}

// Filigree is authored as small parts but rendered as one mesh per material/hinge.
function consolidateBookDetails(group:T.Group) {
 const batches=new Map<T.Material,T.BufferGeometry[]>(),originals=new Set<T.BufferGeometry>()
 group.children.forEach(o=>{if(o instanceof T.Mesh){o.updateMatrix();const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.applyMatrix4(o.matrix)
  const material=o.material as T.Material;const batch=batches.get(material)||[];batch.push(geometry);batches.set(material,batch);originals.add(o.geometry)
 }})
 group.clear();originals.forEach(g=>g.dispose())
 batches.forEach((geometries,material)=>{const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(merged){const part=new T.Mesh(merged,material);part.castShadow=true;part.receiveShadow=true;group.add(part)}})
}

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
 const bookTexture=(kind:'cover'|'grain'|number)=>{const t=createBookArt(kind);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(t);return t}
 const grain=bookTexture('grain')
 const bindingMaps=createLeatherMaps();Object.values(bindingMaps).forEach(t=>{t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(t)})
 const bookEnv=bookReflections(renderer)
 const coverMat=new T.MeshPhysicalMaterial({map:bindingMaps.map,bumpMap:bindingMaps.bumpMap,bumpScale:.018,roughness:1,roughnessMap:bindingMaps.finishMap,metalness:1,metalnessMap:bindingMaps.finishMap,clearcoat:.24,clearcoatRoughness:.34,envMap:bookEnv.texture,envMapIntensity:.65})
 const spineMat=new T.MeshPhysicalMaterial({color:'#3e123c',bumpMap:bindingMaps.bumpMap,bumpScale:.014,roughness:.48,clearcoat:.3,clearcoatRoughness:.32,envMap:bookEnv.texture,envMapIntensity:.65})
 const papers=[0,1,2,3].map(i=>new T.MeshStandardMaterial({map:bookTexture(i),color:'#dec6a3',roughness:.83,envMapIntensity:.3,bumpMap:grain,bumpScale:.002,side:T.DoubleSide,emissive:'#c77b29',emissiveIntensity:.035}))
 const edges=[0,1,2].map(i=>new T.MeshStandardMaterial({color:['#d3aa63','#dcb775','#c8a15e'][i],roughness:.54,metalness:.32,side:T.DoubleSide}))
 const bookGold=new T.MeshStandardMaterial({color:'#e6bb70',metalness:1,roughness:.24,envMap:bookEnv.texture,envMapIntensity:1.1})
 const antiqueGold=new T.MeshStandardMaterial({color:'#ad7f3e',metalness:1,roughness:.35,envMap:bookEnv.texture,envMapIntensity:.85})
 const book=new T.Group();book.position.set(0,-.85,.3);book.scale.setScalar(1.3);root.add(book)
 const halves:T.Group[]=[]
 for(const side of [-1,1]){
  const half=new T.Group();book.add(half);halves.push(half)
  const outline=new T.Shape(),rw=1.355,rh=1.505,r=.09
  outline.moveTo(-rw+r,-rh);outline.lineTo(rw-r,-rh);outline.quadraticCurveTo(rw,-rh,rw,-rh+r);outline.lineTo(rw,rh-r);outline.quadraticCurveTo(rw,rh,rw-r,rh);outline.lineTo(-rw+r,rh);outline.quadraticCurveTo(-rw,rh,-rw,rh-r);outline.lineTo(-rw,-rh+r);outline.quadraticCurveTo(-rw,-rh,-rw+r,-rh)
  const binding=new T.ExtrudeGeometry(outline,{depth:.12,steps:1,bevelEnabled:true,bevelThickness:.045,bevelSize:.045,bevelSegments:3,curveSegments:8})
  binding.rotateX(-Math.PI/2)
  const bindingUV=binding.attributes.uv,bindingPos=binding.attributes.position
  for(let i=0;i<bindingPos.count;i++)bindingUV.setXY(i,(bindingPos.getX(i)+1.4)/2.8,(bindingPos.getZ(i)+1.55)/3.1)
  mesh(binding,coverMat,half,side*1.4,-.23,0)
  const tooling=new T.Group();half.add(tooling)
  const wire=(points:T.Vector3[],radius=.006,material:T.Material=bookGold)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,radius,5,false),material,tooling)
  for(const z of [-1.53,1.53])for(const y of [-.225,-.075])wire([new T.Vector3(side*.08,y,z),new T.Vector3(side*1.4,y,z),new T.Vector3(side*2.68,y,z)],.012)
  for(const y of [-.225,-.075])wire([new T.Vector3(side*2.77,y,-1.43),new T.Vector3(side*2.78,y,0),new T.Vector3(side*2.77,y,1.43)],.01)
  // Real stacked, curved sheets; each surface has a smoothly lifted gutter.
  for(let layer=0;layer<26;layer++){
   const geometry=new T.PlaneGeometry(2.67,2.89,34,10);const attr=geometry.attributes.position,uv=geometry.attributes.uv
   for(let i=0;i<attr.count;i++){const u=(attr.getX(i)+1.335)/2.67,z=attr.getY(i);attr.setXYZ(i,side*(.025+u*2.67),.02+layer*.009+.22*Math.sin(u*Math.PI)-.06*u,z);uv.setXY(i,side<0?1-u:u,1-uv.getY(i))}geometry.computeVertexNormals()
   mesh(geometry,layer===25?papers[side<0?0:1]:edges[layer%3],half)
  }
  // Thin cast corner protectors with a recessed centre and polished border.
  for(const z of [-1.44,1.44]){
   const plate=new T.Shape();plate.moveTo(0,0);plate.lineTo(.42,0);plate.quadraticCurveTo(.2,.08,.15,.3);plate.lineTo(0,.42);plate.closePath()
   const corner=mesh(new T.ExtrudeGeometry(plate,{depth:.018,bevelEnabled:true,bevelSize:.01,bevelThickness:.008,bevelSegments:2}),antiqueGold,tooling,side*2.72,-.04,z)
   corner.rotation.x=-Math.PI/2;corner.rotation.z=side<0?(z<0?0:-Math.PI/2):(z<0?Math.PI/2:Math.PI)
   const border=mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(.025,.36,.026),new T.Vector3(.025,.025,.026),new T.Vector3(.36,.025,.026)]),20,.008,6),bookGold,tooling)
   border.position.copy(corner.position);border.rotation.copy(corner.rotation)
   const scroll=mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(.05,.06,.027),new T.Vector3(.19,.06,.027),new T.Vector3(.21,.11,.027),new T.Vector3(.14,.15,.027),new T.Vector3(.1,.1,.027),new T.Vector3(.14,.085,.027)]),24,.005,5),bookGold,tooling)
   scroll.position.copy(corner.position);scroll.rotation.copy(corner.rotation)
  }
  const leaf=new T.Shape();leaf.moveTo(0,0);leaf.bezierCurveTo(.05,.045,.105,.028,.12,0);leaf.bezierCurveTo(.07,-.026,.025,-.02,0,0)
  const leafGeometry=new T.ExtrudeGeometry(leaf,{depth:.006,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1,curveSegments:4})
  for(let j=0;j<8;j++){
   const px=side*(.26+j*.32)
   const stem=Array.from({length:20},(_,k)=>{const u=k/19;return new T.Vector3(px+side*u*.3,-.15+Math.sin(u*Math.PI*2)*.045,1.55)})
   wire(stem,.006)
   for(const direction of [-1,1]){
    const l=mesh(leafGeometry,bookGold,tooling,px+side*.14,-.15,1.555);l.rotation.z=direction*.55+(side<0?Math.PI:0)
    // Smaller arabesques remain readable at the front edge without a solid gold band.
    const scroll=Array.from({length:20},(_,k)=>{const a=k/19*Math.PI*1.8,radius=.055*(1-k/25);return new T.Vector3(px+side*(.12+Math.sin(a)*radius),-.15+direction*(.02+Math.cos(a)*radius),1.556)})
    wire(scroll,.0045)
   }
   // Raised tooling on both outer and inner cover faces; follows the existing hinges.
   for(const face of [-.278,-.058]){
    const flourish=Array.from({length:24},(_,k)=>{const u=k/23;return new T.Vector3(px+side*u*.28,face,1.35+Math.sin(u*Math.PI*2)*.045)})
    wire(flourish,.004)
    for(const direction of [-1,1]){const l=mesh(leafGeometry,bookGold,tooling,px+side*.14,face,1.35);l.rotation.x=-Math.PI/2;l.rotation.z=direction*.6+(side<0?Math.PI:0);l.scale.setScalar(.7)}
   }
  }
  consolidateBookDetails(tooling)
 }
 mesh(new T.CylinderGeometry(.18,.18,3.12,32),spineMat,book,0,-.11,0).rotation.x=Math.PI/2
 const spineDetails=new T.Group();book.add(spineDetails)
 for(const z of [-1.38,-.78,0,.78,1.38]){
  mesh(new T.TorusGeometry(.18,.018,8,32),spineMat,spineDetails,0,-.11,z)
  for(const offset of [-.027,.027])mesh(new T.TorusGeometry(.181,.005,6,32),bookGold,spineDetails,0,-.11,z+offset)
 }
 const jewel=mesh(amethystGeometry(),new T.MeshPhysicalMaterial({color:'#c894ed',metalness:0,roughness:.045,transmission:.68,thickness:.24,ior:1.55,attenuationColor:'#74329d',attenuationDistance:.65,clearcoat:1,clearcoatRoughness:.08,envMap:bookEnv.texture,envMapIntensity:1.15}),book,0,-.05,1.66)
 const plaque=new T.Shape();plaque.moveTo(0,.38);plaque.bezierCurveTo(.14,.3,.29,.34,.32,.16);plaque.quadraticCurveTo(.33,.04,.43,0);plaque.quadraticCurveTo(.33,-.04,.32,-.16);plaque.bezierCurveTo(.29,-.34,.14,-.3,0,-.38);plaque.bezierCurveTo(-.14,-.3,-.29,-.34,-.32,-.16);plaque.quadraticCurveTo(-.33,-.04,-.43,0);plaque.quadraticCurveTo(-.33,.04,-.32,.16);plaque.bezierCurveTo(-.29,.34,-.14,.3,0,.38)
 const aperture=new T.Path();aperture.absellipse(0,0,.245,.282,0,Math.PI*2,true,0);plaque.holes.push(aperture)
 mesh(new T.ExtrudeGeometry(plaque,{depth:.025,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:8}),antiqueGold,spineDetails,0,-.05,1.59)
 const plaqueOutline=plaque.getSpacedPoints(64).slice(0,-1).map(p=>new T.Vector3(p.x*.96,p.y*.96,.033))
 mesh(new T.TubeGeometry(new T.CatmullRomCurve3(plaqueOutline,true),64,.006,5,true),bookGold,spineDetails,0,-.05,1.59)
 // Fine claws and two polished mouldings frame the transparent crown.
 const bezel=mesh(new T.TorusGeometry(.265,.023,8,50),bookGold,spineDetails,0,-.05,1.65);bezel.scale.y=1.15
 const outerBezel=mesh(new T.TorusGeometry(.294,.012,8,50),antiqueGold,spineDetails,0,-.05,1.61);outerBezel.scale.y=1.15
 for(let i=0;i<10;i++){
  const a=i/10*Math.PI*2,x=Math.sin(a),y=Math.cos(a)
  mesh(new T.SphereGeometry(.012,8,6),bookGold,spineDetails,x*.292,-.05+y*.338,1.635)
  if(i%2===0){const claw=mesh(new T.CapsuleGeometry(.011,.07,3,6),bookGold,spineDetails,x*.23,-.05+y*.266,1.72);claw.rotation.z=-a}
 }
 consolidateBookDetails(spineDetails)
 const gutter=mesh(new T.PlaneGeometry(.1,2.86),new T.MeshStandardMaterial({color:'#ffcc79',emissive:'#ffb84a',emissiveIntensity:1.3,transparent:true,opacity:.3,side:T.DoubleSide}),book,0,.235,0);gutter.rotation.x=-Math.PI/2
 const turning:{mesh:T.Mesh;offset:number}[]=[]
 for(let n=0;n<3;n++){const g=new T.PlaneGeometry(2.65,2.88,42,12);const page=mesh(g,papers[(n+1)%4],book);turning.push({mesh:page,offset:n*.38})}
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
    for(let i=0;i<attr.count;i++){const u=(i%43)/42,v=Math.floor(i/43)/12;page.geometry.attributes.uv.setXY(i,Math.cos(angle)<0?1-u:u,1-v);const bend=Math.sin(u*Math.PI)*Math.sin(angle)*.55;attr.setXYZ(i,Math.cos(angle)*u*2.65,.22+Math.sin(angle)*u*2.65+bend+.15*Math.sin(u*Math.PI),(v-.5)*2.88)}page.geometry.attributes.uv.needsUpdate=true;page.geometry.computeVertexNormals();page.visible=t>3.4;})
   motifs.forEach((g,i)=>{const target=g.userData.target as T.Vector3,p=smooth(5+i*.25,8.4+i*.12,t);g.position.copy(target).multiplyScalar(p);g.position.y+=(-.7)*(1-p)+Math.sin(idle*.5+i)*.045*p;g.scale.setScalar(Math.max(.001,p));g.rotation.set(Math.sin(idle*.2+i)*.08,Math.sin(idle*.25+i)*.18,(i%2?1:-1)*.15+(1-p)*1.5)})
   ribbons.forEach((o,i)=>{o.scale.setScalar(Math.max(.001,objects));o.rotation.y=Math.sin(idle*.1+i)*.06;(o.material as T.MeshStandardMaterial).opacity=.2+objects*.25})
   for(let i=0;i<count;i++){const a=i*2.399+idle*(.03+i%4*.008),r=(.15+(i%113)/113*4.5)*birth;positions[i*3]=Math.sin(a)*r;positions[i*3+1]=-.7+((i*.017+idle*.08)%4.8)*birth;positions[i*3+2]=Math.cos(a)*r*.6}dustGeo.attributes.position.needsUpdate=true;dustMat.opacity=birth*.85
   jewel.rotation.z=idle*.08;cloudMeshes.forEach((o,i)=>{o.position.x=Math.sin(idle*.04+i)*.4;(o.material as T.MeshBasicMaterial).opacity=birth*.65})
   composer.render();if(performance.now()-start>45)slow++;if(slow>35&&quality>.7){quality=.7;renderer.setPixelRatio(quality);composer.setPixelRatio(quality);dustGeo.setDrawRange(0,Math.min(count,500));resize();slow=0}
  },dispose(){disposed=true;host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Points){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m))}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());bookEnv.dispose();env.dispose();composer.passes.forEach(pass=>pass.dispose());composer.dispose();renderer.dispose();renderer.domElement.remove()}}
}
