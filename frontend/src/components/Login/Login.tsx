import { useCallback, useEffect, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

import Button from '/src/components/Button/Button'
import Error from '/src/components/Error/Error'
import TextField from '/src/components/TextField/TextField'
import { getPerson, PersonResponse } from '/src/config/api'
import { useTranslation } from '/src/i18n/client'

import styles from './Login.module.scss'

const defaultValues = {
  username: '',
  password: '',
}

interface LoginProps {
  eventId?: string
  user: PersonResponse | undefined
  onChange: (user: PersonResponse | undefined, password?: string) => void
}

const Login = ({ eventId, user, onChange }: LoginProps) => {
  const { t } = useTranslation('event')

  const {
    register,
    handleSubmit,
    setFocus,
    reset,
    setValue,
  } = useForm({ defaultValues })

  const [error, setError] = useState<React.ReactNode>()
  const [isLoading, setIsLoading] = useState(false)

  const focusName = useCallback(() => setFocus('username'), [setFocus])
  useEffect(() => {
    document.addEventListener('focusName', focusName)
    return () => document.removeEventListener('focusName', focusName)
  }, [])

  // Auto-fill username from sessionStorage if available
  useEffect(() => {
    if (eventId) {
      const storedUsername = sessionStorage.getItem(`w2m-username-${eventId}`)
      if (storedUsername) {
        setValue('username', storedUsername)
        // Clear the stored username after using it
        sessionStorage.removeItem(`w2m-username-${eventId}`)
        console.log('Auto-filled username:', storedUsername)
        
        // Auto-submit if no password is required
        setTimeout(() => {
          onSubmit({ username: storedUsername, password: '' })
        }, 100)
      }
    }
  }, [eventId, setValue])

  const onSubmit: SubmitHandler<typeof defaultValues> = async ({ username, password }) => {
    if (username.length === 0) {
      focusName()
      return setError(t('form.errors.name_required'))
    }

    setIsLoading(true)
    setError(undefined)

    try {
      if (!eventId) throw 'Event ID not set'

      const resUser = await getPerson(eventId, username, password || undefined)
      onChange(resUser, password || undefined)
      reset()
    } catch (e) {
      if (e && typeof e === 'object' && 'status' in e && e.status === 401) {
        setError(t('form.errors.password_incorrect'))
        setValue('password', '')
      } else {
        setError(t('form.errors.unknown'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return user ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0', flexWrap: 'wrap', gap: '10px' }}>
    <h2 style={{ margin: 0 }}>{t('form.signed_in', { name: user.name })}</h2>
    <Button isSmall onClick={() => onChange(undefined)}>{t('form.logout_button')}</Button>
  </div> : <>
    <h3>{t('form.signed_out')}</h3>
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <TextField
        // label={t('form.name')}
        type="text"
        placeholder="Your name"
        required
        isInline
        disabled={!eventId}
        {...register('username')}
      />

      <TextField
        // label={t('form.password')}
        type="password"
        placeholder="Password (optional)"
        disabled={!eventId}
        isInline
        {...register('password')}
      />

      <Button
        type="submit"
        isLoading={isLoading}
        disabled={isLoading || !eventId}
      >{t('form.button')}</Button>
    </form>
    <Error onClose={() => setError(undefined)}>{error}</Error>
    <p className={styles.info}>{t('form.info')}</p>
  </>
}

export default Login
