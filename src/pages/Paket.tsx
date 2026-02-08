import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PackagesPreview from "@/components/PackagesPreview";

const Paket = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20">
        <PackagesPreview />
      </main>
      <Footer />
    </div>
  );
};

export default Paket;
