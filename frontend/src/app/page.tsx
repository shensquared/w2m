import { Suspense } from "react";
import { Trans } from "react-i18next/TransWithoutContext";
import Link from "next/link";

import Content from "/src/components/Content/Content";
import CreateForm from "/src/components/CreateForm/CreateForm";
import DownloadButtons from "/src/components/DownloadButtons/DownloadButtons";
import Footer from "/src/components/Footer/Footer";
import Header from "/src/components/Header/Header";
import { P } from "/src/components/Paragraph/Text";
import Recents from "/src/components/Recents/Recents";
import Section from "/src/components/Section/Section";
import Stats from "/src/components/Stats/Stats";
import Video from "/src/components/Video/Video";
import { useTranslation } from "/src/i18n/server";

const Page = async () => {
    const { t, i18n } = await useTranslation("home");

    return (
        <>
            <Content>
                <Header isFull />
            </Content>

            <Recents />

            <Content>
                <CreateForm />
            </Content>
        </>
    );
};

export default Page;
