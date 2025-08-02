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
    <Content>
      <div className={styles.instructions}>
        <h3>Group Availability Usage:</h3>
        
        <ul className={styles.instructionList}>
          <li className={styles.instructionItem}>
            <span>📋 <button
              type="button"
              onClick={handleCopy}
              className={styles.hereButton}
            >
              {copied ? 'Copied!' : 'click to copy this w2m link info'}
            </button></span>
          </li>
          
          <li className={styles.instructionItem}>
            <span>Hover on timeslot to show availability; click to copy time info</span>
          </li>
          
          <li className={styles.instructionItem}>
            <span>Show individual availability: </span>
            <div className={styles.people}>
              {people.map(person =>
                <button
                  type="button"
                  className={styles.person}
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
          
          {/* <li className={styles.instructionItem}>
            <span>Your timezone: </span>
            <select
              name="timezone"
              id="timezone"
              value={timezone}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onTimezoneChange(event.currentTarget.value)}
              className={styles.timezoneSelect}
            >
              {Object.entries(timezones).map(([key, value]) =>
                <option key={key} value={key}>{value}</option>
              )}
            </select>
          </li> */}
        </ul>
      </div>
    </Content>
  )
}

export default Instructions 