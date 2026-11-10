"use client";

import Image from "next/image";
import { RestivoGlyph } from "./RestivoGlyph";
import { formatMemberSince, profileInitials } from "../_lib/profile";

interface ProfileIdentityCardProps {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  createdAt: unknown;
}

export function ProfileIdentityCard({
  firstName,
  lastName,
  displayName,
  email,
  avatarUrl,
  createdAt,
}: ProfileIdentityCardProps) {
  const name = displayName || `${firstName} ${lastName}`.trim() || "Guest";
  const initials = profileInitials(firstName, lastName, displayName);
  const memberSince = formatMemberSince(createdAt);

  return (
    <aside className="relative overflow-hidden rounded-2xl border border-[#E8E2D7] bg-[#F3EBE3] p-5 sm:p-6 shadow-2xs">
      <RestivoGlyph
        className="pointer-events-none absolute -right-3 -top-2 w-28 h-28 opacity-[0.12]"
        color="#B55234"
      />

      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0705C]">
        On the reservation
      </p>

      <div className="mt-5 flex items-center gap-4">
        {avatarUrl ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-[#E2DDD3]">
            <Image src={avatarUrl} alt={name} fill className="object-cover" />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#B55234] text-lg font-extrabold tracking-wide text-white shadow-sm">
            {initials}
          </div>
        )}

        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold tracking-tight text-[#1A1A1A]">
            {name}
          </h2>
          <p className="mt-0.5 truncate text-xs text-[#7A746B]">{email}</p>
        </div>
      </div>

      {memberSince && (
        <p className="mt-5 text-[12px] text-[#8A7F74]">
          At Restivo since {memberSince}
        </p>
      )}

      <div className="mt-6 border-t border-[#E3DDD1] pt-4">
        <RestivoGlyph className="mb-2 h-4 w-4" color="#B55234" />
        <p className="text-[13px] font-semibold leading-snug text-[#2C2926]">
          Good food
        </p>
        <p className="text-[12px] leading-tight text-[#7A746B]">
          brings people together
        </p>
        <div className="mt-2.5 h-[2px] w-6 rounded-full bg-[#B55234]" />
      </div>
    </aside>
  );
}
