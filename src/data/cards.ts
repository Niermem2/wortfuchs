import { db } from './db'
import { supabase } from './supabase'
import type { Card } from './types'

export type CardFields = Pick<
  Card,
  'english' | 'phonetic' | 'german' | 'example_en' | 'example_de' | 'note'
>

export async function createCard(lessonId: number, fields: CardFields): Promise<Card> {
  const card: Card = {
    id: crypto.randomUUID(),
    lesson_id: lessonId,
    ...fields,
    is_custom: true,
    active: true,
    updated_at: new Date().toISOString(),
    dirty: 1,
  }
  await db.cards.put(card)
  return card
}

export async function updateCard(id: string, patch: Partial<CardFields & { active: boolean }>) {
  await db.cards.update(id, { ...patch, updated_at: new Date().toISOString(), dirty: 1 })
}

/** Löschen nur für eigene Karten; offline wird stattdessen deaktiviert,
    damit die Karte beim nächsten Sync nicht vom Server zurückkommt. */
export async function deleteCard(card: Card) {
  if (!card.is_custom) return
  if (supabase) {
    const { error } = await supabase.from('cards').delete().eq('id', card.id)
    if (error) {
      await updateCard(card.id, { active: false })
      return
    }
  }
  await db.cards.delete(card.id)
  await db.progress.filter((p) => p.card_id === card.id).delete()
}
