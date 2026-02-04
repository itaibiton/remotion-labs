import {
  Navbar,
  Hero,
  CreateDemo,
  Gallery,
  Features,
  HowItWorks,
  Pricing,
  Footer,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <CreateDemo />
      <section id="gallery">
        <Gallery />
      </section>
      <section id="features">
        <Features />
      </section>
      <HowItWorks />
      <section id="pricing">
        <Pricing />
      </section>
      <Footer />
    </main>
  );
}
