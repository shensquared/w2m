'use client'

import { Fragment, useMemo, useState, useEffect } from 'react'

import Content from '/src/components/Content/Content'
import { useFloating, flip, offset, shift } from '@floating-ui/react-dom'
import { usePalette } from '/src/hooks/usePalette'
import { useTranslation } from '/src/i18n/client'
import { calculateAvailability, makeClass, calculateTable } from '/src/utils'
import { useStore } from '/src/stores'
import useSettingsStore from '/src/stores/settingsStore'

import styles from './AvailabilityViewer.module.scss'
import Skeleton from './components/Skeleton/Skeleton'
import Legend from '../Legend/Legend'

interface AvailabilityViewerProps {
  times: string[]
  people: Array<{
    name: string
    availability: Array<{
      time: string
      level: string // "preferred", "can_if_needed", "not_available"
    }>
  }>
  table?: ReturnType<typeof calculateTable>
  tempFocus?: string
  onCopyTimeslot?: (timeslotInfo: string) => void
}

const AvailabilityViewer = ({ times, people, table, tempFocus: propTempFocus, onCopyTimeslot }: AvailabilityViewerProps) => {
  const { t, i18n } = useTranslation('event')

  const highlight = useStore(useSettingsStore, state => state.highlight)
  const tempFocus = propTempFocus
  const [focusCount, setFocusCount] = useState<number>()

  const [tooltip, setTooltip] = useState<{
    anchor: HTMLDivElement
    available: string
    date: string
    people: string[]
    preferred: string[]
    canIfNeeded: string[]
  }>()
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(6), flip(), shift()],
    elements: { reference: tooltip?.anchor },
  })

  // Calculate availabilities
  const { availabilities, min, max } = useMemo(() =>
    calculateAvailability(times, people),
  [times, people])

  // Calculate actual scores that exist in the data
  const actualScores = useMemo(() => {
    const scores = new Set<number>()
    scores.add(0) // Always include 0 for no availability
    availabilities.forEach(availability => {
      if (availability.people.length > 0) {
        const score = availability.preferred.length * 2 + availability.canIfNeeded.length * 1
        scores.add(score)
      }
    })
    const result = Array.from(scores).sort((a, b) => a - b)
    console.log('Actual scores with 3 people:', result)
    return result
  }, [availabilities])

  // Create a palette based on the actual scores that exist
  const palette = usePalette(actualScores?.length || 1)



  const heatmap = useMemo(() => table?.columns.map((column, x) => <Fragment key={x}>
    {column ? <div className={styles.dateColumn}>
      {column.header.dateLabel && <label className={styles.dateLabel}>{column.header.dateLabel}</label>}
      <label className={styles.dayLabel}>{column.header.weekdayLabel}</label>

      <div
        className={styles.times}
        data-border-left={x === 0 || table.columns.at(x - 1) === null}
        data-border-right={x === table.columns.length - 1 || table.columns.at(x + 1) === null}
      >
        {column.cells.map((cell, y) => {
          if (y === column.cells.length - 1) return null

          if (!cell) return <div
            className={makeClass(styles.timeSpace, styles.grey)}
            key={y}
            title={t('greyed_times')}
          />

          const availability = availabilities.find(a => a.date === cell.serialized)
          let peopleHere = availability?.people ?? []
          const preferredHere = availability?.preferred ?? []
          const canIfNeededHere = availability?.canIfNeeded ?? []
          
          // Filter to show only the hovered person's availability
          if (tempFocus) {
            peopleHere = peopleHere.filter(p => p === tempFocus)
          }

          if (peopleHere.length === 0) return <div
            className={makeClass(styles.time, styles.nonEditable)}
            key={y}
            style={{
              backgroundColor: 'transparent',
              ...cell.minute !== 0 && cell.minute !== 30 && { borderTopColor: 'transparent' },
              ...cell.minute === 30 && { borderTopStyle: 'dotted' },
            } as React.CSSProperties}
          />

          // Calculate color based on actual scores that exist
          let colorIndex = 0
          const score = peopleHere.length > 0 ? preferredHere.length * 2 + canIfNeededHere.length * 1 : 0
          if (peopleHere.length > 0 && actualScores && actualScores.length > 0) {
            colorIndex = actualScores.indexOf(score)
            if (colorIndex === -1) colorIndex = 0 // fallback

          }
          const color = palette?.[colorIndex] || palette?.[0] || { string: '#f79e00', highlight: '#e68a00' }
          


          // Determine if this time has preferred people
          const hasPreferred = preferredHere.length > 0
          const hasCanIfNeeded = canIfNeededHere.length > 0

          const shouldHighlight = highlight && (focusCount === undefined || score === focusCount) && peopleHere.length > 0

          
          return <div
            key={y}
            className={makeClass(
              styles.time,
              styles.nonEditable,
              shouldHighlight && styles.highlight,
            )}
            style={{
              backgroundColor: (focusCount === undefined || score === focusCount) ? color.string : 'transparent',
              '--highlight-color': color.highlight,
              // Add a subtle pattern to indicate preferred times (no border)
              ...hasPreferred && palette && palette.length > 0 && { 
                backgroundImage: `linear-gradient(45deg, ${palette[palette.length - 1]?.string || '#f79e00'}20 25%, transparent 25%, transparent 50%, ${palette[palette.length - 1]?.string || '#f79e00'}20 50%, ${palette[palette.length - 1]?.string || '#f79e00'}20 75%, transparent 75%, transparent)`,
                backgroundSize: '4px 4px'
              },
              ...cell.minute !== 0 && cell.minute !== 30 && { borderTopColor: 'transparent' },
              ...cell.minute === 30 && { borderTopStyle: 'dotted' },
            } as React.CSSProperties}
            aria-label={`${peopleHere.join(', ')}${hasPreferred ? ` (${preferredHere.length} preferred)` : ''}${hasCanIfNeeded ? ` (${canIfNeededHere.length} can if needed)` : ''}`}
            onMouseEnter={e => {
              const preferredText = hasPreferred ? ` (${preferredHere.length} preferred)` : ''
              const canIfNeededText = hasCanIfNeeded ? ` (${canIfNeededHere.length} can if needed)` : ''
              setTooltip({
                anchor: e.currentTarget,
                available: `${peopleHere.length} / ${people.length} ${t('available')}${preferredText}${canIfNeededText}`,
                date: cell.label,
                people: peopleHere,
                preferred: preferredHere,
                canIfNeeded: canIfNeededHere,
              })
            }}
            onClick={() => {
              const clipboardMessage = `${t('group.clipboard_message', { date: cell.label })}:\n${peopleHere.join(', ')}${hasPreferred ? `\nPreferred: ${preferredHere.join(', ')}` : ''}${hasCanIfNeeded ? `\nCan if needed: ${canIfNeededHere.join(', ')}` : ''}`
              onCopyTimeslot?.(clipboardMessage)
            }}
            onMouseLeave={() => setTooltip(undefined)}
          />
        })}
      </div>
    </div> : <div className={styles.columnSpacer} />}
  </Fragment>) ?? <Skeleton isSpecificDates={times[0]?.length === 13} />, [
    availabilities,
    table?.columns,
    highlight,
    max,
    min,
    t,
    palette,
    tempFocus,
    focusCount,
  ])

  return <>
    <Content>
      <Legend
        min={actualScores?.[0] ?? 0}
        max={actualScores?.[actualScores?.length - 1] ?? 0}
        palette={palette}
        actualScores={actualScores}
        total={people.length}
        onSegmentFocus={setFocusCount}
      />
    </Content>

    <div className={styles.wrapper}>
      <div>
        <div className={styles.heatmap}>
          <div className={styles.timeLabels}>
            {table?.rows.map((row, i) =>
              <div className={styles.timeSpace} key={i}>
                {row && <label className={styles.timeLabel}>
                  {row.label}
                </label>}
              </div>
            ) ?? null}
          </div>

          {heatmap}
        </div>
      </div>
    </div>

    {tooltip && <div
      ref={refs.setFloating}
      style={floatingStyles}
      className={styles.tooltip}
    >
      <div className={styles.tooltipDate}>{tooltip.date}</div>
      <div className={styles.tooltipAvailable}>{tooltip.available}</div>
      {tooltip.preferred.length > 0 && (
        <div className={styles.tooltipPreferred}>
          Preferred: {tooltip.preferred.join(', ')}
        </div>
      )}
      {tooltip.canIfNeeded.length > 0 && (
        <div className={styles.tooltipCanIfNeeded}>
          Can if needed: {tooltip.canIfNeeded.join(', ')}
        </div>
      )}
    </div>}


  </>
}

export default AvailabilityViewer
