import localFont from "next/font/local"
import Link from "next/link"

import { useTranslation } from "/src/i18n/server"
import { makeClass } from "/src/utils"

import styles from "./Header.module.scss"

const samuraiBob = localFont({
  src: "./samuraibob.woff2",
  fallback: ["sans-serif"],
})
const molot = localFont({
  src: "./molot.woff2",
  fallback: ["sans-serif"],
})

interface HeaderProps {
    /** Show the full header */
    isFull?: boolean;
    isSmall?: boolean;
}

const Header = async ({ isFull, isSmall }: HeaderProps) => {
  const { t } = await useTranslation(["common", "home"])

  return (
    <header className={styles.header} data-small={isSmall}>
      {isFull ? (
        <>
          <div className={styles.top}>
            {!isSmall && (
              <img
                className={styles.bigLogo}
                src={"widetim.png"}
                alt=""
              />
            )}
            {!isSmall && (
              <img
                src={"eecslogo.svg"}
                style={{ marginLeft: "20px" }}
                alt=""
              />
            )}
          </div>
          <span
            className={makeClass(
              styles.subtitle,
              samuraiBob.className,
              !/^[A-Za-z ]+$/.test(t("home:create")) &&
                                styles.hasAltChars
            )}
          >
            {t("home:create")}
          </span>
          <h1 className={makeClass(styles.bigTitle, molot.className)}>
                        W2M
          </h1>
        </>
      ) : (
        <Link href="/" className={styles.link}>
          <div className={styles.top}>
            <img
              className={styles.logo}
              src={"widetim.png"}
              height={512}
              width={512}
              alt=""
            />
            <span
              className={makeClass(styles.title, molot.className)}
            >
                            W2M
            </span>
            <img
              className={styles.logo}
              src={"eecslogo.svg"}
              style={{ marginLeft: "15px" }}
              alt=""
            />
          </div>
          {/* <span className={styles.tagline}>
            {t("common:tagline")}
          </span> */}
        </Link>
      )}
    </header>
  )
}

export default Header
