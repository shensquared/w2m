import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

import Button from '/src/components/Button/Button'
import Content from '/src/components/Content/Content'
import { usePalette } from '/src/hooks/usePalette'
import { useTranslation } from '/src/i18n/client'
import { calculateTable, makeClass, parseSpecificDate } from '/src/utils'

import styles from './AvailabilityEditor.module.scss'
import GoogleCalendar from './components/GoogleCalendar/GoogleCalendar'
import RecentEvents from './components/RecentEvents/RecentEvents'
import viewerStyles from '../AvailabilityViewer/AvailabilityViewer.module.scss'
import Skeleton from '../AvailabilityViewer/components/Skeleton/Skeleton'

interface AvailabilityEditorProps {
  eventId?: string
  times: string[]
  timezone: string
  value: Array<{
    time: string
    level: string // "preferred", "can_if_needed", "not_available"
  }>
  onChange: (value: Array<{ time: string; level: string }>) => void
  table?: ReturnType<typeof calculateTable>
}

type AvailabilityLevel = 'preferred' | 'can_if_needed' | 'not_available'

const AvailabilityEditor = ({ eventId, times, timezone, value = [], onChange, table }: AvailabilityEditorProps) => {
  const { t } = useTranslation('event')

  // Ref and state required to rerender but also access static version in callbacks
  const selectingRef = useRef<string[]>([])
  const [selecting, _setSelecting] = useState<string[]>([])
  const setSelecting = useCallback((v: string[]) => {
    selectingRef.current = v
    _setSelecting(v)
  }, [])

  const startPos = useRef({ x: 0, y: 0 })
  const mode = useRef<'add' | 'remove'>()

  // Create the colour palette for three levels
  const palette = usePalette(3)

  // Helper function to get availability level for a time
  const getAvailabilityLevel = useCallback((time: string): AvailabilityLevel => {
    const availability = value.find(v => v.time === time)
    return availability?.level as AvailabilityLevel || 'not_available'
  }, [value])

  // Helper function to check if a time is available (preferred or can_if_needed)
  const isTimeAvailable = useCallback((time: string): boolean => {
    const level = getAvailabilityLevel(time)
    return level === 'preferred' || level === 'can_if_needed'
  }, [getAvailabilityLevel])

  // Helper function to cycle through availability levels
  const cycleAvailabilityLevel = useCallback((currentLevel: AvailabilityLevel): AvailabilityLevel => {
    switch (currentLevel) {
      case 'preferred':
        return 'can_if_needed'
      case 'can_if_needed':
        return 'not_available'
      case 'not_available':
        return 'preferred'
      default:
        return 'preferred'
    }
  }, [])

  // Selection control
  const selectAll = useCallback(() => {
    const newValue = times.map(time => ({ time, level: 'preferred' }))
    onChange(newValue)
  }, [onChange, times])

  const selectNone = useCallback(() => {
    const newValue = times.map(time => ({ time, level: 'not_available' }))
    onChange(newValue)
  }, [onChange, times])

  const selectInvert = useCallback(() => {
    const newValue = times.map(time => {
      const currentLevel = getAvailabilityLevel(time)
      const newLevel = currentLevel === 'not_available' ? 'preferred' : 'not_available'
      return { time, level: newLevel }
    })
    onChange(newValue)
  }, [onChange, times, getAvailabilityLevel])

  // Selection keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'i')) {
        e.preventDefault()
        if (e.shiftKey && e.key === 'a') selectNone()
        else if (e.key === 'a') selectAll()
        else selectInvert()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [selectAll, selectNone, selectInvert])

  // Get color for a time slot
  const getTimeColor = useCallback((time: string) => {
    const level = getAvailabilityLevel(time)
    switch (level) {
      case 'preferred':
        return palette[2].string // Green for preferred
      case 'can_if_needed':
        return palette[1].string // Yellow for can if needed
      case 'not_available':
      default:
        return palette[0].string // Gray for not available
    }
  }, [getAvailabilityLevel, palette])

  // Get hover color for a time slot
  const getTimeHoverColor = useCallback((time: string) => {
    const level = getAvailabilityLevel(time)
    switch (level) {
      case 'preferred':
        return palette[2].highlight
      case 'can_if_needed':
        return palette[1].highlight
      case 'not_available':
      default:
        return palette[0].highlight
    }
  }, [getAvailabilityLevel, palette])

  return <>
    <Content>
      <div style={{
        margin: '20px 0',
        padding: '16px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '5px',
        minHeight: '140px',
        maxWidth: '1000px',
        marginLeft: 'auto',
        marginRight: 'auto'
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
            <span>Drag to select multiple timeslots at once</span>
          </li>
          
          <li style={{ margin: '4px 0' }}>
            <span>Click timeslots to cycle: Preferred → Can if needed → Not available</span>
          </li>
          
          <li style={{ margin: '4px 0' }}>
            <span>Keyboard Shortcuts: Cmd/Ctrl+A (select all), Cmd/Ctrl+I (invert selections)</span>
          </li>
          
        </ul>
      </div>
    </Content>

    {times[0]?.length === 13 && <Content>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <GoogleCalendar
          timezone={timezone}
          timeStart={parseSpecificDate(times[0])}
          timeEnd={parseSpecificDate(times[times.length - 1]).add({ minutes: 30 })}
          times={times}
          onImport={(importedTimes: Array<{ time: string; level: string }>) => {
            const importedTimeStrings = importedTimes.map(t => t.time)
            const newValue = times.map(time => ({
              time,
              level: importedTimeStrings.includes(time) ? 'preferred' : 'not_available'
            }))
            onChange(newValue)
          }}
        />
      </div>
    </Content>}

    {/* Gap to align with Group availability tab */}
    <div style={{ height: '22px' }}></div>

    <div className={viewerStyles.wrapper}>
      <div>
        <div className={viewerStyles.heatmap}>
          <div className={viewerStyles.timeLabels}>
            {table?.rows.map((row, i) =>
              <div className={viewerStyles.timeSpace} key={i}>
                {row && <label className={viewerStyles.timeLabel}>
                  {row.label}
                </label>}
              </div>
            ) ?? null}
          </div>

          {table?.columns.map((column, x) => <Fragment key={x}>
            {column ? <div className={viewerStyles.dateColumn}>
              {column.header.dateLabel && <label className={viewerStyles.dateLabel}>{column.header.dateLabel}</label>}
              <label className={viewerStyles.dayLabel}>{column.header.weekdayLabel}</label>

              <div
                className={viewerStyles.times}
                data-border-left={x === 0 || table.columns.at(x - 1) === null}
                data-border-right={x === table.columns.length - 1 || table.columns.at(x + 1) === null}
              >
                {column.cells.map((cell, y) => {
                  if (y === column.cells.length - 1) return null

                  if (!cell) return <div
                    className={makeClass(viewerStyles.timeSpace, viewerStyles.grey)}
                    key={y}
                    title={t('greyed_times')}
                  />

                  const isSelected = selecting.includes(cell.serialized)
                  const currentAvailabilityLevel = getAvailabilityLevel(cell.serialized)

                  return <div
                    key={y}
                    className={makeClass(viewerStyles.time, selecting.length === 0 && viewerStyles.editable)}
                    style={{
                      touchAction: 'none',
                      backgroundColor: isSelected ? getTimeHoverColor(cell.serialized) : getTimeColor(cell.serialized),
                      '--hover-color': getTimeHoverColor(cell.serialized),
                      ...cell.minute !== 0 && cell.minute !== 30 && { borderTopColor: 'transparent' },
                      ...cell.minute === 30 && { borderTopStyle: 'dotted' },
                    } as React.CSSProperties}
                    onPointerDown={e => {
                      e.preventDefault()
                      startPos.current = { x, y }
                      mode.current = 'add'
                      setSelecting([cell.serialized])
                      e.currentTarget.releasePointerCapture(e.pointerId)

                      document.addEventListener('pointerup', () => {
                        if (mode.current === 'add') {
                          const newValue = [...value]
                          selectingRef.current.forEach(time => {
                            const existingIndex = newValue.findIndex(v => v.time === time)
                            const currentLevel = getAvailabilityLevel(time)
                            const nextLevel = cycleAvailabilityLevel(currentLevel)
                            if (existingIndex >= 0) {
                              newValue[existingIndex] = { time: time, level: nextLevel }
                            } else {
                              newValue.push({ time: time, level: nextLevel })
                            }
                          })
                          onChange(newValue)
                        }
                        setSelecting([])
                        mode.current = undefined
                      }, { once: true })
                    }}
                    onPointerEnter={() => {
                      if (mode.current) {
                        const found = []
                        for (let cy = Math.min(startPos.current.y, y); cy < Math.max(startPos.current.y, y) + 1; cy++) {
                          for (let cx = Math.min(startPos.current.x, x); cx < Math.max(startPos.current.x, x) + 1; cx++) {
                            found.push({ y: cy, x: cx })
                          }
                        }
                        setSelecting(found.flatMap(d => {
                          const serialized = table.columns[d.x]?.cells[d.y]?.serialized
                          if (serialized && times.includes(serialized)) {
                            return [serialized]
                          }
                          return []
                        }))
                      }
                    }}
                  />
                })}
              </div>
            </div> : <div className={viewerStyles.columnSpacer} />}
          </Fragment>) ?? <Skeleton isSpecificDates={times[0]?.length === 13} />}
        </div>
      </div>
    </div>
  </>
}

export default AvailabilityEditor
