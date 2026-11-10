"use client";

import type { FloorObject } from "./floor-object";
import { FloorEditorProvider, useFloorEditorContext } from "./editor/context";
import { useFloorEditor } from "./editor/use-floor-editor";
import { FloorCanvas } from "./FloorCanvas";
import { FloorCanvas3D } from "./FloorCanvas3D";
import { FloorToolbar } from "./FloorToolbar";
import { ObjectLibrary } from "./ObjectLibrary";
import { PerimeterWallsModal } from "./PerimeterWallsModal";
import { PropertiesPanel } from "./PropertiesPanel";

export function FloorEditor({
  width,
  height,
  objects,
  onSave,
  onPublish,
}: {
  width: number;
  height: number;
  objects: FloorObject[];
  onSave: (objects: FloorObject[]) => Promise<void>;
  onPublish: (objects: FloorObject[]) => Promise<void>;
}) {
  const editor = useFloorEditor({ width, height, initialObjects: objects, onSave, onPublish });

  return (
    <FloorEditorProvider value={editor}>
      <FloorEditorContent />
    </FloorEditorProvider>
  );
}

function FloorEditorContent() {
  const editor = useFloorEditorContext();

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col gap-3">
      <FloorToolbar />
      <div className="flex min-h-0 flex-1 gap-3">
        <ObjectLibrary />
        {editor.viewMode === "2d" ? <FloorCanvas /> : <FloorCanvas3D />}
        <PropertiesPanel />
      </div>

      {editor.perimeterModalOpen ? (
        <PerimeterWallsModal
          floorWidth={editor.width}
          floorHeight={editor.height}
          onApply={(objects, replaceExisting) => {
            editor.applyPerimeterWalls(objects, replaceExisting);
            editor.setPerimeterModalOpen(false);
          }}
          onClose={() => editor.setPerimeterModalOpen(false)}
        />
      ) : null}
    </section>
  );
}
