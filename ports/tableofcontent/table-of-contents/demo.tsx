"use client";

import { TableOfContents } from "@/components/table-of-contents";

// Neutral wireframe placeholders (inline SVG, no network), adapted from the
// upstream demo's own placeholder shots.
const shots = {
  panel:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1340' height='946' viewBox='0 0 1340 946'%3E%3Crect width='1340' height='946' fill='%23f3f4f6'/%3E%3Crect x='150' y='150' width='1040' height='646' rx='44' fill='%23424346'/%3E%3Ccircle cx='250' cy='250' r='36' fill='%23ffffff'/%3E%3Crect x='320' y='222' width='650' height='56' rx='28' fill='%23ffffff' opacity='.78'/%3E%3Crect x='240' y='370' width='860' height='78' rx='28' fill='%23ffffff' opacity='.22'/%3E%3Crect x='240' y='490' width='680' height='78' rx='28' fill='%23ffffff' opacity='.18'/%3E%3C/svg%3E",
  cards:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1180' height='860' viewBox='0 0 1180 860'%3E%3Crect width='1180' height='860' fill='%23fbfbfc'/%3E%3Crect x='110' y='116' width='960' height='628' rx='52' fill='%23d8d8dc'/%3E%3Crect x='196' y='210' width='360' height='420' rx='32' fill='%23ffffff'/%3E%3Crect x='624' y='210' width='360' height='160' rx='32' fill='%23424346'/%3E%3Crect x='624' y='414' width='360' height='216' rx='32' fill='%23ffffff' opacity='.76'/%3E%3C/svg%3E",
  chart:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1240' height='780' viewBox='0 0 1240 780'%3E%3Crect width='1240' height='780' fill='%23f7f7f8'/%3E%3Cpath d='M180 560L390 260l210 170 190-240 270 370z' fill='%23424346'/%3E%3Ccircle cx='300' cy='210' r='64' fill='%23d8d8dc'/%3E%3C/svg%3E",
  form: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='1180' viewBox='0 0 900 1180'%3E%3Crect width='900' height='1180' fill='%23f0f1f3'/%3E%3Crect x='120' y='150' width='660' height='880' rx='56' fill='%23ffffff'/%3E%3Crect x='190' y='250' width='520' height='64' rx='32' fill='%23424346'/%3E%3Crect x='190' y='394' width='360' height='44' rx='22' fill='%23d8d8dc'/%3E%3Crect x='190' y='486' width='460' height='44' rx='22' fill='%23d8d8dc'/%3E%3C/svg%3E",
  list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1340' height='946' viewBox='0 0 1340 946'%3E%3Crect width='1340' height='946' fill='%23fafafa'/%3E%3Crect x='160' y='160' width='1020' height='626' rx='46' fill='%23f0f1f3'/%3E%3Crect x='230' y='230' width='300' height='486' rx='30' fill='%23424346'/%3E%3Crect x='580' y='230' width='530' height='86' rx='24' fill='%23ffffff'/%3E%3Crect x='580' y='360' width='420' height='86' rx='24' fill='%23ffffff'/%3E%3Crect x='580' y='490' width='480' height='86' rx='24' fill='%23ffffff'/%3E%3C/svg%3E",
  graph:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1120' height='840' viewBox='0 0 1120 840'%3E%3Crect width='1120' height='840' fill='%23f6f6f7'/%3E%3Ccircle cx='560' cy='420' r='86' fill='%23424346'/%3E%3Ccircle cx='300' cy='250' r='58' fill='%23d8d8dc'/%3E%3Ccircle cx='820' cy='250' r='58' fill='%23d8d8dc'/%3E%3Ccircle cx='300' cy='590' r='58' fill='%23d8d8dc'/%3E%3Ccircle cx='820' cy='590' r='58' fill='%23d8d8dc'/%3E%3Cpath d='M350 285l160 100M770 285L610 385M350 555l160-100M770 555L610 455' stroke='%23424346' stroke-width='18' stroke-linecap='round'/%3E%3C/svg%3E",
};

const sections = [
  {
    id: "toc-demo-overview",
    title: "Overview",
    description: "What the workspace does and who it is for.",
    images: [shots.panel, shots.cards],
  },
  {
    id: "toc-demo-insights",
    title: "Insights",
    description: "Trends and reports, refreshed every hour.",
    images: [shots.chart, shots.form],
  },
  {
    id: "toc-demo-schedule",
    title: "Schedule",
    description: "Plan the week and share it with the team.",
    images: [shots.list],
  },
  {
    id: "toc-demo-people",
    title: "People",
    description: "Who works on what, and how they connect.",
    images: [shots.graph],
  },
];

export default function TableOfContentsDemo() {
  return (
    <div className="mx-auto grid max-w-2xl gap-16 py-10 md:ps-24">
      {/* 24px rows meet WCAG 2.2 target size (SC 2.5.8); the default is upstream's 20px. */}
      <TableOfContents items={sections} rowHeight={24} />
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="grid gap-4">
          <h2 className="font-medium text-2xl tracking-tight">
            {section.title}
          </h2>
          <p className="text-muted-foreground">{section.description}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.images.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                className="w-full rounded-xl bg-muted"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
