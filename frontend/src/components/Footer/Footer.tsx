import { useTranslation } from '/src/i18n/server'
import { makeClass } from '/src/utils'

import styles from './Footer.module.scss'

interface FooterProps {
  isSmall?: boolean
}

const Footer = async ({ isSmall }: FooterProps) => {
  const { t } = await useTranslation('common')

  return <footer className={makeClass(styles.footer, isSmall && styles.small)}>
    <a href="https://github.com/shensquared/w2m" target="_blank" rel="noreferrer noopener">{t('footer.source')}</a>
    <a href="https://github.com/shensquared/w2m/issues/new" target="_blank" rel="noreferrer noopener">{t('footer.bug')}</a>
  </footer>
}

export default Footer
