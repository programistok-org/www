// Buduje presspack: nota (PDF/DOCX/TXT), logotypy, zdjęcia prelegentów, grafiki, ZIP.
// Wynik ląduje w public/press/ i jest serwowany razem ze stroną.
// Użycie: npm run press-kit
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const PRESS = `${REPO}/public/press`;
const NOTA_PDF = `${REPO}/src/assets/nota-prasowa-2026.pdf`;

const nota = JSON.parse(readFileSync(`${REPO}/src/data/nota-prasowa-2026.json`, 'utf8'));
const agenda = JSON.parse(readFileSync(`${REPO}/src/data/agenda2026.json`, 'utf8'));

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const dir = (p) => (mkdirSync(p, { recursive: true }), p);

// czyścimy tylko generowane podkatalogi, żeby nie zgubić niczego dorzuconego ręcznie
for (const sub of ['nota-prasowa', 'logotypy', 'prelegenci', 'grafiki']) rmSync(`${PRESS}/${sub}`, { recursive: true, force: true });
dir(PRESS);

// ——————————————————————————————— 1. nota prasowa ———————————————————————————————
const NOTA_DIR = dir(`${PRESS}/nota-prasowa`);
const NOTA_BASE = 'programistok-2026-nota-prasowa';

if (existsSync(NOTA_PDF)) copyFileSync(NOTA_PDF, `${NOTA_DIR}/${NOTA_BASE}.pdf`);
else console.warn('! brak PDF-a noty w src/assets — pomijam');

// TXT: wersja do wklejenia, bez łamania wierszy w akapicie
const txt = [
  nota.title,
  '',
  ...nota.blocks.flatMap((b) => {
    if (b.type === 'h2') return ['', b.text.toUpperCase(), ''];
    if (b.type === 'quote') return [`„${b.text}”`, ''];
    if (b.type === 'attr') return [b.text, ''];
    if (b.type === 'link') return [`${b.label}: ${b.href}`, ''];
    return [b.text, ''];
  }),
  '---',
  'Programistok 2026 · 25–26.09.2026 · Politechnika Białostocka, Białystok',
  'Materiały dla mediów: https://programistok.org/dla-mediow',
].join('\n');
writeFileSync(`${NOTA_DIR}/${NOTA_BASE}.txt`, txt);

// DOCX: minimalny OOXML z formatowaniem bezpośrednim (bez styles.xml)
const xmlEsc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const para = (text, { size = 22, bold = false, italic = false, after = 160, color = null } = {}) =>
  `<w:p><w:pPr><w:spacing w:after="${after}" w:line="276" w:lineRule="auto"/></w:pPr>` +
  `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` +
  (bold ? '<w:b/>' : '') +
  (italic ? '<w:i/>' : '') +
  (color ? `<w:color w:val="${color}"/>` : '') +
  `</w:rPr><w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r></w:p>`;

const docBody = [
  para(nota.title, { size: 40, bold: true, after: 280 }),
  ...nota.blocks.map((b) => {
    if (b.type === 'h2') return para(b.text, { size: 30, bold: true, after: 200 });
    if (b.type === 'lead') return para(b.text, { bold: true, after: 240 });
    if (b.type === 'quote') return para(`„${b.text}”`, { italic: true });
    if (b.type === 'attr') return para(b.text, { bold: true, after: 240 });
    if (b.type === 'link') return para(`${b.label}: ${b.href}`, { bold: true });
    return para(b.text);
  }),
  para('Programistok 2026 · 25–26.09.2026 · Politechnika Białostocka, Białystok', { size: 18, color: '595959', after: 40 }),
  para('Materiały dla mediów: https://programistok.org/dla-mediow', { size: 18, color: '595959' }),
].join('');

const DOCX_TMP = dir(`${REPO}/.astro/docx`);
rmSync(DOCX_TMP, { recursive: true, force: true });
dir(`${DOCX_TMP}/_rels`);
dir(`${DOCX_TMP}/word`);
writeFileSync(
  `${DOCX_TMP}/[Content_Types].xml`,
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
);
writeFileSync(
  `${DOCX_TMP}/_rels/.rels`,
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
);
writeFileSync(
  `${DOCX_TMP}/word/document.xml`,
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${docBody}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418"/></w:sectPr>
</w:body></w:document>`
);
rmSync(`${NOTA_DIR}/${NOTA_BASE}.docx`, { force: true });
sh('zip', ['-r', '-X', '-q', `${NOTA_DIR}/${NOTA_BASE}.docx`, '[Content_Types].xml', '_rels', 'word'], { cwd: DOCX_TMP });
console.log('✓ nota prasowa: pdf / docx / txt');

// ——————————————————————————————— 2. logotypy ———————————————————————————————
const LOGO_DIR = dir(`${PRESS}/logotypy`);
dir(`${LOGO_DIR}/svg`);
dir(`${LOGO_DIR}/png`);

// źródłowy kontur jest żółty — dla mediów potrzebne są też wersje jednobarwne
const recolor = (svg, color) => svg.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`);
const konturSrc = readFileSync(`${REPO}/public/programistok-kontur.svg`, 'utf8');

const LOGOS = [
  ['programistok-sygnet-kolor', readFileSync(`${REPO}/public/programistok-sygnet.svg`, 'utf8')],
  ['programistok-sygnet-na-ciemnym', readFileSync(`${REPO}/public/programistok-sygnet-white.svg`, 'utf8')],
  ['programistok-kontur-czarny', recolor(konturSrc, '#14130F')],
  ['programistok-kontur-bialy', recolor(konturSrc, '#F4F2EC')],
];
for (const [name, svg] of LOGOS) {
  const file = `${LOGO_DIR}/svg/${name}.svg`;
  writeFileSync(file, svg);
  for (const w of [1024, 4096]) {
    sh('rsvg-convert', ['-w', String(w), '-o', `${LOGO_DIR}/png/${name}-${w}.png`, file]);
  }
}
console.log(`✓ logotypy: ${LOGOS.length} × svg + ${LOGOS.length * 2} × png (przezroczyste tło)`);

// ——————————————————————————————— 3. prelegenci ———————————————————————————————
const SPK_DIR = dir(`${PRESS}/prelegenci`);
dir(`${SPK_DIR}/zdjecia`);

// tylko osoby, które faktycznie mają wystąpienie w agendzie
const speaking = new Set(agenda.sessions.flatMap((s) => s.speakers || []));
const trackLabel = Object.fromEntries(agenda.tracks.map((t) => [t.id, t.label]));
const talkOf = Object.fromEntries(
  agenda.sessions.flatMap((s) => (s.speakers || []).map((id) => [id, { topic: s.topic, track: trackLabel[s.track], day: s.day }]))
);

const speakers = agenda.speakers.filter((s) => speaking.has(s.id));
// część prelegentów nie ma jeszcze zdjęcia — w paczce są tylko biogramy
const withPhoto = speakers.filter((s) => s.photo && existsSync(`${REPO}/public${s.photo}`));
const noPhoto = speakers.filter((s) => !withPhoto.includes(s));
for (const s of withPhoto) {
  const src = `${REPO}/public${s.photo}`;
  const png = `${REPO}/.astro/${s.id}.png`;
  sh('dwebp', [src, '-o', png]);
  sh('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '90', png, '--out', `${SPK_DIR}/zdjecia/${s.id}.jpg`]);
  rmSync(png, { force: true });
}

const bioMd = [
  '# Programistok 2026 — prelegenci',
  '',
  'Zdjęcia w katalogu `zdjecia/`. Wykorzystanie w materiałach o konferencji — bez ograniczeń.',
  '',
  ...speakers.flatMap((s) => {
    const t = talkOf[s.id] || {};
    return [
      `## ${s.name}`,
      '',
      t.topic ? `**${t.track ? `Ścieżka ${t.track}` : ''}${t.day ? `, dzień ${t.day}` : ''}:** ${t.topic}`.replace(/^\*\*, /, '**') : '',
      '',
      (s.bio || '').trim(),
      '',
      s.photo ? `Zdjęcie: \`zdjecia/${s.id}.jpg\`` : '_Brak zdjęcia w paczce._',
      '',
    ].filter((x) => x !== '');
  }),
].join('\n');
writeFileSync(`${SPK_DIR}/prelegenci-bio.md`, bioMd + '\n');

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\s+/g, ' ').trim()}"`;
const csv = [
  ['imie_i_nazwisko', 'sciezka', 'dzien', 'temat', 'bio', 'plik_zdjecia'].join(','),
  ...speakers.map((s) => {
    const t = talkOf[s.id] || {};
    return [s.name, t.track, t.day, t.topic, s.bio, s.photo ? `zdjecia/${s.id}.jpg` : ''].map(csvCell).join(',');
  }),
].join('\n');
writeFileSync(`${SPK_DIR}/prelegenci.csv`, '﻿' + csv + '\n'); // BOM — Excel czyta polskie znaki
console.log(
  `✓ prelegenci: ${withPhoto.length} zdjęć + ${speakers.length} biogramów (md/csv)` +
    (noPhoto.length ? ` — bez zdjęcia: ${noPhoto.map((s) => s.name).join(', ')}` : '')
);

// ——————————————————————————————— 4. grafiki ———————————————————————————————
execFileSync('node', [`${HERE}/press-graphics.mjs`], { stdio: 'inherit' });

// ——————————————————————————————— 5. README + ZIP ———————————————————————————————
const grafiki = existsSync(`${PRESS}/grafiki`) ? readdirSync(`${PRESS}/grafiki`).sort() : [];
const readme = `PROGRAMISTOK 2026 — MATERIAŁY DLA MEDIÓW
========================================

Konferencja IT i biznesu
25–26 września 2026, Politechnika Białostocka, Białystok
https://programistok.org

W skrócie
---------
- 2 dni (po raz pierwszy w historii konferencji)
- ponad 500 uczestników
- ponad 24 prezentacje + case studies i lightning talki
- 2 ścieżki: IT i Biznes, jeden bilet daje dostęp do obu
- Partner Strategiczny: Województwo Podlaskie
- Patronat Honorowy: JM Rektor Politechniki Białostockiej dr hab. inż. Marta Kosior-Kazberuk, prof. PB
- Współpraca i wsparcie: Fundacja INFOTECH, Wydział Informatyki Politechniki Białostockiej

Film promujący
--------------
${nota.video}

Zawartość paczki
----------------
nota-prasowa/   nota w PDF, DOCX i TXT (TXT do wklejenia w CMS)
logotypy/       sygnet i kontur — SVG oraz PNG 1024 i 4096 px, przezroczyste tło
                *-na-ciemnym  — wersja na ciemne tła
prelegenci/     zdjęcia JPG + biogramy (prelegenci-bio.md, prelegenci.csv)
grafiki/        gotowe grafiki prasowe (PNG 2x):
${grafiki.map((f) => `                ${f}`).join('\n')}

Zasady wykorzystania
--------------------
Materiały można wykorzystywać w publikacjach dotyczących Programistoku 2026.
Prosimy nie modyfikować logotypów (proporcje, kolory, dodatkowe elementy).
Zdjęcia prelegentów — wyłącznie w kontekście konferencji.

Kontakt dla mediów
------------------
Adam Piotrowski, jeden z organizatorów Programistoku
tel. 668 842 999

Materiały online: https://programistok.org/dla-mediow
Facebook:  https://www.facebook.com/programistok
LinkedIn:  https://www.linkedin.com/company/programistok-conference
YouTube:   https://www.youtube.com/@programistok

Paczka wygenerowana: ${new Date().toISOString().slice(0, 10)}
`;
writeFileSync(`${PRESS}/README.txt`, readme);

const ZIP = `${PRESS}/programistok-2026-press-kit.zip`;
rmSync(ZIP, { force: true });
sh('zip', ['-r', '-q', ZIP, 'README.txt', 'nota-prasowa', 'logotypy', 'prelegenci', 'grafiki'], { cwd: PRESS });
const zipMb = (readFileSync(ZIP).length / 1024 / 1024).toFixed(1);
console.log(`✓ ZIP: public/press/programistok-2026-press-kit.zip (${zipMb} MB)`);

// ——————————————————————————————— 6. manifest dla strony ———————————————————————————————
// Strona /dla-mediow czyta ten plik zamiast skanować public/ w czasie builda.
const px = (f) => {
  const m = f.match(/(\d+)x(\d+)/);
  return m ? `${m[1]}×${m[2]} px` : '';
};
const label = (f) =>
  f.startsWith('w-liczbach') ? 'Konferencja w liczbach' : f.includes('jasny') ? 'Key visual — wersja jasna' : 'Key visual';
writeFileSync(
  `${REPO}/src/data/press-kit.json`,
  JSON.stringify(
    {
      generated: new Date().toISOString().slice(0, 10),
      zip: { href: '/press/programistok-2026-press-kit.zip', size: `${zipMb} MB` },
      nota: {
        pdf: `/press/nota-prasowa/${NOTA_BASE}.pdf`,
        docx: `/press/nota-prasowa/${NOTA_BASE}.docx`,
        txt: `/press/nota-prasowa/${NOTA_BASE}.txt`,
      },
      grafiki: grafiki.map((f) => ({ file: f, href: `/press/grafiki/${f}`, label: label(f), size: px(f) })),
      logotypy: readdirSync(`${LOGO_DIR}/svg`)
        .sort()
        .map((f) => ({
          name: basename(f, '.svg'),
          svg: `/press/logotypy/svg/${f}`,
          png: `/press/logotypy/png/${basename(f, '.svg')}-4096.png`,
        })),
      prelegenci: {
        liczba: speakers.length,
        zdjecia: withPhoto.length,
        bioMd: '/press/prelegenci/prelegenci-bio.md',
        csv: '/press/prelegenci/prelegenci.csv',
        osoby: speakers.map((s) => ({
          name: s.name,
          photo: s.photo ? `/press/prelegenci/zdjecia/${s.id}.jpg` : null,
          photoPosition: s.photoPosition || null,
          topic: (talkOf[s.id] || {}).topic || '',
          track: (talkOf[s.id] || {}).track || '',
        })),
      },
    },
    null,
    2
  ) + '\n'
);
console.log('✓ manifest: src/data/press-kit.json');
