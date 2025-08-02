'use client'

import { useState } from 'react'
import { useTranslation } from '/src/i18n/client'
import Content from '/src/components/Content/Content'
import timezones from '/src/res/timezones.json'
import { makeClass } from '/src/utils'
import styles from './page.module.scss'

interface InstructionsProps {
  people: Array<{ name: string }>
  eventId: string
  eventName: string
  timezone: string
  onTimezoneChange: (timezone: string) => void
  onHoverPerson?: (personName: string | undefined) => void
  onCopyTimeslot?: (timeslotInfo: string) => void
}

const Instructions = ({ people, eventId, eventName, timezone, onTimezoneChange, onHoverPerson, onCopyTimeslot }: InstructionsProps) => {
  const { t, i18n } = useTranslation('event')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`https://w2m.shenshen.mit.edu/${eventId}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div style={{
      margin: '-20px auto 20px auto',
      padding: '16px',
      backgroundColor: 'white',
      border: '1px solid purple',
      borderRadius: '5px',
      minHeight: '140px',
      width: '600px',
      maxWidth: 'calc(100% - 60px)'
    }}>
      <h3 style={{
        color: 'var(--primary)',
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '600'
      }}>Usage:</h3>
      
      <ul style={{
        margin: 0,
        paddingLeft: '20px',
        listStyleType: 'disc'
      }}>
        <li style={{ margin: '4px 0' }}>
          <span>📋 <button
            type="button"
            onClick={handleCopy}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit'
            }}
          >
            {copied ? 'Copied!' : 'click to copy this w2m link info'}
          </button></span>
        </li>
        
        <li style={{ margin: '4px 0' }}>
          <span>Hover on timeslot to show availability; click to copy time info</span>
        </li>
        
        <li style={{ margin: '4px 0' }}>
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
                  background: 'var(--surface)',
                  border: '2px solid var(--border)',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                key={person.name}
                onMouseOver={() => onHoverPerson?.(person.name)}
                onMouseOut={() => onHoverPerson?.(undefined)}
                title={person.name}
              >
                {person.name}
              </button>
            )}
          </div>
        </li>
      </ul>
    </div>
  )
}

export default Instructions 