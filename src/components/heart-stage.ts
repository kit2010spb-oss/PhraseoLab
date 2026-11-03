import * as T from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import gsap from 'gsap'

export type HeartStage = { play: () => void; dispose: () => void }

export function createHeartStage(host: HTMLElement, onReveal: () => void): HeartStage {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  const gl = renderer.getContext()
  const debug = gl.getExtension('WEBGL_debug_renderer_info')
  const software = debug && /swiftshader|llvmpipe/i.test(String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)))
  renderer.setPixelRatio(software ? .75 : Math.min(devicePixelRatio, 1.5))
  renderer.transmissionResolutionScale = .65
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  host.append(renderer.domElement)
  renderer.domElement.setAttribute('aria-hidden', 'true')
  const scene = new T.Scene()
  const camera = new T.PerspectiveCamera(34, 1, .1, 60)
  const pmrem = new T.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, .035)
  scene.environment = environment.texture
  scene.environmentIntensity = .8
  room.dispose()
  pmrem.dispose()

  const root = new T.Group()
  scene.add(root)
  const heart = new T.Group()
  heart.position.set(.85, .45, 0)
  heart.rotation.set(-.08, -.2, -.08)
  root.add(heart)

  // Sculpted outline with rounded, deep bevels; not a sphere or a flat icon.
  const outline = new T.Shape()
  outline.moveTo(0, -1.12)
  outline.bezierCurveTo(-.25, -.92, -1.18, -.28, -1.18, .43)
  outline.bezierCurveTo(-1.18, 1.17, -.35, 1.43, 0, .83)
  outline.bezierCurveTo(.35, 1.43, 1.18, 1.17, 1.18, .43)
  outline.bezierCurveTo(1.18, -.28, .25, -.92, 0, -1.12)
  // Two smoothly domed surfaces, joined at the contour, give the glass a lens-like volume.
  const contour = outline.getSpacedPoints(144).slice(0, -1)
  const count = contour.length, rings = 36
  const positions: number[] = [], indices: number[] = []
  for (let side = 0; side < 2; side++) {
    for (let ring = 0; ring <= rings; ring++) {
      const radius = Math.max(.0001, ring / rings)
      for (const point of contour) {
        positions.push(point.x * radius, .15 + (point.y - .15) * radius,
          (side === 0 ? 1 : -1) * (.1 + .53 * Math.sqrt(1 - radius * radius)))
      }
    }
  }
  const layer = (rings + 1) * count
  for (let side = 0; side < 2; side++) {
    for (let ring = 0; ring < rings; ring++) for (let j = 0; j < count; j++) {
      const a = side * layer + ring * count + j, b = side * layer + ring * count + (j + 1) % count
      const c = a + count, d = b + count
      if (side === 0) indices.push(a,c,b,b,c,d)
      else indices.push(a,b,c,b,d,c)
    }
  }
  for (let j = 0; j < count; j++) {
    const a = rings * count + j, b = rings * count + (j + 1) % count
    indices.push(a,b,a+layer,b,b+layer,a+layer)
  }
  const glassGeometry = new T.BufferGeometry()
  glassGeometry.setAttribute('position', new T.Float32BufferAttribute(positions,3))
  if (T.ShapeUtils.isClockWise(contour)) {
    for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]]
  }
  glassGeometry.setIndex(indices)
  glassGeometry.computeVertexNormals()
  const glass = new T.MeshPhysicalMaterial({ color: '#e989a2', metalness: .08, roughness: .09,
    transmission: .91, thickness: 1.1, ior: 1.46, clearcoat: 1, clearcoatRoughness: .06,
    attenuationColor: new T.Color('#ac153c'), attenuationDistance: 2.1, envMapIntensity: 1.6,
    iridescence: .16, iridescenceIOR: 1.3 })
  const shell = new T.Mesh(glassGeometry, glass)
  shell.castShadow = true
  heart.add(shell)
  const coreMaterial = new T.MeshPhysicalMaterial({ color: '#b52850', roughness: .21,
    metalness: .15, clearcoat: 1, emissive: '#dc194c', emissiveIntensity: .12,
    transmission: .25, thickness: .3 })
  const core = new T.Mesh(glassGeometry, coreMaterial)
  core.scale.set(.83, .83, .65)
  heart.add(core)
  const gold = new T.MeshStandardMaterial({ color: '#e9b951', metalness: 1, roughness: .2, envMapIntensity: 2 })
  const paleGold = new T.MeshStandardMaterial({ color: '#ffdea1', metalness: 1, roughness: .14 })
  const dark = new T.MeshStandardMaterial({ color: '#170b18', metalness: .5, roughness: .3 })

  function mesh(geometry: T.BufferGeometry, material: T.Material, parent: T.Object3D, x=0,y=0,z=0) {
    const object = new T.Mesh(geometry, material)
    object.position.set(x,y,z); object.castShadow = true; object.receiveShadow = true
    parent.add(object); return object
  }
  // An engraved, raised lock plate seated in the front face of the glass.
  mesh(new T.TorusGeometry(.195,.035,12,64), gold, heart,0,.05,.69)
  mesh(new T.CylinderGeometry(.19,.19,.045,64),gold,heart,0,.05,.66).rotation.x=Math.PI/2
  mesh(new T.CircleGeometry(.057,32),dark,heart,0,.085,.714)
  const slot = new T.Shape()
  slot.moveTo(-.025,.07);slot.lineTo(.025,.07);slot.lineTo(.052,-.09);slot.lineTo(-.052,-.09);slot.closePath()
  mesh(new T.ShapeGeometry(slot),dark,heart,0,0,.715)
  for (let i=0;i<12;i++) {
    const angle=i/12*Math.PI*2
    mesh(new T.SphereGeometry(.012,8,8),paleGold,heart,Math.sin(angle)*.16,.05+Math.cos(angle)*.16,.717)
  }

  const key = new T.Group()
  root.add(key)
  // Local key axis is Z: its tip meets the visible keyhole before turning.
  const keyBody = new T.Group()
  keyBody.rotation.y = Math.PI/2
  key.add(keyBody)
  const shaft = mesh(new T.CylinderGeometry(.045,.045,1.45,24),gold,keyBody,-.72,0,0)
  shaft.rotation.z=Math.PI/2
  const bow = new T.Group()
  bow.position.x=-1.65
  keyBody.add(bow)
  mesh(new T.TorusGeometry(.34,.064,16,72),gold,bow)
  mesh(new T.TorusGeometry(.255,.017,12,64),paleGold,bow)
  for (let i=0;i<4;i++) {
    const ornament=mesh(new T.TorusGeometry(.12,.028,12,40),gold,bow,Math.cos(i*Math.PI/2)*.18,Math.sin(i*Math.PI/2)*.18,.018)
    ornament.scale.set(1,.75,1)
  }
  mesh(new T.SphereGeometry(.085,24,16),paleGold,bow)
  for (const x of [-1.28,-1.17,-.48]) {
    const ring=mesh(new T.TorusGeometry(.06,.019,10,32),paleGold,keyBody,x)
    ring.rotation.y=Math.PI/2
  }
  const tooth = new T.Shape()
  tooth.moveTo(-.4,.02); tooth.lineTo(-.4,-.25);tooth.lineTo(-.3,-.25)
  tooth.lineTo(-.3,-.15);tooth.lineTo(-.22,-.15);tooth.lineTo(-.22,-.26)
  tooth.lineTo(-.1,-.26);tooth.lineTo(-.1,.02);tooth.closePath()
  const bit = mesh(new T.ExtrudeGeometry(tooth,{depth:.085,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:3}),gold,keyBody,0,0,-.042)
  bit.castShadow=true

  const floor = mesh(new T.PlaneGeometry(12,12),new T.ShadowMaterial({color:'#130713',opacity:.26}),scene,0,-1.45,0)
  floor.rotation.x=-Math.PI/2
  const ambient = new T.HemisphereLight('#ffcbd7','#1d0d24',1.1)
  scene.add(ambient)
  const keyLight=new T.SpotLight('#fff0d6',75,25,.55,.7,1.4)
  keyLight.position.set(-3,6,5);keyLight.castShadow=true;keyLight.shadow.mapSize.set(1024,1024)
  keyLight.target.position.set(.5,0,0);scene.add(keyLight,keyLight.target)
  const rim=new T.PointLight('#f25c86',24,14,2);rim.position.set(2.7,1,-2);scene.add(rim)
  const fill=new T.PointLight('#b9c5ff',12,14,2);fill.position.set(-2,2,3);scene.add(fill)
  const inner=new T.PointLight('#ff5776',1,5,2);inner.position.set(.8,.5,.8);scene.add(inner)
  // Large emissive studio panels are reflected in the polished surfaces by the environment.
  const halo = new T.Mesh(new T.RingGeometry(1.9,1.905,160),new T.MeshBasicMaterial({color:'#e1a579',transparent:true,opacity:.28,side:T.DoubleSide}))
  halo.position.set(.85,.5,-.9);halo.rotation.set(.15,.3,-.3);scene.add(halo)

  const reduced=matchMedia('(prefers-reduced-motion: reduce)')
  const pointer = new T.Vector2()
  let raf=0, visible=true, disposed=false, playing=false, revealed=false, mobile=false
  let timeline: gsap.core.Timeline | undefined
  let playhead = 0, lastFrame = performance.now()
  const clock=new T.Clock()
  const cameraState={distance:8.8}
  function reset() {
    key.position.set(-.7,.05,1.5)
    key.rotation.set(.08,-.95,-.45)
    heart.scale.setScalar(1)
    cameraState.distance=8.8
    coreMaterial.emissiveIntensity=.12
    inner.intensity=1;rim.intensity=24
  }
  reset()
  function render() {
    if(disposed)return
    const now = performance.now()
    const delta = (now - lastFrame) / 1000
    lastFrame = now
    if (playing && timeline) { playhead += delta; timeline.totalTime(playhead) }
    const elapsed=clock.getElapsedTime()
    if(!reduced.matches && !playing && !revealed) {
      key.position.y=.05+Math.sin(elapsed*.7)*.09
      key.rotation.z=-.45+Math.sin(elapsed*.45)*.1
      key.rotation.x=.08+Math.sin(elapsed*.6)*.16
    }
    root.rotation.y=T.MathUtils.lerp(root.rotation.y,reduced.matches?0:pointer.x*.1,.045)
    root.rotation.x=T.MathUtils.lerp(root.rotation.x,reduced.matches?0:-pointer.y*.05,.045)
    camera.position.set(mobile?.25:-1.65,mobile?1.25:1.1,cameraState.distance+(mobile?6.5:0))
    camera.lookAt(mobile?.2:-.8,mobile?.15:.1,0)
    renderer.render(scene,camera)
  }
  function loop() {raf=0;if(!visible||document.hidden||disposed)return;render();if(!reduced.matches)raf=requestAnimationFrame(loop)}
  function wake() {if(!raf && visible && !document.hidden){lastFrame=performance.now();loop()}}
  function resize() {
    const {width,height}=host.getBoundingClientRect();mobile=width<800
    renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();wake()
  }
  const resizer=new ResizeObserver(resize);resizer.observe(host)
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(!visible){cancelAnimationFrame(raf);raf=0;}else{wake()}})
  observer.observe(host)
  function move(event:PointerEvent){const r=host.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,(event.clientY-r.top)/r.height*2-1)}
  function leave(){pointer.set(0,0)}
  function visibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else if(visible){wake()}}
  function settle(){timeline?.kill();playing=false;revealed=true;key.position.set(.71,.55,.69);key.rotation.set(0,0,Math.PI/2);coreMaterial.emissiveIntensity=.7;inner.intensity=5;cameraState.distance=8.1;onReveal();render()}
  function motion(){if(reduced.matches){cancelAnimationFrame(raf);raf=0;if(playing)settle();else render()}else wake()}
  function contextLost(event:Event){event.preventDefault();cancelAnimationFrame(raf);raf=0;timeline?.kill();playing=false;onReveal()}
  renderer.domElement.addEventListener('webglcontextlost',contextLost)
  host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave)
  document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',motion)
  resize()
  return {
    play(){
      if(playing)return
      timeline?.kill();reset();revealed=false;playing=true
      if(reduced.matches){settle();return}
      // Approach on a sweeping arc, align the bit, insert, then turn in the lock.
      playhead=0;lastFrame=performance.now()
      timeline=gsap.timeline({paused:true,onComplete(){playing=false;revealed=true;onReveal()}})
      timeline.to(key.position,{x:.71,y:.55,z:1.55,duration:1.7,ease:'power2.inOut'},0)
      timeline.to(key.rotation,{x:0,y:0,z:0,duration:1.7,ease:'power2.inOut'},0)
      timeline.to(cameraState,{distance:8.1,duration:3.8,ease:'sine.inOut'},0)
      timeline.to(key.position,{z:.69,duration:1.05,ease:'power2.inOut'},1.7)
      timeline.to(key.rotation,{z:Math.PI/2,duration:1.25,ease:'power3.inOut'},2.75)
      timeline.to(coreMaterial,{emissiveIntensity:.7,duration:1.4},3.1)
      timeline.to(inner,{intensity:5,duration:1.4},3.1)
      timeline.to(rim,{intensity:38,duration:1.4},3.1)
      timeline.to(heart.scale,{x:1.035,y:1.035,z:1.035,duration:.55,yoyo:true,repeat:1,ease:'sine.inOut'},3.2)
      wake()
    },
    dispose(){disposed=true;cancelAnimationFrame(raf);timeline?.kill();observer.disconnect();resizer.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motion);renderer.domElement.removeEventListener('webglcontextlost',contextLost);const geometries=new Set<T.BufferGeometry>();const materials=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());environment.dispose();renderer.dispose();renderer.domElement.remove()}
  }
}
