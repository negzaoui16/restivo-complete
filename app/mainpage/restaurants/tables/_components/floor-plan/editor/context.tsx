"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FloorEditorApi } from "./use-floor-editor";

const FloorEditorContext = createContext<FloorEditorApi | null>(null);

export function FloorEditorProvider({ value, children }: { value: FloorEditorApi; children: ReactNode }) {
  return <FloorEditorContext.Provider value={value}>{children}</FloorEditorContext.Provider>;
}

export function useFloorEditorContext() {
  const value = useContext(FloorEditorContext);
  if (!value) throw new Error("Floor editor components must render inside FloorEditor.");
  return value;
}
