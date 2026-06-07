import { SiteHeader } from "@/components/layout/SiteHeader";
import { NeuralNetworkViz } from "@/components/visualizations/NeuralNetwork/NeuralNetworkViz";
import { GradientDescentViz } from "@/components/visualizations/GradientDescent/GradientDescentViz";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Playground" };

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Playground</h1>
        <p className="text-slate-400 mb-10">
          Interact directly with ML visualizations — no lesson required.
        </p>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Neural Network</h2>
          <NeuralNetworkViz
            layers={[
              { units: 3, label: "Input" },
              { units: 5, label: "Hidden 1" },
              { units: 4, label: "Hidden 2" },
              { units: 2, label: "Output" },
            ]}
            animated
          />
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Gradient Descent</h2>
          <GradientDescentViz />
        </section>
      </main>
    </div>
  );
}
