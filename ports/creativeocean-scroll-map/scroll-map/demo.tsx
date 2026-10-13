"use client";

import * as React from "react";

import { ScrollMap } from "@/components/ui/scroll-map";

// Simple original glyphs for the two lines of detail.
const CALENDAR =
  "M6 2h2v2h8V2h2v2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2zM4 10v10h16V10z";
const MARKER =
  "M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 4.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z";

// One pass down and back up the page, in milliseconds.
const PASS = 12_000;

export default function MapDemo() {
  const scroller = React.useRef<HTMLDivElement>(null);

  // On the gallery wall nobody can scroll, so the demo scrolls its own
  // container down and back up with a cosine ease. The wall marks a paused
  // specimen (off screen, in a hidden tab, under reduced motion, or on the
  // visitor's pause) with data-loop-paused: skip every step then and look
  // again a quarter of a second later. On the component page the visitor
  // scrolls it themselves.
  React.useEffect(() => {
    const element = scroller.current;
    if (!element?.closest("[data-specimen]")) {
      return;
    }
    let frame = 0;
    let timer = 0;
    let elapsed = 0;
    let last = performance.now();
    const step = () => {
      frame = 0;
      const now = performance.now();
      if (element.closest("[data-loop-paused]")) {
        last = now;
        timer = window.setTimeout(step, 250);
        return;
      }
      elapsed = (elapsed + Math.min(now - last, 100)) % PASS;
      last = now;
      const max = element.scrollHeight - element.clientHeight;
      element.scrollTop =
        (max * (1 - Math.cos((2 * Math.PI * elapsed) / PASS))) / 2;
      frame = requestAnimationFrame(step);
    };
    step();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={scroller}
      className="relative h-[28rem] w-[40rem] max-w-full overflow-y-auto overscroll-contain rounded-xl border [container-type:size]"
    >
      <ScrollMap
        container={scroller}
        label="Ride route"
        description="A street map with the ride's route drawn from Lantern Garden to Civic Hall as you scroll."
      >
        <h1>Bike to Work Day</h1>
        <h2>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" d={CALENDAR} />
          </svg>{" "}
          June 5, 2026 @ 8:30AM — 10:30AM Pacific Time
        </h2>
        <h2>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" d={MARKER} />
          </svg>{" "}
          Lantern Garden: 2 Quay Street, Port Meridian
        </h2>

        <p>
          To mark the city's Bike to Work Day we are hosting a short ride and a
          morning gathering with the Harbor Cycling Alliance. Since 2016 the
          Alliance has used this day to bring neighbours together around safer
          streets, better bus stops and paths that connect the waterfront with
          the old town, and to ask everyone who rides, walks or rolls what
          should change next.
        </p>

        <p>
          This year's ride begins at Lantern Garden (meet by the bandstand) and
          follows the quay to the Civic Hall, where a short welcome is followed
          by coffee and pastries from the bakery on Quay Street. Join for the
          whole morning or for any part of it. Everyone riding will be asked to
          sign a short waiver at the start.
        </p>

        <p>
          As advocates for people-first streets, the Alliance campaigns for
          protected bike lanes, frequent and dependable transit, and planning
          that puts homes, shops and schools within reach of everyone. Donations
          support that work across the city and the wider county.
        </p>

        <div className="shaded">
          <h3>SCHEDULE:</h3>
          <ul>
            <li>
              <b>8:30-9 am</b> » Gather at Lantern Garden (meet by the
              bandstand)
            </li>
            <li>
              <b>9 am</b> » Ride departs Lantern Garden
            </li>
            <li>
              <b>9:20 am</b> » Ride concludes at Civic Hall
            </li>
            <li>
              <b>9:30 am</b> » Welcome from the Alliance on the Civic Hall steps
            </li>
            <li>
              <b>9:45-10:30 am</b> » Social gathering with photos, coffee and
              pastries
            </li>
          </ul>
        </div>
      </ScrollMap>
    </div>
  );
}
