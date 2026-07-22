/** First chunk is kept short so speech starts ASAP; later chunks are bigger to cut TTS round trips. */
export const FIRST_CHUNK_MIN_CHARS = 20;
export const CHUNK_MIN_CHARS = 150;
export const CHUNK_MAX_CHARS = 400;

/** Pulls the next speakable chunk off a streaming buffer at a sentence boundary past minChars. */
export function takeReadyChunk(
  buffer: string,
  minChars: number,
  maxChars: number,
): { chunk: string; rest: string } | null {
  const boundary = /[.!?]+(?:\s+|$)|\n+/g;
  let match: RegExpExecArray | null;
  let lastEnd = -1;

  while ((match = boundary.exec(buffer))) {
    const end = match.index + match[0].length;
    if (end >= minChars) {
      return { chunk: buffer.slice(0, end).trim(), rest: buffer.slice(end) };
    }
    lastEnd = end;
  }

  if (buffer.length >= maxChars) {
    if (lastEnd > 0) {
      return {
        chunk: buffer.slice(0, lastEnd).trim(),
        rest: buffer.slice(lastEnd),
      };
    }
    const spaceIdx = buffer.lastIndexOf(" ", maxChars);
    const cut = spaceIdx > 0 ? spaceIdx + 1 : maxChars;
    return { chunk: buffer.slice(0, cut).trim(), rest: buffer.slice(cut) };
  }

  return null;
}
