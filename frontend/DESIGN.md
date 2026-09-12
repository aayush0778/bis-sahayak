# BIS Sahayak — Design System ("Gazette" direction, v2)

The previous skin hit 2.5 of the five generic-AI-template tells (identical rounded
cards with the same soft shadow everywhere; emphasis-by-colour inside the hero
copy; a few ALL-CAPS tracked labels; no gradients or scroll animations). This
document is the replacement system. It is grounded in what the product is: a
regulatory-compliance assistant — it should read like an official document that
happens to be interactive, because credibility *is* the feature.

## Colour

| Token | Value | Use |
|---|---|---|
| `paper` | `#FAF8F3` | page background — warm off-white, "gazette paper", never pure white |
| `paper-deep` | `#F2EEE3` | alternate section bands, inset panels |
| `paper-edge` | `#E7E1D3` | hairline rules and borders (1px) |
| `ink` | `#1C1B19` | primary text |
| `ink-soft` | `#57534E` | secondary text, captions |
| `ink-faint` | `#8A8478` | metadata, timestamps |
| `navy` | `#1E3A5F` | primary actions, links, standard-number chips, the header band |
| `navy-deep` | `#152A45` | header/footer background |
| `navy-wash` | `#EAEFF5` | selected/hover tint for navy elements |
| `brass` | `#B8860B` | the "mandatory" badge, active markers, the seal — hallmark-adjacent, used sparingly |
| `signal` | `#9B2C2C` | QCO deadline warnings only — never decorative |
| `moss` | `#2F6846` | success/verified states |

No gradients anywhere. Colour is information first, decoration a distant second.

## Type

- Headings: **Source Serif 4** (fallback Georgia/serif) — reads as "official
  document", carries the personality.
- Body/UI: **IBM Plex Sans** (fallback system sans) — workmanlike, invisible.
- Sentence case everywhere. No ALL-CAPS tracked labels; where a label needs
  distinction, use small-caps or a hairline rule.

## Layout devices (instead of the identical-card grid)

- **Notice block** — for findings with authority: a double-rule border
  (2px outer navy + 1px inner hairline), a reference number, dated. Used by the
  Applicability Wizard result ("Notice of Applicability") and verification results.
- **Gazette timeline** — for the QCO Radar: a vertical rule on the left, dated
  entries with brass date markers. Chronology is the point; cards are not.
- **Cards** — reserved for genuinely comparable discrete units: the three
  certification schemes (ISI / CRS / Hallmark) side by side, and at most the
  landing feature trio. Slightly rounded (`rounded-sm`), hairline border, no drop
  shadow.
- **Hexagonal seal motif** — a small six-sided frame echoing the geometric ISI
  device, used as the logo mark, list bullets and icon frame. One repeated
  geometric motif instead of coloured icon tiles.

## Motion

Exactly one deliberate moment: when a chat answer lands, its citation chips
"stamp" into place (settle from 1.35× to 1× with an opacity fade, ~260 ms).
No scroll-triggered animations, no hover-lift. All motion collapses under
`prefers-reduced-motion: reduce`.

## Accessibility floor

Visible `:focus-visible` rings (2px navy offset), labelled form controls,
semantic landmarks, `aria-live` on async result regions, and the reduced-motion
respect above.
