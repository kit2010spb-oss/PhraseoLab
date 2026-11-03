export type GameState = { scores: number[]; used: string[]; turn: number }
export const initialGame = (): GameState => ({ scores: [0, 0, 0], used: [], turn: 0 })
export function answerCard(state: GameState, id: string, level: number, correct: boolean): GameState {
  if (state.used.includes(id)) return state
  return { scores: state.scores.map((score, i) => score + (i === state.turn && correct ? level : 0)), used: [...state.used, id], turn: (state.turn + 1) % 3 }
}
