'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Fragment } from 'react'
import { flip, offset, shift, useFloating } from '@floating-ui/react-dom'

import AvailabilityEditor from '/src/components/AvailabilityEditor/AvailabilityEditor'
import AvailabilityViewer from '/src/components/AvailabilityViewer/AvailabilityViewer'
import availabilityStyles from '/src/components/AvailabilityViewer/AvailabilityViewer.module.scss'
import Content from '/src/components/Content/Content'
import Legend from '/src/components/Legend/Legend'
import Login from '/src/components/Login/Login'
import Section from '/src/components/Section/Section'
import SelectField from '/src/components/SelectField/SelectField'
import { UsageItem, UsageSection } from '/src/components/UsageSection'
import { EventResponse, getPeople, PersonResponse, updatePerson } from '/src/config/api'
import { usePalette } from '/src/hooks/usePalette'
import { useTranslation } from '/src/i18n/client'
import timezones from '/src/res/timezones.json'
import { useStore } from '/src/stores'
import useRecentsStore from '/src/stores/recentsStore'
import useSettingsStore from '/src/stores/settingsStore'
import { calculateAvailability, calculateTable, expandTimes, makeClass } from '/src/utils'

import Instructions from './Instructions'
import styles from './page.module.scss'

interface EventAvailabilitiesProps {
  event?: EventResponse
}

const EventAvailabilities = ({ event }: EventAvailabilitiesProps) => {
  const { t, i18n } = useTranslation('event')

  const timeFormat = useStore(useSettingsStore, state => state.timeFormat) ?? '12h'

  const [people, setPeople] = useState<PersonResponse[]>([])
  const expandedTimes = useMemo(() => expandTimes(event?.times ?? []), [event?.times])

  const [user, setUser] = useState<PersonResponse>()
  const [password, setPassword] = useState<string>()

  const [tab, setTab] = useState<'group' | 'you' | 'vip'>('group')
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [vipParticipants, setVipParticipants] = useState<string[]>([])
  const [tempFocus, setTempFocus] = useState<string>()
  const [shareLink, setShareLink] = useState<string>()

  // Calculate actual scores for VIP tab
  const vipActualScores = useMemo(() => {
    if (tab !== 'vip') return []
    const { availabilities } = calculateAvailability(expandedTimes, people, vipParticipants)
    const scores = new Set<number>()
    scores.add(0)
    availabilities.forEach(availability => {
      if (availability.people.length > 0) {
        const score = availability.preferred.length * 2 + availability.canIfNeeded.length * 1
        scores.add(score)
      }
    })
    return Array.from(scores).sort((a, b) => a - b)
  }, [tab, expandedTimes, people, vipParticipants])

  // Create palette for VIP tab (must be called at top level, not inside useMemo)
  const vipPalette = usePalette(vipActualScores?.length || 1)

  // Generate gradient stops for VIP tab color bar
  const vipGradientStops = useMemo(() => {
    if (tab !== 'vip' || !vipPalette || vipPalette.length === 0) return ''
    return vipPalette.map((color, i) => {
      const start = (i / vipPalette.length) * 100
      const end = ((i + 1) / vipPalette.length) * 100
      return `${color.string} ${start}%, ${color.string} ${end}%`
    }).join(', ')
  }, [tab, vipPalette])

  // Web worker for calculating the heatmap table
  const tableWorker = useRef<Worker>()

  // Calculate table (using a web worker if available)
  const [table, setTable] = useState<ReturnType<typeof calculateTable>>()

  useEffect(() => {
    if (event && expandTimes.length > 0) {
      if (!tableWorker.current) {
        tableWorker.current = window.Worker ? new Worker(new URL('/src/workers/calculateTable', import.meta.url)) : undefined
      }
      const args = { times: expandedTimes, locale: i18n.language, timeFormat, timezone }
      if (tableWorker.current) {
        tableWorker.current.onmessage = (e: MessageEvent<ReturnType<typeof calculateTable>>) => setTable(e.data)
        tableWorker.current.postMessage(args)
        setTable(undefined)
      } else {
        setTable(calculateTable(args))
      }
    }
  }, [expandedTimes, i18n.language, timeFormat, timezone])

  // Add this event to recents
  const addRecent = useRecentsStore(state => state.addRecent)
  useEffect(() => {
    if (event) {
      addRecent({
        id: event.id,
        name: event.name,
        created_at: event.created_at,
        username: user?.name,
      })
    }
  }, [addRecent, event, user?.name])

  // Set share link on client side only
  useEffect(() => {
    if (event?.id && typeof window !== 'undefined') {
      setShareLink(`${window.location.origin}/${event.id}`)
    }
  }, [event?.id])

  // Refetch availabilities
  useEffect(() => {
    if (tab === 'group' && event) {
      getPeople(event.id)
        .then(people => {
          setPeople(people)
        })
        .catch(console.warn)
    }
  }, [tab, event])

  return <>
    <Section id="login">
      <Content>
        <Login
          eventId={event?.id}
          user={user}
          shareLink={shareLink}
          onChange={(u, p) => {
            setUser(u)
            setPassword(p)
            setTab(u ? 'you' : 'group')
          }}
        />
      </Content>
    </Section>

    <Content>
      <div className={styles.tabs}>
        <button
          className={makeClass(
            styles.tab,
            styles.tab,
            tab === 'you' && styles.tabSelected,
            !user && styles.tabDisabled,
          )}
          type="button"
          onClick={() => {
            if (user) {
              setTab('you')
            } else {
              document.dispatchEvent(new CustomEvent('focusName'))
            }
          }}
          title={user ? '' : t('tabs.you_tooltip')}
        >{t('tabs.you')}</button>
        <button
          className={makeClass(
            styles.tab,
            tab === 'group' && styles.tabSelected,
          )}
          type="button"
          onClick={() => setTab('group')}
        >{t('tabs.group')}</button>
        <button
          className={makeClass(
            styles.tab,
            tab === 'vip' && styles.tabSelected,
          )}
          type="button"
          onClick={() => setTab('vip')}
        >VIP</button>
      </div>
    </Content>

    {tab === 'group' ? <>
      <Instructions
        people={people}
        eventId={event?.id ?? ''}
        eventName={event?.name ?? ''}
        timezone={timezone}
        onTimezoneChange={setTimezone}
        onHoverPerson={setTempFocus}
        onCopyTimeslot={info => {
          navigator.clipboard.writeText(info)
        }}
      />
      <AvailabilityViewer
        times={expandedTimes}
        people={people}
        table={table}
        tempFocus={tempFocus}
        onCopyTimeslot={info => {
          navigator.clipboard.writeText(info)
        }}
      />
    </> : tab === 'vip' ? <>
      {/* VIP Usage Instructions */}
      <UsageSection>
        <UsageItem>
          <span>Hover on timeslot to show availability; click to copy time info</span> 
        </UsageItem>

        <UsageItem>
          <span>Mark participants as VIPs to give their preferences double weight: </span>
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
                  transition: 'all 0.2s',
                  ...(vipParticipants.includes(person.name) && {
                    background: 'var(--primary)',
                    color: 'white',
                    borderColor: 'var(--primary)'
                  })
                }}
                key={person.name}
                onClick={() => {
                  if (vipParticipants.includes(person.name)) {
                    setVipParticipants(vipParticipants.filter(name => name !== person.name))
                  } else {
                    setVipParticipants([...vipParticipants, person.name])
                  }
                }}
                title={`${person.name} - ${person.availability.length} time slots marked`}
              >
                {vipParticipants.includes(person.name) ? `★ ${person.name}` : `☆ ${person.name}`}
              </button>
            )}
          </div>
        </UsageItem>
      </UsageSection>

      {/* VIP Availability View with reweighted calculations */}
      {vipParticipants.length > 0 ? (
        <VipAvailabilityViewer
          times={expandedTimes}
          people={people}
          table={table}
          vipParticipants={vipParticipants}
        />
      ) : (
        <AvailabilityViewer
          times={expandedTimes}
          people={people}
          table={table}
          tempFocus={tempFocus}
          onCopyTimeslot={info => {
            navigator.clipboard.writeText(info)
          }}
        />
      )}
    </> : user && <AvailabilityEditor
      eventId={event?.id}
      times={expandedTimes}
      timezone={timezone}
      value={user.availability}
      onChange={availability => {
        if (!event) return
        const oldAvailability = [...user.availability]
        setUser({ ...user, availability })
        addRecent({
          id: event.id,
          name: event.name,
          created_at: event.created_at,
          user: availability.length > 0 ? {
            name: user.name,
            availability,
          } : undefined,
        })
        updatePerson(event.id, user.name, { availability }, password)
          .catch(e => {
            console.warn(e)
            setUser({ ...user, availability: oldAvailability })
          })
      }}
      table={table}
    />}


  </>
}

// VIP Availability Viewer Component
interface VipAvailabilityViewerProps {
  times: string[]
  people: PersonResponse[]
  table?: ReturnType<typeof calculateTable>
  vipParticipants: string[]
}

const VipAvailabilityViewer = ({ times, people, table, vipParticipants }: VipAvailabilityViewerProps) => {
  const { t } = useTranslation('event')
  const highlight = useStore(useSettingsStore, state => state.highlight)
  const [filteredPeople, setFilteredPeople] = useState(people.map(p => p.name))
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

  // Calculate VIP-weighted availabilities
  const { availabilities, min, max } = useMemo(() =>
    calculateAvailability(times, people.filter(p => filteredPeople.includes(p.name)), vipParticipants),
  [times, filteredPeople, people, vipParticipants])

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
    return result
  }, [availabilities])

  // Create a palette based on the actual scores that exist
  const palette = usePalette(actualScores?.length || 1)

  // Reselect everyone if the people data changes
  useEffect(() => {
    setFilteredPeople(people.map(p => p.name))
  }, [people])

  const heatmap = useMemo(() => table?.columns.map((column, x) => <Fragment key={x}>
    {column ? <div className={availabilityStyles.dateColumn}>
      {column.header.dateLabel && <label className={availabilityStyles.dateLabel}>{column.header.dateLabel}</label>}
      <label className={availabilityStyles.dayLabel}>{column.header.weekdayLabel}</label>

      <div
        className={availabilityStyles.times}
        data-border-left={x === 0 || table.columns.at(x - 1) === null}
        data-border-right={x === table.columns.length - 1 || table.columns.at(x + 1) === null}
      >
        {column.cells.map((cell, y) => {
          if (y === column.cells.length - 1) return null

          if (!cell) return <div
            className={makeClass(availabilityStyles.timeSpace, availabilityStyles.grey)}
            key={y}
            title={t('greyed_times')}
          />

          const availability = availabilities.find(a => a.date === cell.serialized)
          const peopleHere = availability?.people ?? []
          const preferredHere = availability?.preferred ?? []
          const canIfNeededHere = availability?.canIfNeeded ?? []

          if (peopleHere.length === 0) return <div
            className={makeClass(availabilityStyles.time, availabilityStyles.nonEditable)}
            key={y}
            style={{
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
              availabilityStyles.time,
              availabilityStyles.nonEditable,
              shouldHighlight && availabilityStyles.highlight,
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
            aria-label={`${[...new Set(peopleHere)].join(', ')}${hasPreferred ? ` (${[...new Set(preferredHere)].length} preferred)` : ''}${hasCanIfNeeded ? ` (${[...new Set(canIfNeededHere)].length} can if needed)` : ''}`}
            title={`${cell.label}: ${[...new Set(peopleHere)].length} available (${[...new Set(preferredHere)].length} preferred, ${[...new Set(canIfNeededHere)].length} can if needed)`}
            onMouseEnter={e => {
              const uniquePeople = [...new Set(peopleHere)]
              const uniquePreferred = [...new Set(preferredHere)]
              const uniqueCanIfNeeded = [...new Set(canIfNeededHere)]
              setTooltip({
                anchor: e.currentTarget,
                available: `${uniquePeople.length} / ${filteredPeople.length} ${t('available')} · Weighted score: ${score}`,
                date: cell.label,
                people: [],
                preferred: uniquePreferred.map(name => vipParticipants.includes(name) ? `★ ${name}` : name),
                canIfNeeded: uniqueCanIfNeeded.map(name => vipParticipants.includes(name) ? `★ ${name}` : name),
              })
            }}
            onMouseLeave={() => setTooltip(undefined)}
            onClick={() => {
              const clipboardMessage = `Time: ${cell.label}.`
              navigator.clipboard.writeText(clipboardMessage)
            }}
          />
        })}
      </div>
    </div> : <div className={availabilityStyles.columnSpacer} />}
  </Fragment>) ?? <div>Loading...</div>, [
    availabilities,
    table?.columns,
    highlight,
    focusCount,
    t,
    palette,
    actualScores,
    filteredPeople,
  ])

  return (
    <>
      <Content>
        <Legend
          min={actualScores?.[0] ?? 0}
          max={actualScores?.[actualScores?.length - 1] ?? 0}
          palette={palette}
          actualScores={actualScores}
          total={filteredPeople.length}
          onSegmentFocus={setFocusCount}
          lowLabel="Low preference"
          highLabel="High preference"
        />
      </Content>

      <div className={availabilityStyles.wrapper}>
        <div>
          <div className={availabilityStyles.heatmap}>
            <div className={availabilityStyles.timeLabels}>
              {table?.rows.map((row, i) =>
                <div className={availabilityStyles.timeSpace} key={i}>
                  {row && <label className={availabilityStyles.timeLabel}>
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
        className={availabilityStyles.tooltip}
      >
        <div className={availabilityStyles.tooltipDate}>{tooltip.date}</div>
        <div className={availabilityStyles.tooltipAvailable}>{tooltip.available}</div>
        {tooltip.preferred.length > 0 && (
          <div className={availabilityStyles.tooltipPreferred}>
            Preferred: {tooltip.preferred.join(', ')}
          </div>
        )}
        {tooltip.canIfNeeded.length > 0 && (
          <div className={availabilityStyles.tooltipCanIfNeeded}>
            Can if needed: {tooltip.canIfNeeded.join(', ')}
          </div>
        )}
      </div>}
    </>
  )
}

export default EventAvailabilities
