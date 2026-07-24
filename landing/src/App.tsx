import { Suspense } from "react";
import Nav from "./sections/Nav";
import Hero from "./sections/Hero";
import Speed from "./sections/Speed";
import HowItWorks from "./sections/HowItWorks";
import BentoFeatures from "./sections/BentoFeatures";
import Audience from "./sections/Audience";
import Pricing from "./sections/Pricing";
import CTA from "./sections/CTA";
import ProductWindow from "./components/ProductWindow";

function App() {
  return (
    <main className="grain">
      <Nav />
      <Hero />

      {/* ProductWindow: cena-herói ao vivo, flutua sobre a base do herói */}
      <div className="relative z-10 -mt-40 px-4 pb-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Suspense fallback={null}>
            <ProductWindow />
          </Suspense>
        </div>
      </div>

      <Speed />
      <HowItWorks />
      <BentoFeatures />
      <Audience />
      <Pricing />
      <CTA />
    </main>
  );
}

export default App;
