import Content from "/src/components/Content/Content"
import CreateForm from "/src/components/CreateForm/CreateForm"
import Footer from "/src/components/Footer/Footer"
import Header from "/src/components/Header/Header"
import Recents from "/src/components/Recents/Recents"

const Page = async () => {

  return (
    <>
      <Content>
        <Header isFull />
      </Content>

      <Recents />

      <Content>
        <CreateForm />
      </Content>

      <Footer />
    </>
  )
}

export default Page
