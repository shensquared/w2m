import { Metadata } from "next"
import { Karla } from "next/font/google"

import Egg from "/src/components/Egg/Egg"
import Settings from "/src/components/Settings/Settings"
import TranslateDialog from "/src/components/TranslateDialog/TranslateDialog"
import { fallbackLng } from "/src/i18n/options"
import { useTranslation } from "/src/i18n/server"

import "./global.css"

const karla = Karla({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://w2m.shenshen.mit.edu"),
  title: {
    absolute: "W2M ShenSquared",
    template: "%s - W2M Shen²",
  },
  keywords: [
    "schedule",
    "availability",
    "availabilities",
    "when2meet",
    "doodle",
    "meet",
    "plan",
    "time",
    "timezone",
  ],
  description:
        "Enter your availability to find a time that works for everyone!",
  themeColor: "#C2C0BF",
  manifest: "manifest.json",
  openGraph: {
    title: "W2M ShenSquared",
    description:
            "Enter your availability to find a time that works for everyone!",
    url: "/",
  },
  icons: {
    icon: "favicon.ico",
    apple: "shen192.png",
  },
}

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const { resolvedLanguage } = await useTranslation([])

  return (
    <html lang={resolvedLanguage ?? fallbackLng}>
      <body className={karla.className}>
        <Settings />
        <Egg />
        <TranslateDialog />

        {children}
      </body>
    </html>
  )
}

export default RootLayout
