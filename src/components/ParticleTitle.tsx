import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import './particle-title.css'

type Particle = {
  x: number; y: number; sx: number; sy: number
  bend: number; depth: number; delay: number; radius: number; gold: boolean
}

/** DOM lettering is the accessible, sharp final frame; canvas is only the light pass. */
export function ParticleTitle() {
  const host = useRef<HTMLDivElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const element = host.current!
    const heading = title.current!
    const surface = canvas.current!
    const context = surface.getContext('2d')
    if (!context) return

    let timeline: gsap.core.Timeline | undefined
    let observer: IntersectionObserver | undefined
    let particles: Particle[] = []
    let disposed = false
    let complete = false
    let visible = true
    let width = 0
    let height = 0
    const frame = { time: 0 }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')

    // Pre-render soft light sprites: no per-particle shadowBlur or gradient allocation.
    const sprites = ['174,143,208', '220,176,100'].map(color => {
      const sprite = document.createElement('canvas')
      sprite.width = sprite.height = 48
      const ctx = sprite.getContext('2d')!
      const gradient = ctx.createRadialGradient(24, 24, 0, 24, 24, 24)
      gradient.addColorStop(0, `rgba(${color},1)`)
      gradient.addColorStop(.15, `rgba(${color},.85)`)
      gradient.addColorStop(.4, `rgba(${color},.22)`)
      gradient.addColorStop(1, `rgba(${color},0)`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 48, 48)
      return sprite
    })

    function finish() {
      complete = true
      timeline?.kill()
      gsap.set(heading, { clearProps: 'opacity,transform,filter' })
      element.dataset.phase = 'complete'
      context!.clearRect(0, 0, width, height)
    }

    function sample() {
      const bounds = element.getBoundingClientRect()
      width = bounds.width + 200
      height = bounds.height + 160
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      surface.width = Math.round(width * dpr)
      surface.height = Math.round(height * dpr)
      context!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const mask = document.createElement('canvas')
      mask.width = Math.ceil(width)
      mask.height = Math.ceil(height)
      const ink = mask.getContext('2d', { willReadFrequently: true })!
      const style = getComputedStyle(heading)
      ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      ink.textBaseline = 'alphabetic'
      ink.fillStyle = '#fff'
      // Measure each real glyph, including kerning/letter spacing and responsive wrapping.
      heading.querySelectorAll<HTMLElement>('[data-glyph]').forEach(glyph => {
        const rect = glyph.getBoundingClientRect()
        const metrics = ink.measureText(glyph.textContent!)
        const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent
        const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent
        const baseline = rect.top - bounds.top + 80 + (rect.height - ascent - descent) / 2 + ascent
        ink.fillText(glyph.textContent!, rect.left - bounds.left + 100, baseline)
      })
      const pixels = ink.getImageData(0, 0, mask.width, mask.height).data
      const candidates: { x: number; y: number }[] = []
      const step = width < 500 ? 3 : 4
      for (let y = 0; y < mask.height; y += step) {
        for (let x = 0; x < mask.width; x += step) {
          if (pixels[(y * mask.width + x) * 4 + 3] > 130) candidates.push({ x, y })
        }
      }
      const limit = width < 500 ? 1600 : 2500
      const stride = Math.max(1, candidates.length / limit)
      // Seeded distribution avoids a different composition on every resize/mount.
      let seed = 2513
      const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
      particles = []
      for (let i = 0; i < candidates.length; i += stride) {
        const point = candidates[Math.floor(i)]
        const angle = random() * Math.PI * 2
        const distance = 120 + random() * width * .75
        particles.push({ ...point, sx: point.x + Math.cos(angle) * distance,
          sy: point.y + Math.sin(angle) * distance * .65,
          bend: (random() - .5) * 240, depth: .3 + random() * 1.5,
          delay: random() * .8 + point.x / width * .35,
          radius: .65 + random() * .85, gold: random() > .72 })
      }
    }

    function draw() {
      context!.clearRect(0, 0, width, height)
      const t = frame.time
      const fade = 1 - gsap.utils.clamp(0, 1, (t - 4.8) / 1.2)
      const camera = 1 + .12 * (1 - Math.min(1, t / 5))
      context!.save()
      context!.translate(width / 2, height / 2)
      context!.scale(camera, camera)
      context!.translate(-width / 2, -height / 2)
      for (const p of particles) {
        const progress = gsap.utils.clamp(0, 1, (t - .35 - p.delay) / 3.7)
        const ease = 1 - Math.pow(1 - progress, 3)
        const remaining = 1 - ease
        const arc = Math.sin(progress * Math.PI) * remaining
        // Project the initial depth toward the lettering plane as the camera settles.
        const projection = 1 / (1 + p.depth * remaining * .5)
        let x = p.sx + (p.x - p.sx) * ease + p.bend * arc
        let y = p.sy + (p.y - p.sy) * ease - Math.abs(p.bend) * arc * .6
        x = width / 2 + (x - width / 2) * projection
        y = height / 2 + (y - height / 2) * projection
        const appear = gsap.utils.clamp(0, 1, (t - p.delay * .35) * 1.6)
        context!.globalAlpha = appear * fade * (.65 + .25 * Math.sin(t * 2 + p.delay * 7))
        const size = (p.radius * 8 + remaining * p.depth * 6) * projection
        context!.drawImage(sprites[p.gold ? 1 : 0], x - size / 2, y - size / 2, size, size)
        if (progress > .4) {
          context!.globalAlpha = appear * fade * ease * .65
          context!.fillStyle = p.gold ? '#ab854e' : '#796083'
          context!.fillRect(x, y, p.radius, p.radius)
        }
      }
      context!.restore()
    }

    function start() {
      if (disposed || complete) return
      if (motion.matches) { finish(); return }
      try { sample() } catch { finish(); return }
      element.dataset.phase = 'forming'
      timeline = gsap.timeline({ onComplete: finish, paused: !visible || document.hidden })
      timeline.set(heading, { opacity: 0 })
      timeline.to(frame, { time: 6.1, duration: 6.1, ease: 'none', onUpdate: draw }, 0)
      timeline.fromTo(heading, { opacity: 0, filter: 'blur(3px)', scale: 1.012 },
        { opacity: 1, filter: 'blur(0px)', scale: 1, duration: 1.45, ease: 'power2.out' }, 4.2)
    }

    function syncVisibility() {
      if (!complete) timeline?.paused(!visible || document.hidden)
    }
    function onMotion() { if (motion.matches) finish() }
    // A resize ends the one-shot effect rather than sampling transformed glyphs or replaying it.
    let lastWidth = element.clientWidth
    const resize = new ResizeObserver(() => {
      if (Math.abs(element.clientWidth - lastWidth) > 2) {
        lastWidth = element.clientWidth
        finish()
      }
    })
    resize.observe(element)
    observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncVisibility() })
    observer.observe(element)
    document.addEventListener('visibilitychange', syncVisibility)
    motion.addEventListener('change', onMotion)
    // No invisible title while fonts are loading; only hide once canvas is ready.
    void document.fonts.ready.then(start)
    return () => {
      disposed = true
      timeline?.kill()
      resize.disconnect()
      observer?.disconnect()
      document.removeEventListener('visibilitychange', syncVisibility)
      motion.removeEventListener('change', onMotion)
      gsap.set(heading, { clearProps: 'opacity,transform,filter' })
    }
  }, [])

  return <div className="particle-title" ref={host}>
    <div className="title-light title-light-lavender" aria-hidden="true" />
    <div className="title-light title-light-gold" aria-hidden="true" />
    <h1 ref={title} aria-label="Фразеологизмы">
      <span aria-hidden="true">{Array.from('Фразео', (letter, i) => <span data-glyph key={i}>{letter}</span>)}</span><br />
      <span className="title-second" aria-hidden="true">{Array.from('логизмы', (letter, i) => <span data-glyph key={i}>{letter}</span>)}<span className="title-dot" data-glyph>.</span></span>
    </h1>
    <canvas ref={canvas} className="title-particles" aria-hidden="true" />
  </div>
}
