import * as T from 'three'

/** Book-only PBR maps. Green/blue share roughness/metalness to avoid a fourth texture. */
export function createLeatherMaps() {
  const size = 1024
  const canvas = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c }
  const color = canvas(), height = canvas(), surface = canvas()
  const context = color.getContext('2d')!
  const artwork = createBookArt('cover')
  context.drawImage(artwork.image, 0, 0, size, size)
  artwork.dispose()
  const pigment = context.getImageData(0, 0, size, size)
  const relief = height.getContext('2d')!.createImageData(size, size)
  const finish = surface.getContext('2d')!.createImageData(size, size)
  let seed = 317
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 }
  const field = (cells: number) => {
    const data = Float32Array.from({ length: (cells + 1) ** 2 }, random)
    return (x: number, y: number) => {
      const u = x / size * cells, v = y / size * cells, ix = Math.floor(u), iy = Math.floor(v)
      const fx = u - ix, fy = v - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
      const a = iy * (cells + 1) + ix
      return T.MathUtils.lerp(T.MathUtils.lerp(data[a], data[a + 1], sx), T.MathUtils.lerp(data[a + cells + 1], data[a + cells + 2], sx), sy)
    }
  }
  const broad = field(9), pores = field(210), folds = field(43)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, r = pigment.data[i], g = pigment.data[i + 1], b = pigment.data[i + 2]
    const foil = T.MathUtils.smoothstep(g - b, 12, 40)
    const grain = pores(x, y), cloud = broad(x, y)
    const crease = 1 - T.MathUtils.smoothstep(Math.abs(folds(x, y) - .5), .015, .085)
    const edge = 1 - T.MathUtils.smoothstep(Math.min(x, y, size - 1 - x, size - 1 - y), 0, 35)
    const shade = .72 + cloud * .36 + grain * .12 - crease * .07
    pigment.data[i] = T.MathUtils.lerp(69 * shade + edge * 9, r, foil)
    pigment.data[i + 1] = T.MathUtils.lerp(21 * shade + edge * 3, g, foil)
    pigment.data[i + 2] = T.MathUtils.lerp(65 * shade + edge * 7, b, foil)
    const h = 128 + (grain - .5) * 63 - crease * 20 + foil * 20
    relief.data[i] = relief.data[i + 1] = relief.data[i + 2] = h; relief.data[i + 3] = 255
    finish.data[i] = 255
    finish.data[i + 1] = T.MathUtils.lerp(142 + (grain - .5) * 34 - edge * 22, 70, foil)
    finish.data[i + 2] = foil * 245; finish.data[i + 3] = 255
  }
  context.putImageData(pigment, 0, 0)
  height.getContext('2d')!.putImageData(relief, 0, 0)
  surface.getContext('2d')!.putImageData(finish, 0, 0)
  const map = new T.CanvasTexture(color), bumpMap = new T.CanvasTexture(height), finishMap = new T.CanvasTexture(surface)
  map.colorSpace = T.SRGBColorSpace
  bumpMap.colorSpace = finishMap.colorSpace = T.NoColorSpace
  return { map, bumpMap, finishMap }
}

export const bookChapters = [
  { title: ['Подобрать ключ', 'к сердцу'], subtitle: 'ИСКУССТВО ПОНИМАТЬ', caption: 'Доверие открывает невидимые двери.' },
  { title: ['Витать', 'в облаках'], subtitle: 'АТЛАС ВООБРАЖЕНИЯ', caption: 'Там, где мысль становится полётом.' },
  { title: ['Дело', 'в шляпе'], subtitle: 'МАЛЕНЬКОЕ ТОРЖЕСТВО', caption: 'Когда всё удалось.' },
  { title: ['Золотые', 'руки'], subtitle: 'МАСТЕРСТВО И ТАЛАНТ', caption: 'Красота рождается в умелых руках.' },
]

/** Original book engravings, drawn locally at print-like resolution. No remote assets. */
export function createBookArt(kind: 'cover' | 'grain' | number): T.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 1536
  const x = c.getContext('2d')!
  const cover = kind === 'cover', grain = kind === 'grain'
  const wash = x.createLinearGradient(0,0,1536,1536)
  wash.addColorStop(0, cover ? '#230d29' : '#fff3d8'); wash.addColorStop(.5,cover ? '#641a43' : '#f8e4bd'); wash.addColorStop(1,cover ? '#260c32' : '#dfbf86')
  x.fillStyle = grain ? '#888' : wash; x.fillRect(0,0,1536,1536)
  let seed=71;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647}
  for(let i=0;i<42000;i++){const a=random();x.fillStyle=grain?`rgba(${a>.5?'255,255,255':'0,0,0'},.14)`:`rgba(${cover?'237,158,170':'109,64,30'},${a*.07})`;x.fillRect(random()*1536,random()*1536,cover?4:2,cover?2:1)}
  const gold=x.createLinearGradient(0,0,1000,1400);gold.addColorStop(0,'#f3da95');gold.addColorStop(.3,'#95632e');gold.addColorStop(.5,'#f8dfa1');gold.addColorStop(1,'#a26c31')
  function line(path:()=>void,color:string|CanvasGradient=gold,width=3){x.strokeStyle=color;x.lineWidth=width;x.beginPath();path();x.stroke()}
  function leaf(px:number,py:number,angle:number,size:number){x.save();x.translate(px,py);x.rotate(angle);x.fillStyle=gold;x.beginPath();x.moveTo(0,0);x.bezierCurveTo(size*.6,-size*.5,size,-size*.25,size,0);x.bezierCurveTo(size*.6,size*.4,size*.2,size*.2,0,0);x.fill();x.restore()}
  if(!grain){
    for(const inset of [48,61,87])line(()=>x.roundRect(inset,inset,1536-inset*2,1536-inset*2,22),gold,inset===61?6:2)
    for(let corner=0;corner<4;corner++){
      x.save();x.translate(corner%2?1440:96,corner>1?1440:96);x.scale(corner%2?-1:1,corner>1?-1:1)
      for(let j=0;j<3;j++)line(()=>{x.moveTo(0,15+j*12);x.bezierCurveTo(200,-20,320,120,155,200);x.bezierCurveTo(65,220,60,100,125,112);x.bezierCurveTo(170,120,155,165,122,155)},gold,4-j)
      for(let j=0;j<8;j++){leaf(30+j*23,25+j*j*2,j*.14-.7,38);leaf(25+j*j*2,30+j*23,1.8-j*.14,32)}
      x.restore()
    }
  }
  if(cover){
    x.textAlign='center';x.fillStyle=gold;x.font='italic 112px Georgia';x.fillText('Фразеологизмы',768,620)
    x.font='32px Georgia';x.fillText('КНИГА СКРЫТЫХ СМЫСЛОВ',768,710)
    for(let j=0;j<20;j++){leaf(510+j*25,900-Math.sin(j/19*Math.PI)*50,-.6,55);leaf(510+j*25,900-Math.sin(j/19*Math.PI)*50,.8,45)}
  } else if(typeof kind==='number') {
    const chapter=bookChapters[kind]
    x.textAlign='center';x.fillStyle='#805337';x.font='28px Georgia';x.fillText(chapter.subtitle,768,182)
    x.fillStyle='#381022';x.font='italic 164px Georgia';chapter.title.forEach((t,i)=>x.fillText(t,768,325+i*174))
    line(()=>{x.moveTo(510,545);x.bezierCurveTo(670,520,850,570,1026,545)},'#b88745',2)
    x.save();x.translate(768,790)
    const ink='#80543b';const goldPaint=x.createLinearGradient(-180,-200,160,240);goldPaint.addColorStop(0,'#fff2bb');goldPaint.addColorStop(.35,'#b47a2f');goldPaint.addColorStop(.55,'#f3d27a');goldPaint.addColorStop(1,'#93602d')
    if(kind===0){
      const ruby=x.createRadialGradient(-100,-100,10,0,0,310);ruby.addColorStop(0,'#d48098');ruby.addColorStop(.4,'#b95870');ruby.addColorStop(1,'#713047')
      x.fillStyle=ruby;x.beginPath();x.moveTo(0,190);x.bezierCurveTo(-360,-35,-180,-300,0,-120);x.bezierCurveTo(180,-300,360,-35,0,190);x.fill();x.strokeStyle='#86504c';x.lineWidth=3;x.stroke()
      line(()=>{x.moveTo(-120,-100);x.bezierCurveTo(-220,-140,-195,5,-135,35)},'#f9d9b0',5)
      x.save();x.translate(45,100);x.rotate(-.6);x.strokeStyle=goldPaint;x.lineWidth=23;x.beginPath();x.ellipse(-130,0,62,52,0,0,Math.PI*2);x.moveTo(-70,0);x.lineTo(200,0);x.stroke();x.fillStyle=goldPaint;x.fillRect(130,0,24,55);x.fillRect(180,0,24,75);x.restore()
    }else if(kind===1){
      for(let i=0;i<9;i++){const g=x.createRadialGradient((i-4)*65,140,4,(i-4)*65,140,110);g.addColorStop(0,'#fff6dc');g.addColorStop(.65,'#d5bdcc99');g.addColorStop(1,'#d5bdcc00');x.fillStyle=g;x.fillRect((i-4)*65-110,30,220,220)}
      const silk=x.createLinearGradient(-120,-200,130,50);silk.addColorStop(0,'#7d4f85');silk.addColorStop(.5,'#d1a6aa');silk.addColorStop(1,'#775282');x.fillStyle=silk;x.beginPath();x.ellipse(0,-70,125,157,0,0,Math.PI*2);x.fill()
      for(let i=-2;i<=2;i++)line(()=>x.ellipse(0,-70,Math.abs(i)*49+9,157,0,0,Math.PI*2),'#e8cd8c',3)
      line(()=>{x.moveTo(-70,65);x.lineTo(-42,170);x.lineTo(42,170);x.lineTo(70,65)},ink,3);x.fillStyle=goldPaint;x.fillRect(-45,166,90,62)
      for(let i=0;i<5;i++)line(()=>{x.moveTo(-40,177+i*9);x.lineTo(40,177+i*9)},ink,1)
    }else if(kind===2){
      const velvet=x.createLinearGradient(-180,0,180,0);velvet.addColorStop(0,'#28182f');velvet.addColorStop(.4,'#755076');velvet.addColorStop(1,'#30172f');x.fillStyle=velvet;x.beginPath();x.ellipse(0,130,250,65,-.12,0,Math.PI*2);x.fill();x.beginPath();x.moveTo(-145,110);x.lineTo(-165,-150);x.bezierCurveTo(-50,-185,80,-185,160,-150);x.lineTo(142,110);x.quadraticCurveTo(0,160,-145,110);x.fill();x.fillStyle=goldPaint;x.fillRect(-145,60,290,42);x.fillStyle='#946586';x.beginPath();x.ellipse(0,-150,162,38,0,0,Math.PI*2);x.fill();line(()=>x.ellipse(0,-150,162,38,0,0,Math.PI*2),goldPaint,5)
    }else{
      for(const side of [-1,1]){x.save();x.scale(side,1);x.fillStyle=goldPaint;x.beginPath();x.moveTo(35,200);x.bezierCurveTo(90,90,155,130,150,20);x.lineTo(140,-125);x.quadraticCurveTo(120,-155,110,-120);x.lineTo(102,10);x.lineTo(80,-170);x.quadraticCurveTo(50,-190,48,-150);x.lineTo(58,0);x.lineTo(22,-130);x.quadraticCurveTo(-10,-150,-2,-110);x.lineTo(20,45);x.bezierCurveTo(-70,-35,-110,20,-20,100);x.lineTo(-10,190);x.closePath();x.fill();x.strokeStyle=ink;x.lineWidth=2;x.stroke();line(()=>{x.moveTo(20,90);x.quadraticCurveTo(75,45,115,70)},ink,2);x.restore()}
      line(()=>{x.moveTo(-230,230);x.lineTo(220,-200)},'#6b3652',15);line(()=>{x.moveTo(170,-150);x.lineTo(220,-200)},goldPaint,24)
    }
    x.restore();x.fillStyle='#79503d';x.font='italic 46px Georgia';x.fillText(chapter.caption,768,1160)
    x.font='24px Georgia';x.fillStyle='#a47b49';x.fillText('ЛАБОРАТОРИЯ СМЫСЛА',768,1270);x.font='30px Georgia';x.fillText(['I','II','III','IV'][kind],768,1390)
  }
  const t=new T.CanvasTexture(c);t.colorSpace=grain?T.NoColorSpace:T.SRGBColorSpace;return t
}
