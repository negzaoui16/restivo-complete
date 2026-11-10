"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffChrome } from "./_context/staff-chrome";
import { staffClock } from "./_lib/clock";
import { useJoinBoard } from "./_lib/use-join-board";
import { JoinBoard } from "./_components/JoinBoard";
import { StaffWorkspace } from "./_components/StaffWorkspace";

export default function StaffPage() {
  const router = useRouter();
  const { user, isReady } = useAuth();
  const { search, setWorkplace } = useStaffChrome();
  const { board, error, sendingId, send, loaded } = useJoinBoard();

  useEffect(() => {
    if (!isReady) return;
    if (!user?.isStaff) router.replace("/mainpage");
  }, [isReady, user?.isStaff, router]);

  useEffect(() => {
    if (!loaded) return;
    const place = board?.membership;
    setWorkplace(
      place
        ? { name: place.restaurantName, city: place.city, coverUrl: place.coverUrl }
        : null
    );
  }, [loaded, board, setWorkplace]);

  if (!isReady || !user?.isStaff || !loaded) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#7A746B]">
        Loading your workspace…
      </div>
    );
  }

  if (!board?.membership) {
    return (
      <div className="py-1">
        <JoinBoard
          restaurants={board?.restaurants ?? []}
          requests={board?.requests ?? []}
          query={search}
          sendingId={sendingId}
          error={error}
          onSend={send}
        />
      </div>
    );
  }

  const { greeting, dateLabel } = staffClock();

  return (
    <div className="py-1">
      <StaffWorkspace greeting={greeting} dateLabel={dateLabel} restaurantId={board.membership.restaurantId} />
    </div>
  );
}
