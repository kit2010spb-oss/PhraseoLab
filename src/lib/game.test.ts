import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialGame, answerCard } from './game.ts'
test('correct answers award level points, errors award none and turns rotate', () => {
 let s = answerCard(initialGame(), 'a', 3, true)
 assert.deepEqual(s.scores, [3, 0, 0]); assert.equal(s.turn, 1)
 s = answerCard(s, 'b', 2, false)
 assert.deepEqual(s.scores, [3, 0, 0]); assert.equal(s.turn, 2)
 s = answerCard(s, 'c', 2, true)
 assert.deepEqual(s.scores, [3, 0, 2]); assert.equal(s.turn, 0)
})
test('a card cannot be scored twice', () => {
 const s = answerCard(initialGame(), 'a', 1, true)
 assert.equal(answerCard(s, 'a', 1, true), s)
})
