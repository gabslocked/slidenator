import Nav from "./sections/Nav";
import Hero from "./sections/Hero";
import HowItWorks from "./sections/HowItWorks";
import BentoFeatures from "./sections/BentoFeatures";
import Pricing from "./sections/Pricing";
import CTA from "./sections/CTA";

function App() {
  return (
    <main className="grain">
      <Nav />
      <Hero />
      <HowItWorks />
      <BentoFeatures />
      <Pricing />
      <CTA />
    </main>
  );
}

export default App;
