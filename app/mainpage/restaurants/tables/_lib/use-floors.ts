"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { FloorObject } from "../_components/floor-plan/floor-object";
import {
  apiCreateFloor,
  apiDeleteFloor,
  apiDuplicateFloor,
  apiListFloors,
  apiReorderFloor,
  apiSetFloorActive,
  apiSaveLayout,
  apiUpdateFloor,
} from "@/lib/floors/client";
import type { PublicFloor } from "@/lib/floors/types";

export function useRestaurantFloors(restaurantId: string | undefined) {
  const { isReady, getAccessToken } = useAuth();
  const [floors, setFloors] = useState<PublicFloor[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = Boolean(restaurantId) && loadedFor !== restaurantId;

  const token = useCallback(() => {
    const value = getAccessToken();
    if (!value) throw new Error("Sign in again to manage floors.");
    return value;
  }, [getAccessToken]);

  useEffect(() => {
    if (!isReady || !restaurantId) return;
    let cancelled = false;
    const id = restaurantId;
    Promise.resolve()
      .then(() => apiListFloors(token(), id))
      .then((next) => {
        if (cancelled) return;
        setFloors(next);
        setActiveId((current) => (current && next.some((floor) => floor.id === current) ? current : next[0]?.id ?? null));
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(messageOf(err));
      })
      .finally(() => {
        if (!cancelled) setLoadedFor(id);
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, restaurantId, token]);

  const run = useCallback(
    async (work: (accessToken: string, id: string) => Promise<void>) => {
      if (!restaurantId) return;
      setError(null);
      try {
        await work(token(), restaurantId);
      } catch (err) {
        setError(messageOf(err));
        throw err;
      }
    },
    [restaurantId, token],
  );

  const create = useCallback(
    (input: { name: string; width: number; height: number }) =>
      run(async (accessToken, id) => {
        const floor = await apiCreateFloor(accessToken, id, input);
        setFloors((current) => [...current, floor].sort((a, b) => a.sortOrder - b.sortOrder));
        setActiveId(floor.id);
      }),
    [run],
  );

  const update = useCallback(
    (floorId: string, input: { name: string; width: number; height: number }) =>
      run(async (accessToken, id) => {
        const floor = await apiUpdateFloor(accessToken, id, floorId, input);
        setFloors((current) => current.map((item) => (item.id === floor.id ? floor : item)));
      }),
    [run],
  );

  const remove = useCallback(
    (floorId: string) =>
      run(async (accessToken, id) => {
        const next = await apiDeleteFloor(accessToken, id, floorId);
        setFloors(next);
        setActiveId(next[0]?.id ?? null);
      }),
    [run],
  );

  const duplicate = useCallback(
    (floorId: string) =>
      run(async (accessToken, id) => {
        const floor = await apiDuplicateFloor(accessToken, id, floorId);
        setFloors((current) => [...current, floor].sort((a, b) => a.sortOrder - b.sortOrder));
        setActiveId(floor.id);
      }),
    [run],
  );

  const reorder = useCallback(
    (floorId: string) =>
      run(async (accessToken, id) => {
        setFloors(await apiReorderFloor(accessToken, id, floorId));
      }),
    [run],
  );

  const setActive = useCallback(
    (floorId: string, isActive: boolean) =>
      run(async (accessToken, id) => {
        setFloors(await apiSetFloorActive(accessToken, id, floorId, isActive));
      }),
    [run],
  );

  const saveLayout = useCallback(
    async (objects: FloorObject[], publish = false) => {
      if (!restaurantId || !activeId) throw new Error("Choose a floor first.");
      const floor = await apiSaveLayout(token(), restaurantId, activeId, objects, publish);
      setFloors((current) => current.map((item) => (item.id === floor.id ? floor : item)));
      setError(null);
    },
    [activeId, restaurantId, token],
  );

  const activeFloor = floors.find((floor) => floor.id === activeId) ?? null;

  return { floors, activeFloor, loading, error, select: setActiveId, create, update, remove, duplicate, reorder, setActive, saveLayout };
}

function messageOf(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong.";
}
