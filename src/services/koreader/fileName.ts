export function fileNameFromUri(localUri: string): string {
  const withoutQuery = localUri.split(/[?#]/)[0];
  const slashIndex = withoutQuery.lastIndexOf('/');
  const fileName =
    slashIndex >= 0 ? withoutQuery.slice(slashIndex + 1) : withoutQuery;

  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
}
