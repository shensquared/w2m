import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RecentEvent {
  id: string
  name: string
  created_at: number
  username?: string
  user?: {
    name: string
    availability: Array<{
      time: string
      level: string // "preferred", "can_if_needed", "not_available"
    }>
  }
}

interface RecentsStore {
  recents: RecentEvent[]

  addRecent: (event: RecentEvent) => void
  removeRecent: (id: string) => void
  clearRecents: () => void
}

const useRecentsStore = create<RecentsStore>()(persist(
  set => ({
    recents: [],

    addRecent: event => set(state => ({
      recents: [{ ...state.recents.find(e => e.id === event.id), ...event }, ...state.recents.filter(e => e.id !== event.id)],
    })),
    removeRecent: id => set(state => ({
      recents: state.recents.filter(e => e.id !== id),
    })),
    clearRecents: () => set({ recents: [] }),
  }),
  {
    name: 'crabfit-recent',
    version: 2, // Increment version for new availability structure
    migrate: (persistedState, version) => {
      if (version === 0) {
        return {
          recents: (persistedState as { recents: {id: string, name: string, created: number }[] }).recents.map(ev => ({
            id: ev.id,
            name: ev.name,
            created_at: ev.created, // Field renamed
          })),
        } as any
      }
      if (version === 1) {
        // Migrate from old string[] availability to new structure
        const oldState = persistedState as { recents: Array<{
          id: string
          name: string
          created_at: number
          user?: {
            name: string
            availability: string[]
          }
        }> }
        return {
          recents: oldState.recents.map(ev => ({
            ...ev,
            user: ev.user ? {
              ...ev.user,
              availability: ev.user.availability.map(time => ({
                time,
                level: 'preferred' // Convert old available times to preferred
              }))
            } : undefined
          })),
        } as any
      }
      return persistedState as RecentsStore
    },
  },
))

export default useRecentsStore
