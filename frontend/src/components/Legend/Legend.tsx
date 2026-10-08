import { useState } from 'react'

import { useTranslation } from '/src/i18n/client'
import { useStore } from '/src/stores'
import useSettingsStore from '/src/stores/settingsStore'

import styles from './Legend.module.scss'

interface LegendProps {
  min: number
  max: number
  total: number
  palette: { string: string, highlight: string }[]
  actualScores?: number[]
  onSegmentFocus: (segment: number | undefined) => void
  lowLabel?: string
  highLabel?: string
}

const Legend = ({ min, max, total, palette, actualScores, onSegmentFocus, lowLabel = 'Low availability', highLabel = 'High availability' }: LegendProps) => {
  const { t } = useTranslation('event')
  const highlight = useStore(useSettingsStore, state => state.highlight)
  const setHighlight = useSettingsStore(state => state.setHighlight)
  const [clickedSegment, setClickedSegment] = useState<number | undefined>()

  return <div className={styles.wrapper}>
    <label className={styles.label}>{lowLabel}</label>

    <div
      className={styles.bar}
      onMouseOut={() => {
        if (!clickedSegment) {
          setHighlight(false)
          onSegmentFocus(undefined)
        }
      }}
      title={t('group.legend_tooltip')}
    >
      {palette.map((color, j) =>
        <div
          key={j}
          style={{ flex: 1, backgroundColor: color.string, '--highlight-color': color.highlight } as React.CSSProperties}
          className={clickedSegment === j ? styles.highlight : undefined}
          onMouseOver={() => {
            if (!clickedSegment) {
              const score = actualScores && actualScores[j] !== undefined ? actualScores[j] : j
              setHighlight(true)
              onSegmentFocus(score)
            }
          }}
          onMouseOut={() => {
            if (!clickedSegment) {
              setHighlight(false)
              onSegmentFocus(undefined)
            }
          }}
          onClick={() => {
            const score = actualScores && actualScores[j] !== undefined ? actualScores[j] : j
            if (clickedSegment === j) {
              // Clicking the same segment again clears the selection
              setClickedSegment(undefined)
              setHighlight(false)
              onSegmentFocus(undefined)
            } else {
              // Clicking a new segment sets it as the clicked segment
              setClickedSegment(j)
              setHighlight(true)
              onSegmentFocus(score)
            }
          }}
        />
      )}
    </div>

    <label className={styles.label}>{highLabel}</label>
  </div>
}

export default Legend
