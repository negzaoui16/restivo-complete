"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import type { JoinRestaurant, MyJoinRequest } from "@/lib/staff/types";

export function JoinBoard({
  restaurants,
  requests,
  query,
  sendingId,
  error,
  onSend,
}: {
  restaurants: JoinRestaurant[];
  requests: MyJoinRequest[];
  query: string;
  sendingId: string | null;
  error: string | null;
  onSend: (restaurantId: string, message: string) => Promise<boolean>;
}) {
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? restaurants.filter((place) => `${place.name} ${place.city ?? ""}`.toLowerCase().includes(needle))
    : restaurants;
  const pendingIds = new Set(requests.map((request) => request.restaurantId));

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-[28px]">Find a restaurant</h1>
        <p className="mt-1 max-w-xl text-sm text-[#736D65]">
          You are not on a team yet. Choose a restaurant and send a request. The workspace opens after they accept you.
        </p>
      </header>

      {requests.length > 0 && (
        <ul className="flex flex-col gap-2">
          {requests.map((request) => (
            <li key={request.id} className="rounded-2xl border border-[#E7D3C4] bg-[#FBF7F2] px-4 py-3 text-sm">
              <span className="font-semibold">{request.restaurantName}</span>
              <span className="text-[#8A4B32]"> · Request sent</span>
              {request.message ? <p className="mt-1 text-[13px] text-[#6B665E]">{request.message}</p> : null}
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="text-sm font-medium text-[#B55234]">{error}</p> : null}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-[#EDE7DC] bg-white px-4 py-10 text-sm text-[#736D65]">
          {restaurants.length === 0
            ? "No restaurants are open for staff yet."
            : "No restaurants match that search."}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((place) => (
            <RestaurantChoice
              key={place.id}
              place={place}
              pending={pendingIds.has(place.id)}
              sending={sendingId === place.id}
              onSend={onSend}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RestaurantChoice({
  place,
  pending,
  sending,
  onSend,
}: {
  place: JoinRestaurant;
  pending: boolean;
  sending: boolean;
  onSend: (restaurantId: string, message: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <li className="flex flex-col rounded-2xl border border-[#EDE7DC] bg-white p-4">
      <h2 className="text-[15px] font-bold">{place.name}</h2>
      {place.city ? (
        <p className="mt-1 flex items-center gap-1 text-[12px] text-[#8C877D]">
          <MapPin className="h-3.5 w-3.5" />
          {place.city}
        </p>
      ) : null}
      {place.description ? <p className="mt-2 line-clamp-2 text-[13px] text-[#6B665E]">{place.description}</p> : null}

      {pending ? (
        <p className="mt-3 text-[13px] font-semibold text-[#8A4B32]">Request sent</p>
      ) : open ? (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onSend(place.id, message).then((sent) => {
              if (sent) setOpen(false);
            });
          }}
        >
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={280}
            rows={3}
            placeholder="A short note for the restaurant (optional)"
            className="rounded-xl border border-[#E5DFD3] px-3 py-2 text-sm focus:border-[#B55234] focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-[#E5DFD3] px-3 py-1.5 text-[13px] font-semibold text-[#6B665E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-[#B55234] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#9E4328] disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 w-fit rounded-lg bg-[#B55234] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#9E4328]"
        >
          Request to join
        </button>
      )}
    </li>
  );
}
