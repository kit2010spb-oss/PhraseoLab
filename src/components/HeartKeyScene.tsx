import { useEffect, useRef, useState } from 'react'
import type { HeartStage } from './heart-stage'
import './heart-key.css'

export function HeartKeyScene() {
  const container = useRef<HTMLDivElement>(null)
  const stage = useRef<HeartStage | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'playing' | 'revealed' | 'fallback'>('loading')
  useEffect(() => {
    let disposed = false
    // Load WebGL only as this particular scene approaches the viewport.
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      void import('./heart-stage').then(({ createHeartStage }) => {
        if (disposed) return
        stage.current = createHeartStage(container.current!, () => setStatus('revealed'))
        setStatus('ready')
      }).catch(() => { if (!disposed) setStatus('fallback') })
    }, { rootMargin: '250px' })
    observer.observe(container.current!)
    return () => { disposed = true; observer.disconnect(); stage.current?.dispose(); stage.current = null }
  }, [])

  function reveal() {
    if (!stage.current && status !== 'loading') { setStatus('revealed'); return }
    if (!stage.current || status === 'playing') return
    setStatus('playing')
    stage.current.play()
  }
  return <article className="heart-scene" aria-labelledby="heart-scene-title" data-state={status}>
    <div className="heart-scene-top"><span>ЛАБОРАТОРИЯ СМЫСЛА / 01</span><span>СЛОВА СТАНОВЯТСЯ БЛИЖЕ</span></div>
    <div className="heart-stage" ref={container} role="img" aria-label="Объёмное розовое стеклянное сердце и золотой ключ. При раскрытии смысла ключ открывает замок сердца." />
    {status === 'loading' && <span className="heart-loading" role="status">Настраиваем свет…</span>}
    {status === 'fallback' && <p className="heart-fallback">3D недоступно в этом браузере. Значение выражения можно раскрыть кнопкой ниже.</p>}
    <div className="heart-scene-copy"><span className="heart-kicker">Не каждый ключ открывает дверь.</span><h3 id="heart-scene-title">Подобрать ключ<br/><em>к сердцу</em></h3><p>Иногда самое важное —<br/>найти не слова, а подход.</p></div>
    <div className="heart-scene-bottom"><div className="heart-meaning" aria-live="polite"><span>{status === 'revealed' ? 'СМЫСЛ РАСКРЫТ' : 'ОТ ОБРАЗА К ЗНАЧЕНИЮ'}</span><p>{status === 'revealed' ? 'Найти подход к человеку, завоевать его доверие и расположение' : 'У каждого сердца — свой ключ.'}</p></div><button className="heart-reveal" onClick={reveal} disabled={status === 'loading' || status === 'playing'}>{status === 'playing' ? 'Открываем…' : status === 'revealed' ? 'Повторить' : 'Раскрыть смысл'}<span aria-hidden="true">{status === 'revealed' ? '↺' : '↗'}</span></button></div>
  </article>
}
