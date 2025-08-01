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
}

const Legend = ({ min, max, total, palette, actualScores, onSegmentFocus }: LegendProps) => {
  const { t } = useTranslation('event')
  const highlight = useStore(useSettingsStore, state => state.highlight)
  const setHighlight = useSettingsStore(state => state.setHighlight)

  return <div className={styles.wrapper}>
    <label className={styles.label}>Low availability</label>

    <div
      className={styles.bar}
      onMouseOut={() => {
        setHighlight(false)
        onSegmentFocus(undefined)
      }}
      onClick={() => setHighlight?.(!highlight)}
      title={t('group.legend_tooltip')}
    >
      {palette.map((color, j) =>
        <div
          key={j}
          style={{ flex: 1, backgroundColor: color.string, '--highlight-color': color.highlight } as React.CSSProperties}
          className={highlight && j === palette.length - 1 ? styles.highlight : undefined}
          onMouseOver={() => {
            const score = actualScores && actualScores[j] !== undefined ? actualScores[j] : j
            setHighlight(true)
            onSegmentFocus(score)
          }} // j is the palette index, score is the actual score value
          onMouseOut={() => {
            setHighlight(false)
            onSegmentFocus(undefined)
          }}
        />
      )}
    </div>

    <label className={styles.label}>High availability</label>
  </div>
}

export default Legend
