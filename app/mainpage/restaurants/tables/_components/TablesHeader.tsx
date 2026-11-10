"use client";

import { PublishRestaurantButton } from "../../_components/PublishRestaurantButton";

export function TablesHeader() {
  return (
    <section className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-[#111111]">Tables & floors</h1>
        <p className="mt-1 text-[15px] text-[#6B665E]">
          Draw the room, place tables, then save the floor.
        </p>
      </div>
      <PublishRestaurantButton />
    </section>
  );
}
