import agenda from '../data/agenda2026.json';

export const { cfp, days, tracks } = agenda;

const byId = Object.fromEntries(agenda.speakers.map((s) => [s.id, s]));

export const speakerById = (id) => byId[id];

export const trackById = (id) => tracks.find((t) => t.id === id);

export const sessionsFor = (trackId, day) =>
  agenda.sessions.filter((s) => s.track === trackId && s.day === day);

// bloki wspólne dla obu ścieżek (rejestracja, otwarcie, zakończenie) — track "all"
export const ALL_TRACKS = 'all';

export const timeRange = (s) => (s.end ? `${s.time}–${s.end}` : s.time);

const minutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Oś czasu dnia obejmuje tylko czas, w którym ścieżki idą równolegle. Wspólne
// punkty (rejestracja, otwarcie, zakończenie) nic nie przykrywają, więc stoją
// poza skalą jako zwarte pasy nad i pod siatką; afterparty tak samo.
export const dayTimeline = (day) => {
  // hidden: punkt jeszcze niepotwierdzony, zostaje w danych, ale nie na stronie
  const all = agenda.sessions.filter((s) => s.day === day && !s.hidden);
  const inTracks = all.filter((s) => s.track !== ALL_TRACKS);
  const from = Math.min(...inTracks.map((s) => minutes(s.time)));
  const to = Math.max(...inTracks.map((s) => minutes(s.end)));
  // 5 minut na przepięcie między wystąpieniami nie dostaje własnego bloku:
  // poprzednia sesja w siatce sięga do startu następnej
  const place = (s, i, list) => {
    const next = list[i + 1];
    const gap = next ? minutes(next.time) - minutes(s.end) : 0;
    const end = gap > 0 && gap <= 5 ? minutes(next.time) : minutes(s.end);
    return { ...s, top: minutes(s.time) - from, length: end - minutes(s.time) };
  };
  const clock = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const hours = [];
  for (let m = Math.ceil(from / 60) * 60; m <= to; m += 60) hours.push({ label: clock(m), top: m - from });
  const common = all.filter((s) => s.track === ALL_TRACKS);

  return {
    length: to - from,
    // przesunięcie linii siatki, żeby wypadały na pełnych godzinach i połówkach
    offsetHour: (60 - (from % 60)) % 60,
    offsetHalf: (30 - (from % 30)) % 30,
    hours,
    before: common.filter((s) => minutes(s.time) < from),
    tracks: tracks.map((t) => ({ ...t, sessions: inTracks.filter((s) => s.track === t.id).sort((a, b) => a.time.localeCompare(b.time)).map(place) })),
    after: common.filter((s) => minutes(s.time) >= to),
  };
};

// czy sesja ma co pokazać w modalu
export const hasDetails = (s) => Boolean(s.abstract) || peopleOf(s).some((p) => p.bio);

// prelekcje i case studies danej ścieżki, bez paneli i przerw w programie
export const talksFor = (trackId) =>
  agenda.sessions.filter((s) => s.track === trackId && (s.kind === 'talk' || s.kind === 'lt'));

export const peopleOf = (session) => session.speakers.map((id) => byId[id]).filter(Boolean);

// sesja + prelegent w kształcie, którego oczekuje SpeakerCard
export const cardFor = (session) => {
  const [person] = peopleOf(session);
  return { ...person, topic: session.topic, abstract: session.abstract };
};
