'use client'

import { useState } from 'react'
import { useTranslation } from '/src/i18n/client'
import Content from '/src/components/Content/Content'
import SelectField from '/src/components/SelectField/SelectField'
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
}

const Instructions = ({ people, eventId, eventName, timezone, onTimezoneChange, onHoverPerson }: InstructionsProps) => {
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
        
        <ol className={styles.instructionList}>
          <li>
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
          
          <li>
            <span>Click <button
              type="button"
              onClick={handleCopy}
              className={styles.hereButton}
            >
              {copied ? 'Copied!' : 'here'}
            </button> to copy link</span>
          </li>
          
          <li>
            <span>Your timezone: </span>
            <SelectField
              label=""
              name="timezone"
              id="timezone"
              isInline
              isHorizontal
              value={timezone}
              onChange={event => onTimezoneChange(event.currentTarget.value)}
              options={timezones}
              style={{ width: '200px' }}
            />
          </li>
        </ol>
      </div>
    </Content>
  )
}

export default Instructions 