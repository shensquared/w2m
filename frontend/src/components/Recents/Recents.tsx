'use client'

import { useRouter } from 'next/navigation'
import { Temporal } from '@js-temporal/polyfill'

import Content from '/src/components/Content/Content'
import Section from '/src/components/Section/Section'
import { useTranslation } from '/src/i18n/client'
import { useStore } from '/src/stores'
import useRecentsStore, { RecentEvent } from '/src/stores/recentsStore'
import { relativeTimeFormat } from '/src/utils'

import styles from './Recents.module.scss'

const Recents = () => {
  const recents = useStore(useRecentsStore, state => state.recents)
  const { t, i18n } = useTranslation(['home', 'common'])
  const router = useRouter()

  const handleEventClick = (event: RecentEvent) => {
    // Store username in sessionStorage for auto-fill
    if (event.username) {
      sessionStorage.setItem(`w2m-username-${event.id}`, event.username)
      console.log('Stored username for event:', event.id, event.username)
    }
    router.push(`/${event.id}`)
  }

  return recents?.length ? <Section id="recents">
    <Content>
      <h2>{t('home:recently_visited')}</h2>
      {recents.slice(0, 5).map(event => (
        <button 
          className={styles.recent} 
          onClick={() => handleEventClick(event)} 
          key={event.id}
          type="button"
        >
          <span className={styles.name}>{event.name}</span>
          <span
            className={styles.date}
            title={Temporal.Instant.fromEpochSeconds(event.created_at).toLocaleString(i18n.language, { dateStyle: 'long' })}
          >{t('common:created', { date: relativeTimeFormat(Temporal.Instant.fromEpochSeconds(event.created_at), i18n.language) })}</span>
        </button>
      ))}
    </Content>
  </Section> : null
}

export default Recents
