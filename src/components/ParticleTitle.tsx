import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import './particle-title.css'
import type { PremiereWorld } from './premiere-world'

type Point = { x:number; y:number; sx:number; sy:number; z:number; delay:number; size:number }
export function ParticleTitle() {
  const host=useRef<HTMLDivElement>(null), canvas=useRef<HTMLCanvasElement>(null), heading=useRef<HTMLHeadingElement>(null)
  const worldHost=useRef<HTMLDivElement>(null)
  const [fallback,setFallback]=useState(false)
  const trigger=useRef<()=>void>(()=>{})
  const [phase,setPhase]=useState<'waiting'|'forming'|'complete'>('waiting')
  useLayoutEffect(()=>{
    const el=host.current!, surface=canvas.current!, title=heading.current!
    const ctx=surface.getContext('2d')
    let timeline:gsap.core.Timeline|undefined, started=false, done=false, disposed=false
    let w=0,h=0,points:Point[]=[]
    let world:PremiereWorld|undefined,raf=0,playhead=0,ambient=0,last=0
    let visible=true
    const frame={t:0}, reduce=matchMedia('(prefers-reduced-motion: reduce)')
    const sprites=['255,204,133','178,114,255'].map(rgb=>{const c=document.createElement('canvas');c.width=c.height=48;const x=c.getContext('2d')!;const g=x.createRadialGradient(24,24,0,24,24,24);g.addColorStop(0,'#fff5de');g.addColorStop(.12,`rgba(${rgb},.95)`);g.addColorStop(.4,`rgba(${rgb},.25)`);g.addColorStop(1,`rgba(${rgb},0)`);x.fillStyle=g;x.fillRect(0,0,48,48);return c})
    function size(){w=el.clientWidth;h=el.clientHeight;const d=Math.min(devicePixelRatio,1.5);surface.width=w*d;surface.height=h*d;ctx?.setTransform(d,0,0,d,0,0)}
    function sample(){
      size();if(!ctx)return
      const mask=document.createElement('canvas');mask.width=w;mask.height=h;const ink=mask.getContext('2d',{willReadFrequently:true})!;const style=getComputedStyle(title)
      ink.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;ink.fillStyle='#fff'
      const bounds=el.getBoundingClientRect()
      title.querySelectorAll<HTMLElement>('[data-letter]').forEach(g=>{const r=g.getBoundingClientRect(),m=ink.measureText(g.textContent!);ink.fillText(g.textContent!,r.left-bounds.left,r.top-bounds.top+(r.height-m.fontBoundingBoxAscent-m.fontBoundingBoxDescent)/2+m.fontBoundingBoxAscent)})
      const pixels=ink.getImageData(0,0,w,h).data,candidates:{x:number;y:number}[]=[]
      for(let y=0;y<h;y+=w<600?2:3)for(let x=0;x<w;x+=w<600?2:3)if(pixels[(y*w+x)*4+3]>120)candidates.push({x,y})
      let seed=2105;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647}
      const stride=Math.max(1,candidates.length/(w<600?2000:4200));points=[]
      for(let i=0;i<candidates.length;i+=stride){const p=candidates[Math.floor(i)],angle=rand()*Math.PI*2;points.push({...p,sx:w/2+Math.cos(angle)*w*(.2+rand()*.6),sy:h/2+Math.sin(angle)*h*(.2+rand()*.7),z:rand()*2,delay:rand()*.7+p.x/w*.6,size:.7+rand()*1.3})}
    }
    function draw(){if(!ctx)return;ctx.clearRect(0,0,w,h);const t=frame.t, fade=1-gsap.utils.clamp(0,1,(t-7)/1.8)
      ctx.save();ctx.globalCompositeOperation='lighter'
      const zoom=1+.22*(1-Math.min(1,t/6));ctx.translate(w/2,h/2);ctx.scale(zoom,zoom);ctx.translate(-w/2,-h/2)
      // Tilted, perspective light ribbons travel around the emerging lettering.
      for(let band=0;band<3;band++)for(let i=0;i<220;i++){
        const a=i/220*Math.PI*2+t*.16+band*.2,z=Math.sin(a),rx=w*(.3+band*.04)
        const x=w/2+Math.cos(a)*rx,y=h*.49+z*h*.16+(x-w/2)*-.16
        const s=(z+1.5)*2.5;ctx.globalAlpha=Math.min(1,t)*(.25+.75*fade)*(.08+(z+1)*.13);ctx.drawImage(sprites[band%2],x-s*2,y-s*2,s*4,s*4)
      }
      for(const p of points){const progress=gsap.utils.clamp(0,1,(t-.5-p.delay)/4.7),ease=1-Math.pow(1-progress,3),r=1-ease,projection=1/(1+p.z*r*.55)
        let x=p.sx+(p.x-p.sx)*ease+Math.sin(progress*Math.PI)*r*160*Math.sin(p.delay*6),y=p.sy+(p.y-p.sy)*ease-Math.sin(progress*Math.PI)*r*180
        x=w/2+(x-w/2)*projection*Math.min(1,t/1.1);y=h/2+(y-h/2)*projection*Math.min(1,t/1.1)
        const radius=(p.size*(2+3*r)+p.z*r*12)*projection
        ctx.globalAlpha=Math.min(1,t*.8)*fade*(.65+.25*Math.sin(p.delay*8+t));ctx.drawImage(sprites[p.z>1.6?1:0],x-radius/2,y-radius/2,radius,radius)
        if(progress>.7){ctx.fillStyle='#ffe2a5';ctx.globalAlpha=fade*ease;ctx.fillRect(x,y,1.3,1.3)}
      }ctx.restore()
    }
    function finish(){if(!started)return;done=true;setPhase('complete');gsap.set(title,{opacity:1,'--shine-x':'-100%'});frame.t=10;ctx?.clearRect(0,0,w,h);world?.update(10,0,reduce.matches)}
    function loop(now:number){
      raf=0;if(disposed)return
      const delta=last?(now-last)/1000:0;last=now
      if(visible&&!document.hidden){
        if(!done){playhead+=delta;timeline?.totalTime(playhead)}
        ambient+=reduce.matches?0:delta
        world?.update(frame.t,ambient,reduce.matches)
      }
      if(!reduce.matches)raf=requestAnimationFrame(loop)
    }
    function start(){if(started||disposed)return;started=true;setPhase('forming')
      void Promise.all([document.fonts.ready,import('./premiere-world')]).then(([,module])=>{
        if(disposed)return
        try{world=module.createPremiereWorld(worldHost.current!)}catch{setFallback(true)}
        if(reduce.matches||!ctx){finish();return}
        try{sample()}catch{finish();return}
        timeline=gsap.timeline({paused:true,onComplete:finish})
        timeline.to(frame,{t:10,duration:10,ease:'none',onUpdate:draw},0)
        timeline.fromTo(title,{opacity:0},{opacity:1,duration:1.5,ease:'sine.inOut'},6.8)
        timeline.fromTo(title,{'--shine-x':'200%'},{'--shine-x':'-100%',duration:1.35,ease:'sine.inOut'},8.35)
        raf=requestAnimationFrame(loop)
      }).catch(()=>{if(!disposed){setFallback(true);finish()}})
    }
    function keyboard(e:KeyboardEvent){if(!started&&(e.key==='Enter'||e.key===' ')&&(e.target===document.body||el.contains(e.target as Node))){e.preventDefault();start()}}
    window.addEventListener('keydown',keyboard)
    trigger.current=start
    const resize=new ResizeObserver(()=>{size();world?.resize();if(started&&!done&&points.length)sample();if(done){ctx?.clearRect(0,0,w,h);world?.update(10,ambient,reduce.matches)}});resize.observe(el)
    function motion(){if(reduce.matches&&started){timeline?.kill();cancelAnimationFrame(raf);raf=0;finish()}else if(started&&!raf){last=0;raf=requestAnimationFrame(loop)}}
    function visibility(){last=0}
    const intersection=new IntersectionObserver(([e])=>{visible=e.isIntersecting;visibility()});intersection.observe(el)
    reduce.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility)
    size()
    return()=>{disposed=true;window.removeEventListener('keydown',keyboard);timeline?.kill();cancelAnimationFrame(raf);world?.dispose();resize.disconnect();intersection.disconnect();reduce.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility)}
  },[])
  return <div className="premiere-stage" ref={host} data-phase={phase} data-intro-version="cinematic-2">
    <div className="premiere-webgl" ref={worldHost} aria-hidden="true"/>
    <h1 ref={heading} className="premiere-title" aria-label="Фразеологизмы" aria-hidden={phase!=='complete'}>{Array.from('ФРАЗЕОЛОГИЗМЫ',(letter,i)=><span data-letter key={i}>{letter}</span>)}</h1>
    <canvas ref={canvas} className="premiere-particles" aria-hidden="true"/>
    {phase==='waiting'&&<button className="premiere-start" aria-label="Начать заставку. Нажмите Enter, пробел или коснитесь экрана" onClick={()=>trigger.current()}><span className="premiere-spark"/></button>}
    {fallback&&<p className="premiere-fallback" role="status">3D недоступно в этом браузере. Показана упрощённая заставка.</p>}
    <a className="premiere-scroll" href="#theory" tabIndex={phase==='complete'?0:-1} aria-hidden={phase!=='complete'}>Прокрути, чтобы открыть скрытый смысл слов<span aria-hidden="true">↓</span></a>
  </div>
}
