export async function extractImageBlob(
  imageEntry: FormDataEntryValue | null,
  imageUrl: string | null
): Promise<Blob | null> {
  if (imageEntry && typeof imageEntry === "object" && "arrayBuffer" in imageEntry) {
    const buffer = await (imageEntry as Blob).arrayBuffer();
    return new Blob([buffer], {
      type: (imageEntry as Blob).type || "image/png",
    });
  }

  if (imageUrl) {
    const fetched = await fetch(imageUrl);
    return await fetched.blob();
  }

  return null;
}
