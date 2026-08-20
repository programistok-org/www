// Wyciąga ID wideo z różnych formatów linków YouTube.
// Obsługuje: watch?v=, youtu.be/, /embed/, /shorts/ oraz samo ID.
export function youtubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function youtubeEmbedUrl(url) {
  const id = youtubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
