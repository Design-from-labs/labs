"use client";

import { useRef } from "react";
import {
  type ProductTourStep,
  useProductTour,
} from "@/components/ui/product-tour";

const projects = [
  { name: "Spring launch", team: "Design", status: "In review" },
  { name: "Onboarding refresh", team: "Product", status: "Active" },
  { name: "Pricing page", team: "Growth", status: "Draft" },
];

export default function ProductTourDemo() {
  const search = useRef<HTMLInputElement>(null);
  const create = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const steps: ProductTourStep[] = [
    {
      element: search,
      popover: {
        title: "Search everything",
        description: "Find projects, people and files from one field.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: create,
      popover: {
        title: "Start a project",
        description: "Create one in a click, blank or from a template.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: list,
      popover: {
        title: "Your projects",
        description: "Everything in progress, with its status at a glance.",
        side: "top",
        align: "start",
      },
    },
  ];

  const tour = useProductTour({ steps, showProgress: true });

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/50 px-4 py-2.5 text-sm">
        <p className="text-muted-foreground" dir="auto">
          New here? Take a quick tour.
        </p>
        <button
          className="h-8 shrink-0 rounded-md border bg-background px-3 font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
          onClick={() => tour.start()}
          type="button"
        >
          Start tour
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <h2 className="me-auto font-semibold text-lg">Projects</h2>
        <div className="flex items-center gap-2">
          <input
            aria-label="Search projects"
            className="h-9 w-36 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Search"
            ref={search}
            type="search"
          />
          <button
            className="h-9 shrink-0 rounded-md bg-primary px-3 font-medium text-primary-foreground text-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
            ref={create}
            type="button"
          >
            New project
          </button>
        </div>
      </div>
      <ul className="divide-y border-t" ref={list}>
        {projects.map((project) => (
          <li
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            key={project.name}
          >
            <span>
              <span className="block font-medium">{project.name}</span>
              <span className="block text-muted-foreground text-xs">
                {project.team}
              </span>
            </span>
            <span className="rounded-full border px-2 py-0.5 text-muted-foreground text-xs">
              {project.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
