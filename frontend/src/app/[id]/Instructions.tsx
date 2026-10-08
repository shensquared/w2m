'use client'

import { useState } from 'react'

import { UsageItem, UsageSection } from '/src/components/UsageSection'

interface InstructionsProps {
  people: Array<{ name: string }>
  eventId: string
  eventName: string
  timezone: string
  onTimezoneChange: (timezone: string) => void
  onHoverPerson?: (personName: string | undefined) => void
  onCopyTimeslot?: (timeslotInfo: string) => void
}

const Instructions = ({ people, onHoverPerson }: InstructionsProps) => {
  const [lockedPerson, setLockedPerson] = useState<string | undefined>()

  return (
    <UsageSection>
      <UsageItem>
        <span>Hover on timeslot to show availability; click to copy time info</span>
      </UsageItem>
      
      <UsageItem>
        <span>Show individual availability: </span>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          margin: 0,
          alignItems: 'center'
        }}>
          {people.map(person =>
            <button
              type="button"
              style={{
                background: lockedPerson === person.name ? 'var(--primary)' : 'var(--surface)',
                color: lockedPerson === person.name ? 'white' : 'inherit',
                border: '2px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              key={person.name}
              onClick={() => {
                if (lockedPerson === person.name) {
                  setLockedPerson(undefined)
                  onHoverPerson?.(undefined)
                } else {
                  setLockedPerson(person.name)
                  onHoverPerson?.(person.name)
                }
              }}
              onMouseOver={() => {
                if (!lockedPerson) {
                  onHoverPerson?.(person.name)
                }
              }}
              onMouseOut={() => {
                if (!lockedPerson) {
                  onHoverPerson?.(undefined)
                }
              }}
              title={lockedPerson === person.name ? 'Click to unlock' : 'Click to lock, hover to preview'}
            >
              {person.name}
            </button>
          )}
        </div>
      </UsageItem>
    </UsageSection>
  )
}

export default Instructions 
