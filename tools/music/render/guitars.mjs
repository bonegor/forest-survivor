// tools/music/render/guitars.mjs — the guitars the menu-music renderer can play a song on:
// node tools/music/render.mjs --guitar=<id>. Each guitar says what plays the song's lead guitar and
// what plays the rest of its guitars (role "rhythm", or any role but "lead"); channels whose program
// is not a guitar (GM 24-31) keep their own voice on MuseScore General. A part is one of
//   { engine: 'sf', font, bank, program, gainDb }  a SoundFont preset through FluidSynth (no
//                                                  program: the song's own, from bank 0)
//   { engine: 'ks', preset, gainDb }               the plucked-string synth of render/pluck.mjs
//                                                  (no preset: nylon or steel by the song's program)
// gainDb trims the part's stem before the mixer (which balances lead against rhythm anyway when
// the song asks for a balance); range [lo, hi] is the part's playable keys (notes outside are
// reported). Fonts live in tools/music/bin/ (git-ignored); the README says where each came from.
// `listen: true` marks the guitars of the listening set (--guitar=listen --excerpt=20, written to
// public/audio/music/menu/guitars/).

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin');

// SoundFonts. `credit` is the line a shipped render made with the font must carry
// (public/audio/music/CREDITS.md); `licence` and `url` say where it came from. `trim`: render
// from a copy whose samples start at their attack (render/sf2trim.mjs, kept in bin/sf/cache/).
// `auditionOnly`: only for the --excerpt listening set, never for a full render.
export const FONTS = {
  musescore: {
    file: process.env.SOUNDFONT || path.join(BIN, 'MuseScore_General.sf3'),
    name: 'MuseScore General 0.2', licence: 'MIT',
    url: 'https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/',
    credit: 'FluidR3 by Frank Wen (c) 2000-02; FluidR3Mono by Michael Cowgill (c) 2014-17; MuseScore_General adaptation by S. Christian Collins (c) 2018-19; MIT licence, https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/',
  },
  generaluser: {
    file: path.join(BIN, 'sf', 'generaluser-gs', 'GeneralUser-GS.sf2'),
    name: 'GeneralUser GS 2.0.3', licence: 'GeneralUser GS License v2.0 (free use, commercial included)',
    // its author cannot vouch for the origin of every sample: audition excerpts only, no full renders
    auditionOnly: true,
    url: 'https://www.schristiancollins.com/generaluser',
    credit: 'GeneralUser GS v2.0.3 by S. Christian Collins (c) 1997-2025, https://www.schristiancollins.com/generaluser, GeneralUser GS License v2.0',
  },
  'fp-classical': {
    file: path.join(BIN, 'sf', 'freepats-spanish-classical', 'SpanishClassicalGuitar-SF2-20190618', 'SpanishClassicalGuitar-20190618.sf2'),
    name: 'FreePats Spanish Classical Guitar 2019-06-18', licence: 'CC0 1.0',
    // its samples keep 0-35 ms of silence before the pluck: played from a copy starting each at its attack
    trim: { threshold: 0.03, keepMs: 1.5 },
    url: 'https://freepats.zenvoid.org/Guitar/acoustic-guitar.html',
    credit: 'Spanish Classical Guitar (2019-06-18), recorded by Roberto (roberto@zenvoid.org) for the FreePats project, https://freepats.zenvoid.org/Guitar/acoustic-guitar.html, CC0 1.0',
  },
  'fp-jazz': {
    file: path.join(BIN, 'sf', 'freepats-fsbs-jazz', 'EGuitarFSBS-jazz bridge small SF2-20260807', 'EGuitarFSBS-jazz bridge small 20260807.sf2'),
    name: 'FreePats FSBS Electric Guitar Clean #2 (Jazz), bridge, small, 2026-08-07', licence: 'CC0 1.0',
    url: 'https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html',
    credit: 'FSBS Electric Guitar Clean #2 (Jazz) (2026-08-07), FreePats project, https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html, CC0 1.0',
  },
  'fp-harp': {
    file: path.join(BIN, 'sf', 'freepats-concert-harp', 'ConcertHarp-SF2-20200702', 'ConcertHarp-20200702.sf2'),
    name: 'FreePats Concert Harp 2020-07-02 (Versilian Community Sample Library)', licence: 'CC0 1.0',
    url: 'https://freepats.zenvoid.org/OrchestralStrings/harp.html',
    credit: 'Concert Harp (2020-07-02), FreePats project, from the Versilian Community Sample Library by Versilian Studios LLC, https://freepats.zenvoid.org/OrchestralStrings/harp.html, CC0 1.0',
  },
  'fp-ukulele': {
    file: path.join(BIN, 'sf', 'freepats-ukulele', 'Ukulele SF2-20260811', 'Ukulele 20260811.sf2'),
    name: 'FreePats Ukulele 2026-08-11', licence: 'CC0 1.0',
    url: 'https://freepats.zenvoid.org/GuitarFamily/ukulele.html',
    credit: 'Ukulele (2026-08-11), recorded by Mateusz Dąbrowski for the FreePats project, https://freepats.zenvoid.org/GuitarFamily/ukulele.html, CC0 1.0',
  },
};

const sf = (font, program, bank = 0, more = {}) => ({ engine: 'sf', font, bank, program, ...more });
const ks = (preset) => ({ engine: 'ks', preset });
const both = (part) => ({ lead: part, rhythm: part });
const MS = { source: FONTS.musescore.name, licence: 'MIT' };
const GU = { source: FONTS.generaluser.name, licence: FONTS.generaluser.licence };
const fp = (font) => ({ source: FONTS[font].name, licence: FONTS[font].licence });
const SYNTH = { source: 'Plucked-string synth (render/pluck.mjs)', licence: 'original, no samples' };

// The table. `label` names the guitar on the audition page and in candidates.json; `source` and
// `licence` are shown next to it.
export const GUITARS = {
  // the first three renderers, unchanged: the song's own guitars, all steel, the synth
  sf: { label: "MuseScore (the song's guitars)", ...MS, ...both({ engine: 'sf', font: 'musescore' }) },
  'sf-steel': { label: 'MuseScore all steel', ...MS, ...both(sf('musescore', 25)) },
  ks: { label: 'Plucked synth', ...SYNTH, listen: true, ...both({ engine: 'ks' }) },

  // MuseScore General (what the sf renders play): each distinct guitar-like sample set
  'ms-nylon': { label: 'MuseScore nylon', ...MS, listen: true, ...both(sf('musescore', 24)) },
  'ms-steel': { label: 'MuseScore steel', ...MS, listen: true, ...both(sf('musescore', 25)) },
  'ms-jazz': { label: 'MuseScore jazz guitar (warm)', ...MS, listen: true, ...both(sf('musescore', 26)) },
  'ms-clean': { label: 'MuseScore clean electric', ...MS, listen: true, ...both(sf('musescore', 27)) },
  'ms-12string': { label: 'MuseScore 12-string', ...MS, listen: true, ...both(sf('musescore', 25, 8)) },
  'ms-ukulele': { label: 'MuseScore "ukulele" (filtered nylon)', ...MS, listen: true, ...both(sf('musescore', 24, 8)) },
  'ms-mandolin': { label: 'MuseScore "mandolin" (filtered steel)', ...MS, listen: true, ...both(sf('musescore', 25, 16)) },
  'ms-harp': { label: 'MuseScore harp', ...MS, listen: true, ...both(sf('musescore', 46)) },

  // GeneralUser GS: the listening set only (FONTS.generaluser.auditionOnly)
  'gu-nylon': { label: 'GeneralUser nylon', ...GU, listen: true, ...both(sf('generaluser', 24)) },
  'gu-steel': { label: 'GeneralUser steel', ...GU, listen: true, ...both(sf('generaluser', 25)) },
  'gu-jazz': { label: 'GeneralUser jazz guitar', ...GU, listen: true, ...both(sf('generaluser', 26)) },
  'gu-clean': { label: 'GeneralUser clean electric', ...GU, listen: true, ...both(sf('generaluser', 27)) },
  'gu-12string': { label: 'GeneralUser 12-string', ...GU, listen: true, ...both(sf('generaluser', 25, 8)) },
  'gu-harp': { label: 'GeneralUser harp', ...GU, listen: true, ...both(sf('generaluser', 46)) },

  // FreePats: one instrument a font, preset 0:0
  'fp-classical': { label: 'FreePats Spanish classical', ...fp('fp-classical'), listen: true, ...both(sf('fp-classical', 0)) },
  'fp-jazz': { label: 'FreePats jazz electric', ...fp('fp-jazz'), listen: true, ...both(sf('fp-jazz', 0, 0, { range: [35, 86] })) },
  'fp-harp': { label: 'FreePats concert harp', ...fp('fp-harp'), listen: true, ...both(sf('fp-harp', 0)) },
  // the ukulele's pitched samples start at Bb3 (58), and B2/C3 (47/48) are a body tap and a chuck,
  // so it plays the lead only, over the classical guitar
  'fp-ukulele': { label: 'FreePats ukulele lead + classical', source: 'FreePats Ukulele + Spanish Classical Guitar', licence: 'CC0 1.0', listen: true, lead: sf('fp-ukulele', 0, 0, { range: [58, 86] }), rhythm: sf('fp-classical', 0) },

  // the plucked-string synth, softened
  'ks-warm': { label: 'Plucked synth, warm', ...SYNTH, listen: true, ...both(ks('nylon-warm')) },
  'ks-steel-soft': { label: 'Plucked synth, soft steel', ...SYNTH, listen: true, ...both(ks('steel-soft')) },
};

// The guitar ids of a --guitar list: ids, "listen" (the listening set) or "all".
export function guitarIds(list) {
  const out = [];
  for (const id of list) {
    const ids = id === 'all' ? Object.keys(GUITARS) : id === 'listen' ? Object.keys(GUITARS).filter((k) => GUITARS[k].listen) : [id];
    for (const k of ids) {
      if (!GUITARS[k]) throw new Error(`unknown guitar ${k} (known: ${Object.keys(GUITARS).join(', ')}; or listen, all)`);
      if (!out.includes(k)) out.push(k);
    }
  }
  return out;
}

// The fonts a guitar plays, with their credit lines.
export function fontsOf(id) {
  const g = GUITARS[id];
  return [...new Set([g.lead, g.rhythm].filter((p) => p.engine === 'sf').map((p) => p.font))].map((k) => ({ id: k, ...FONTS[k] }));
}
