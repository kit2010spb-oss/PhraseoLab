import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import './particle-title.css'

type Point = { x:number; y:number; sx:number; sy:number; z:number; delay:number; size:number }
export function ParticleTitle() {
  const host=useRef<HTMLDivElement>(null), canvas=useRef<HTMLCanvasElement>(null), heading=useRef<HTMLHeadingElement>(null)
  const trigger=useRef<()=>void>(()=>{})
  const [phase,setPhase]=useState<'waiting'|'forming'|'complete'>('waiting')
  useLayoutEffect(()=>{
    const el=host.current!, surface=canvas.current!, title=heading.current!
    const ctx=surface.getContext('2d')
    let timeline:gsap.core.Timeline|undefined, started=false, done=false, disposed=false
    let w=0,h=0,points:Point[]=[]
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
        x=w/2+(x-w/2)*projection;y=h/2+(y-h/2)*projection
        const radius=(p.size*(2+3*r)+p.z*r*12)*projection
        ctx.globalAlpha=Math.min(1,t*.8)*fade*(.65+.25*Math.sin(p.delay*8+t));ctx.drawImage(sprites[p.z>1.6?1:0],x-radius/2,y-radius/2,radius,radius)
        if(progress>.7){ctx.fillStyle='#ffe2a5';ctx.globalAlpha=fade*ease;ctx.fillRect(x,y,1.3,1.3)}
      }ctx.restore()
    }
    function finish(){if(!started)return;done=true;timeline?.kill();setPhase('complete');gsap.set(title,{opacity:1,clearProps:'filter,transform'});if(ctx&&!reduce.matches){frame.t=8.8;draw()}}
    function start(){if(started||disposed)return;started=true;setPhase('forming');if(reduce.matches||!ctx){finish();return}
      void document.fonts.ready.then(()=>{if(disposed||done)return;try{sample()}catch{finish();return}
        timeline=gsap.timeline({onComplete:finish});timeline.to(frame,{t:8.8,duration:8.8,ease:'none',onUpdate:draw},0)
        timeline.fromTo(title,{opacity:0},{opacity:1,duration:1.5,ease:'sine.inOut'},6.8)
      })
    }
    trigger.current=start
    const resize=new ResizeObserver(()=>{if(started&&!done)finish();size()});resize.observe(el)
    function motion(){if(reduce.matches&&started)finish()}
    function visibility(){timeline?.paused(document.hidden||!visible)}
    let visible=true;const intersection=new IntersectionObserver(([e])=>{visible=e.isIntersecting;visibility()});intersection.observe(el)
    reduce.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility)
    size()
    return()=>{disposed=true;timeline?.kill();resize.disconnect();intersection.disconnect();reduce.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility)}
  },[])
  return <div className="premiere-stage" ref={host} data-phase={phase}>
    <div className="premiere-world" aria-hidden="true"><div className="library-depth"/><div className="library-window"/><div className="light-shaft"/><div className="violet-mist"/><svg className="enchanted-book" viewBox="0 0 1000 320"><defs><linearGradient id="page-light" x2="0" y2="1"><stop stopColor="#fff0c9"/><stop offset=".35" stopColor="#c89a68"/><stop offset="1" stopColor="#3b1e26"/></linearGradient><linearGradient id="book-cover"><stop stopColor="#20131e"/><stop offset=".5" stopColor="#885337"/><stop offset="1" stopColor="#211427"/></linearGradient><filter id="book-glow"><feGaussianBlur stdDeviation="12"/></filter></defs><ellipse cx="500" cy="252" rx="440" ry="42" fill="#020107" opacity=".8"/><path d="M65 220Q280 175 500 255Q720 175 935 220L920 255Q710 215 500 280Q290 215 80 255Z" fill="url(#book-cover)" stroke="#b78650"/><path d="M110 83Q310 30 500 220Q690 30 890 83L935 220Q710 170 500 255Q290 170 65 220Z" fill="url(#page-light)" stroke="#eec188"/>{Array.from({length:19},(_,i)=><path key={i} d={`M${108-i*2} ${92+i*6}Q300 ${48+i*6} 500 ${220+i*1.7}Q700 ${48+i*6} ${892+i*2} ${92+i*6}`} fill="none" stroke={i%3===0?'#ffdf9d':'#513023'} strokeWidth={i%3===0?1.4:.7} opacity=".6"/>)}<path d="M110 83Q310 30 500 220Q690 30 890 83" fill="none" stroke="#ffb952" strokeWidth="12" filter="url(#book-glow)"/><path d="M110 83Q310 30 500 220Q690 30 890 83" fill="none" stroke="#ffe6b1" strokeWidth="2"/></svg><div className="premiere-vignette"/></div>
    <h1 ref={heading} className="premiere-title" aria-label="Фразеологизмы" aria-hidden={phase!=='complete'}>{Array.from('ФРАЗЕОЛОГИЗМЫ',(letter,i)=><span data-letter key={i}>{letter}</span>)}</h1>
    <canvas ref={canvas} className="premiere-particles" aria-hidden="true"/>
    {phase==='waiting'&&<button className="premiere-start" aria-label="Начать заставку. Нажмите Enter, пробел или коснитесь экрана" onClick={()=>trigger.current()}/>}
    <a className="premiere-scroll" href="#theory" tabIndex={phase==='complete'?0:-1} aria-hidden={phase!=='complete'}>Прокрути, чтобы открыть скрытый смысл слов<span aria-hidden="true">↓</span></a>
  </div>
}
