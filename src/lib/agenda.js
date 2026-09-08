import agenda from '../data/agenda2026.json';

export const { cfp, days, tracks } = agenda;

const byId = Object.fromEntries(agenda.speakers.map((s) => [s.id, s]));

export const speakerById = (id) => byId[id];

export const trackById = (id) => tracks.find((t) => t.id === id);

export const sessionsFor = (trackId, day) =>
  agenda.sessions.filter((s) => s.track === trackId && s.day === day);

// prelekcje i case studies danej ścieżki, bez paneli i przerw w programie
export const talksFor = (trackId) =>
  agenda.sessions.filter((s) => s.track === trackId && (s.kind === 'talk' || s.kind === 'lt'));

export const peopleOf = (session) => session.speakers.map((id) => byId[id]).filter(Boolean);

// sesja + prelegent w kształcie, którego oczekuje SpeakerCard
export const cardFor = (session) => {
  const [person] = peopleOf(session);
  return { ...person, topic: session.topic, abstract: session.abstract };
};
