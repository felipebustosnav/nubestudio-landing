import Footer from '@/components/Footer';
import Homepage from '@/components/Homepage';
import Loader from '@/components/Loader';
import Nav from '@/components/Nav';

export default function Page() {
  return (
    <>
      <Loader />
      <Nav />
      <Homepage />
      <Footer />
    </>
  );
}
