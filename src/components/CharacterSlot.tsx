// Replace this visual slot with an approved asset or a 3D renderer later.
export type CharacterRole = 'kitten' | 'mother' | 'dance'
export function CharacterSlot({ name, tone = 0 }: { name: string; tone?: number }) {
 return <div className={`character character-${tone}`} aria-label={`Место для персонажа: ${name}`}><div className="character-ears"/><span className="character-face">· ω ·</span><span className="character-label">персонаж скоро</span></div>
}
