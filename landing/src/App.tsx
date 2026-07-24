import { Suspense } from "react";
import Nav from "./sections/Nav";
import Hero from "./sections/Hero";
import HowItWorks from "./sections/HowItWorks";
import BentoFeatures from "./sections/BentoFeatures";
import Pricing from "./sections/Pricing";
import CTA from "./sections/CTA";
import ProductWindow from "./components/ProductWindow";

function App() {
  return (
    <main className="grain">
      <Nav />
      <Hero />

      {/* ProductWindow: live demo, floats over the bottom of the hero */}
      <div className="relative z-10 -mt-44 px-4 pb-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Suspense fallback={null}>
            <ProductWindow />
          </Suspense>
        </div>
      </div>

      <HowItWorks />
      <BentoFeatures />
      <Pricing />
      <CTA />
    </main>
  );
}

export default App;
