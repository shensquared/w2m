import { Suspense } from "react"
import { Metadata } from "next"
import { notFound } from "next/navigation"

import Content from "/src/components/Content/Content"
import { getEvent } from "/src/config/api"
import { useTranslation } from "/src/i18n/server"

import EventAvailabilities from "./EventAvailabilities"
import styles from "./page.module.scss"
interface PageProps {
    params: { id: string };
}

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const event = await getEvent(params.id).catch(() => undefined)
  const { t } = await useTranslation("event")

  return {
    title: event?.name ?? t("error.title"),
  }
}


const Page = async ({ params }: PageProps) => {
  const event = await getEvent(params.id).catch(() => undefined)
  if (!event) notFound()

  return (
    <>
      <Suspense
        fallback={
          <Content>
            <h1 className={styles.name}>
              <span className={styles.bone} />
            </h1>
            <div className={styles.date}>
              <span className={styles.bone} />
            </div>
            <div className={styles.info}>
              <span
                className={styles.bone}
                style={{ width: "20em" }}
              />
            </div>
            <div className={styles.info}>
              <span
                className={styles.bone}
                style={{ width: "20em" }}
              />
            </div>
          </Content>
        }
      >
        <Content>
          <h2 className={styles.name}>Event: {event.name}</h2>

        </Content>
      </Suspense>

      <EventAvailabilities event={event} />

    </>
  )
}

export default Page
