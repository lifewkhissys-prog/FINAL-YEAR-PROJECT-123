# DevLab Thesis Assessor — Fix Spec

Give this whole document to Opus 5 as the build/fix brief. It diagnoses why the
current Groq pipeline produces generic output across all four degree levels, and
specifies the architecture, prompts, and guardrails needed to fix it.

---

## 1. Root cause of the "slop"

The current output fails for three structural reasons, not a wording problem:

1. **No forced evidence grounding.** Agents are asked to critique a thesis but
   never required to point at a specific sentence, table, or section number. An
   LLM with no evidence requirement defaults to the most statistically likely
   phrasing for "PhD thesis critique," which is generic academic boilerplate —
   the same four sentences reordered per chapter.
2. **No computed score.** A score like "39.0 out of 89.5, 43.6%" is generated as
   text, not computed from itemized criteria. The model is pattern-matching to
   "grading reports have a precise-looking number," not doing arithmetic on
   real sub-scores.
3. **One rubric, four labels.** BSc/MSc/MPhil/PhD are currently just a string
   swapped into the same prompt template. Nothing in the pipeline actually
   changes what "good" means at each level, so the model falls back on its
   generic idea of "advanced academic writing" regardless of which label was
   passed in.

Fix all three and the genericness mostly disappears on its own — you don't need
a fundamentally different model, just a pipeline that can't produce output
without doing the grounding and arithmetic work first.

---

## 2. Target pipeline architecture

Replace the current single-pass-per-chapter (or single-pass-overall) call with
a five-stage pipeline. Each stage's output is the next stage's input — don't
let any stage skip straight to prose.

```
Stage 1: Structural extraction
Stage 2: Rubric loading (degree-level specific)
Stage 3: Evidence gathering (per criterion, per chapter)
Stage 4: Scoring (computed, not generated)
Stage 5: Narrative synthesis (constrained to cite Stage 3 evidence only)
```

### Stage 1 — Structural extraction
Parse the document into a JSON structure before any LLM call touches it:

```json
{
  "chapters": [
    { "id": "ch1", "title": "Introduction", "text": "...", "word_count": 1820 }
  ],
  "tables": [{ "id": "t3.1", "caption": "users table", "raw": "..." }],
  "figures": [{ "id": "fig3.1", "caption": "..." }],
  "references": [{ "raw": "Streamlit Team. (2023)...", "cited_in_text": false }],
  "toc": [{ "number": "3.4", "title": "System requirement" }],
  "metadata": { "font_info_available": false, "word_count_total": 9400 }
}
```

Critical: set `font_info_available` / 
`spacing_info_available` honestly based on
whether you actually parsed the docx XML for formatting, not just extracted
text. **If you didn't parse formatting metadata, the pipeline must not be
allowed to make formatting compliance claims** (Times New Roman, line spacing,
etc.) — that's what produced the hallucinated formatting section in your test
output. Gate those checks behind an `if font_info_available` flag.

Also do simple deterministic checks in code, not via LLM, since they're 100%
reliable and free:
- Duplicate section numbers in `toc` (e.g., two "3.4" entries)
- References never appearing as in-text citations (cross-check `references[].raw`
  author/year against chapter text)
- Chapters below a minimum word count for the stated degree level
- Missing standard chapters for the degree level (e.g., PhD needs a distinct
  literature review chapter; BSc FYP commonly doesn't)

These deterministic findings get injected into Stage 3 as pre-verified facts —
free, accurate, and they anchor the LLM output in something real immediately.

### Stage 2 — Rubric loading (degree-level specific)
Don't put "BSc/MSc/MPhil/PhD" in a prompt as a label. Load a **different rubric
object** per level with different criteria, weights, and pass thresholds. See
Section 4 below for the actual rubric content — this is the single highest-
leverage fix, because it's what currently doesn't differ at all between levels.

### Stage 3 — Evidence gathering (batched per chapter, NOT per criterion)
This is the stage that was silently exploding your call count. Each rubric
(Section 4) maps most criteria 1:1 onto a specific chapter — e.g. for the
KNUST monograph structure, "Critical Review of Literature" only ever applies
to the Literature Review chapter, "Approach and Methodology" only to the
Methodology chapter, and so on. **Do not loop criteria × chapters.** Instead,
run exactly one call per chapter, passing it only the sub-criteria that the
rubric says apply to that chapter:

```
You are extracting evidence, not evaluating. Below are the criteria that
apply to THIS chapter only (from the {degree_level} rubric):

{criteria_for_this_chapter_json}
  e.g. for a Literature Review chapter under the PhD rubric:
  [
    { "id": "2a", "text": "Evidence of scholarly analysis and criticism of
      research relevant to the topic", "max_points": 4 },
    { "id": "2b", "text": "Meticulous citation of relevant scholarly work",
      "max_points": 4 },
    { "id": "2c", "text": "Competence in understanding and evaluating the
      material", "max_points": 4 },
    { "id": "2d", "text": "Differences/similarities drawn with previous
      investigations; knowledge gaps identified", "max_points": 4 },
    { "id": "2e", "text": "Robust conceptual/theoretical framework developed
      and justified from the literature", "max_points": 4 }
  ]

Given this chapter's text:
{chapter_text}

Return JSON — one entry per criterion id above:
{
  "findings": [
    {
      "criterion_id": "2a",
      "evidence_found": true/false,
      "quotes": [ { "text": "<=25 words, verbatim", "location": "Section 2.3" } ],
      "gap_description": "only if evidence_found is false — describe
         specifically what's missing for THIS criterion in THIS chapter,
         not a generic weakness"
    }
  ]
}

Rules:
- Do not evaluate quality or assign a score yet — only report what is
  present or absent, per criterion.
- If nothing relevant to a given criterion exists in this chapter, say
  evidence_found: false. Do not invent a plausible-sounding gap.
- Quotes must be copied exactly, not paraphrased.
```

This is one call per chapter (typically 4–6 chapters), regardless of how many
sub-criteria that chapter's rubric section has — the model handles a 2–5 item
checklist against one chapter of text fine in a single call. Add one more call
for document-wide criteria that don't belong to any single chapter (e.g.
"Presentation" — formatting, referencing, word-length conformance, which
spans the whole document). That's the fix for the 100+ call count: it turns
`criteria × chapters` into `chapters + 1`, typically **5–7 calls total** for
this stage instead of 20–30+.

### Call-count and latency budget for the whole pipeline

| Stage | Calls | Notes |
|---|---|---|
| 1. Structural extraction | 0 | Deterministic code (docx/pdf parsing), not an LLM call |
| 2. Rubric loading | 0 | Just loading the JSON rubric for the selected degree level |
| 3. Evidence gathering | ~1 per chapter + 1 document-wide (≈5–7) | Batched by chapter, not by criterion |
| 4. Scoring | 1 | One batched call over all gathered evidence, so marks are calibrated consistently against each other |
| 5. Narrative synthesis | 1–3 | Split only if you hit Groq's output-token limit for a long report |
| 6. Self-check pass | 1 | Cheap classifier call on the finished report |

**Total: ~9–13 calls**, scaling with chapter count rather than with
`chapters × criteria`. Run all of Stage 3's chapter calls **concurrently**
(`Promise.all` / `asyncio.gather`) since they're independent of each other —
wall-clock time then becomes roughly one chapter-call latency (not 5–7x that),
plus scoring, plus synthesis, plus self-check.

**Loading states** should reflect these real stages rather than one spinner:
"Reading document structure" → "Loading {degree level} rubric" →
"Analyzing chapter 3 of 6..." (update live as each parallel Stage 3 call
resolves) → "Scoring against rubric" → stream Stage 5's narrative
token-by-token into the UI as it generates (this is the single biggest lever
on *perceived* speed, since the user is reading text within seconds instead
of waiting for a full-page dump) → "Running quality check."

### Stage 4 — Scoring (computed, never generated as prose)
Once evidence is gathered, score each criterion with a separate call that
returns **only a number and a one-line justification tied to the evidence from
Stage 3** — never let the model both gather evidence and assign a score in the
same call, since that's when it starts anchoring the score to vibes.

```json
{
  "criterion": "literature_review_critical_synthesis",
  "max_points": 15,
  "score": 6,
  "justification": "Evidence shows descriptive summaries of 4 sources
     (Section 2.2) but zero comparative or critical statements found across
     all evidence-gathering passes for this criterion."
}
```

Then **sum the criteria in code**, not in an LLM call. The overall score is
`sum(criterion.score) / sum(criterion.max_points)`. This is the fix for the
"39.0 out of 89.5, 43.6%" problem — that number must be arithmetic on real
sub-scores you can show in an appendix table, not a single model utterance.

### Stage 5 — Narrative synthesis (constrained)
Only now do you generate the prose report (strengths, corrections table,
chapter-by-chapter, priority action plan). Constrain it hard:

```
Write the chapter-by-chapter critique using ONLY the evidence and scores
provided below. You may not state a weakness unless it appears in a
gap_description below. You may not state a strength unless it is backed by
a quote below.

Evidence and scores:
{stage_3_and_4_output_as_json}

For every bullet point you write, it must be traceable to one specific
evidence or gap entry above. If two chapters have the same gap_description,
you may still note it in both, but do not use identical wording — reference
what IS different between the chapters even when the gap category is the same.

Banned phrases (these are generic filler that must never appear):
- "lacks a nuanced analysis"
- "fails to provide a clear explanation"
- "lacks a clear discussion of future directions"
- "demonstrates a good grasp of"
- any sentence that would be equally true if you replaced the thesis topic
  with a different topic
```

That banned-phrase list is worth hardcoding literally — after you see a model
produce slop once, its exact filler phrases are highly predictable and cheap
to blocklist.

---

## 3. Groq-specific implementation notes

- **Use JSON mode / structured outputs** for Stages 1, 3, and 4 — don't parse
  free text. Groq's OpenAI-compatible endpoint supports `response_format:
  {"type": "json_object"}` on supported models; validate against a schema
  (e.g., with Zod/Pydantic) and retry on failure rather than silently accepting
  malformed output.
- **Lower temperature (0.1–0.3) for Stages 3–4**, since these are extraction
  and scoring tasks where you want consistency, not creativity. Stage 5 (prose)
  can run slightly higher (0.4–0.6) for readability, but never above that —
  high temperature is part of why the same rubric-shaped filler keeps
  recurring, since the model reaches for the most probable academic-sounding
  phrase.
- **Model choice**: for Stage 3 (evidence extraction against a chapter of
  text), a larger context-capable Groq model matters more than raw reasoning
  strength, since the task is retrieval-shaped, not generative. For Stage 4
  (scoring) and Stage 5 (synthesis), a stronger reasoning model pays off more.
  If cost allows, don't use the same model size for every stage.
- **Cache Stage 1 and Stage 2 output** per document/degree-level pair — they're
  deterministic and don't need to be recomputed if the candidate re-runs
  assessment with the same rubric.

---

## 4. Degree-level rubrics (make these genuinely different, not relabeled)

**Sourcing matters here and should be visible in the output.** PhD and MPhil
below are transcribed directly from KNUST's official "Guide for Preparation
and Evaluation of Higher Degree Research Thesis" (June 2016), Appendices 4.2
and 4.4 — real marks, real sub-criteria, out of 100. MSc and BSc are **not**
covered by that guide (it explicitly scopes to PhD/MPhil/taught-Master HDR
for the numeric appendices, and BSc isn't HDR at all), so those two are
reasonable derivations — implement them with a `"source": "derived"` field in
the rubric JSON (vs. `"source": "KNUST HDR Guide 2016, Appendix 4.2/4.4"` for
PhD/MPhil) and surface that distinction in the final report footer, so the
candidate knows which numbers are institutionally authoritative and which
are a defensible approximation.

Each rubric object needs, per criterion: `id`, `text`, `max_points`,
`chapter` (which chapter's evidence-gathering call it belongs to, or
`"document-wide"` for things like Presentation). This `chapter` field is what
Stage 3 uses to batch correctly instead of exploding into a cross-product.

### PhD — source: KNUST HDR Guide 2016, Appendix 4.2 (100 marks total)

Chapter structure assumed: Ch1 Introduction, Ch2 Literature Review, Ch3
Methodology, Ch4 Results, Ch5 General Discussion, Ch6 Conclusions (KNUST
monograph Option 1 — adjust chapter ids if the candidate used the
manuscript-based Option 2 instead).

| # | Criterion | Sub-criteria | Marks | Chapter |
|---|---|---|---|---|
| 1 | Statement of Problem & Justification | a. articulate topic & implications (5); b. justification, local/international perspective (5); c. research questions/objectives/hypotheses (5) | 15 | Ch1 |
| 2 | Critical Review of Literature & Frameworks | a. scholarly analysis/criticism (4); b. meticulous citation (4); c. competence evaluating material (4); d. gaps/differences vs. prior work (4); e. robust conceptual/theoretical framework (4) | 20 | Ch2 |
| 3 | Approach and Methodology | a. design/blueprint with justification (5); b. sampling procedures with justification (5); c. data collection/analysis framework (5) | 15 | Ch3 |
| 4 | Analysis of Data & Presentation of Results | a. appropriate analysis methods (7.5); b. accurate, clear presentation (7.5) | 15 | Ch4 |
| 5 | Statement of Main Findings & Discussion | a. findings based on thesis data (4); b. coherent argument (3); c. major findings presented (4); d. discussion in context of research questions/theory (4) | 15 | Ch5 |
| 6 | Conclusions and Recommendations | a. conclusive statements (2); b. critical discussion of key issues (2); c. contribution to knowledge stated (2); d. limitations addressed (2); e. future research recommendations (2) | 10 | Ch6 |
| 7 | Presentation | formatting, language, citation/referencing, sectioning, table/figure clarity, word-length conformance | 10 | document-wide |

Grade bands (also from the guide): 70–100 A Excellent · 60–69 B Very Good ·
55–59 C Good · 50–54 E Referred (re-assessable, capped at 60 on resubmission)
· below 50 F Fail. Word-length ceiling: 60,000–100,000 words. Font/spacing:
Times New Roman 12pt, 1.5 line spacing (single-spaced for abstract,
quotations, footnotes, references, table/figure captions) — feed these into
the Presentation criterion via the deterministic Stage 1 checks, not an LLM
guess.

### MPhil — source: KNUST HDR Guide 2016, Appendix 4.4 (100 marks total)

Same six-chapter structure as PhD. Note the guide's own qualitative framing:
"a distinct contribution to knowledge is not mandatory" for MPhil, and scope
is "normally less than" a Doctoral programme — this rubric's own weighting
already reflects that (literature review is weighted *higher* than PhD's,
20→25, because for MPhil the literature engagement carries relatively more
of the total mark than original contribution does).

| # | Criterion | Sub-criteria | Marks | Chapter |
|---|---|---|---|---|
| 1 | Statement of Problem & Justification | a. articulate topic & implications (3); b. justification (3); c. research questions/objectives/hypotheses (4) | 10 | Ch1 |
| 2 | Critical Review of Literature & Frameworks | a. scholarly analysis/criticism (5); b. citation (5); c. competence evaluating material (5); d. gaps/differences vs. prior work (5); e. conceptual/theoretical framework (5) | 25 | Ch2 |
| 3 | Research Design and Methodology | a. design/blueprint with justification (6); b. sampling procedures (7); c. data collection/analysis (7) | 20 | Ch3 |
| 4 | Analysis of Data & Presentation of Results | a. appropriate methods (7); b. accurate, clear presentation (5.5) | 12.5 | Ch4 |
| 5 | Statement of Main Findings & Discussion | a. findings based on data (3); b. coherent argument (3); c. major findings (3); d. discussion in context (3.5) | 12.5 | Ch5 |
| 6 | Conclusions and Recommendations | a. conclusive statements (2); b. critical discussion (2); c. contribution stated (2); d. limitations (2); e. future research (2) | 10 | Ch6 |
| 7 | Presentation | formatting, language, citation/referencing, sectioning, clarity, word-length conformance | 10 | document-wide |

Grade bands: same A/B/C/E/F structure as PhD (assume same numeric cutoffs
unless the department specifies otherwise — the guide gives one Appendix 4.1
table shared for HDR). Word-length ceiling: ≤60,000 words. Same font/spacing
rules as PhD.

### MSc (taught Master) — source: derived from a real KNUST supervisor
assessment (MSc Information Technology) plus the guide's qualitative
description of taught-Master expectations ("adequate methodological
knowledge... normally lower [than MPhil]")

The guide confirms taught-Master theses exist and are less demanding than
MPhil, but gives no Appendix-style numeric rubric for them. The supervisor
example you shared earlier used a 5-chapter structure (no separate "General
Discussion" chapter — Results and Discussion combined) and weighted
technical/methodological correctness heavily over originality. This rubric
mirrors that shape, scaled to 100 marks:

| # | Criterion | Sub-criteria | Marks | Chapter |
|---|---|---|---|---|
| 1 | Statement of Problem & Justification | a. problem articulation (4); b. justification (3); c. research questions/objectives (3) | 10 | Ch1 |
| 2 | Literature Review | a. relevant, current coverage (6); b. citation practice (5); c. comparison/gap identification — not just listing (5); d. link to conceptual framework (4) | 20 | Ch2 |
| 3 | Methodology | a. design/approach with justification (7); b. data collection method (7); c. analysis framework (6) | 20 | Ch3 |
| 4 | Analysis of Data & Presentation of Results | a. appropriate methods (7.5); b. clear, accurate presentation (7.5) | 15 | Ch4 (Results & Discussion) |
| 5 | Findings & Discussion | a. findings tied to data (4); b. coherence (3); c. major findings presented (4); d. discussion in context of research questions (4) | 15 | Ch4 (Results & Discussion) |
| 6 | Conclusions and Recommendations | a. conclusive statements (2); b. key issues discussed (2); c. contribution stated (2); d. limitations addressed (2); e. future work (2) | 10 | Ch5 |
| 7 | Presentation | formatting, language, citation/referencing, clarity | 10 | document-wide |

Key expectation differences to encode in the prompt text (not just the mark
split): "distinct contribution to knowledge" is explicitly **not required** —
score criterion 2d and 6c against "identifies where this work sits relative
to existing approaches," not "claims novelty." Evidence-gathering prompts for
this rubric should not ask the model to hunt for a PhD-grade original
contribution; that mismatch is exactly what produced the generic "lacks
theoretical grounding" filler when your test ran a Bank-Churn-Predictor-style
document through what was effectively the PhD rubric.

### BSc (Final Year Project) — source: derived, not HDR-covered by the KNUST
guide at all; structured to match a typical undergraduate CS FYP
documentation (4 chapters: Introduction, Tools & Methodology, The Software
Product, Summary/Conclusion/Recommendation — the same structure used in the
Bank Churn Predictor example)

| # | Criterion | Sub-criteria | Marks | Chapter |
|---|---|---|---|---|
| 1 | Problem Relevance & Objectives | a. problem statement clarity (5); b. objectives/scope alignment (5); c. justification of chosen approach (5) | 15 | Ch1 |
| 2 | Tools & Methodology Justification | a. appropriateness of tools/stack (8); b. justification depth — reasoning, not just description (7) | 15 | Ch2 |
| 3 | Requirements & System Design | a. functional/non-functional requirements completeness (10); b. architecture & database design correctness (10) | 20 | Ch3 |
| 4 | Implementation Evidence | a. working features shown via screenshots/demo evidence (15); b. requirements traceability — implementation matches stated requirements (10) | 25 | Ch3 |
| 5 | Testing & Results | a. presence of test cases or evaluation evidence, e.g. model accuracy if ML-based (10); b. clarity of reported outcomes (5) | 15 | Ch3/Ch4 |
| 6 | Conclusions and Recommendations | does the conclusion follow from evidence actually presented; are recommendations grounded in the project, not generic | 5 | Ch4 |
| 7 | Presentation | formatting, structure, referencing | 5 | document-wide |

No expectation of original theoretical contribution, critical literature
synthesis, or statistical rigor beyond basic test/evaluation evidence — a BSc
FYP evidence-gathering call should never be asking "is there a critical
synthesis of literature," it should be asking "does what's implemented match
what chapter 3 claims is implemented, and is there any test evidence at all."
Criterion 5 exists specifically to catch the gap this project's own
assessment surfaced — a system that never reports whether its own ML model
actually works.

### Why this fixes the genericness, not just the call count

The Stage 3 evidence-gathering prompt for each chapter should be built by
pulling that chapter's row(s) out of the loaded rubric — never by pulling a
generic "critique this chapter like a PhD reviewer" instruction. A BSc run
literally never sees the words "theoretical framework" or "critical
synthesis" in its prompts; an MSc run never sees "original contribution to
knowledge" phrased as a hard requirement. That's what stops the pipeline from
grading an FYP against PhD expectations, which is exactly what happened in
your test run (Grade F on a placeholder document scored against
theoretical-grounding and statistical-rigor criteria that a BSc/MSc project
was never meant to satisfy).

---

## 5. Self-check pass (cheap, catches regressions)

After Stage 5 generates the report, run one more cheap classifier call before
returning it to the user:

```
Does this report contain any of the following problems? Answer JSON only.
1. Two or more chapter critiques that are near-duplicates of each other
   (same structure, same claims, different chapter name only)
2. A numeric score with no visible breakdown by criterion
3. Any formatting compliance claim (font, spacing) with no evidence it was
   actually checked
4. Any bullet point that would be equally true of an unrelated thesis
```

If it flags anything, regenerate that section rather than shipping it. This
catches regressions cheaply without needing a human in the loop every time.

---

## 6. What to hand Opus 5 as the actual task

> Rebuild the DevLab thesis-assessor pipeline as a 6-stage process (structural
> extraction → rubric loading → evidence gathering → computed scoring →
> constrained narrative synthesis → self-check), using Groq for the LLM
> calls. You have full discretion over the existing codebase — inspect what's
> there, keep what's salvageable, and remove/replace whatever is causing the
> current 100+ call count and generic output; the requirements below are the
> spec, not a prescription for how the existing code is organized.
>
> Implement four distinct rubric definitions as data (JSON/DB rows, not
> prompt strings) exactly as specified in Section 4: PhD and MPhil transcribed
> verbatim from the KNUST HDR Guide 2016 (Appendices 4.2/4.4, including the
> exact marks, sub-criteria, and word-length/formatting rules), and MSc/BSc
> as clearly-labeled derived rubrics (`"source": "derived"` in the schema).
> Each rubric criterion must declare which chapter it belongs to (or
> `"document-wide"`), and Stage 3 must batch its evidence-gathering calls by
> chapter — one call per chapter carrying that chapter's applicable criteria,
> never one call per (criterion × chapter) pair. Target ~9–13 total LLM calls
> per assessment regardless of degree level, run Stage 3's chapter calls
> concurrently, and stream Stage 5's narrative output to the client as it
> generates rather than returning it as one block. Compute the final score in
> code from summed criterion scores, never as raw model output. Gate any
> formatting-compliance claims behind whether formatting metadata was
> actually parsed from the source file (font/spacing require docx XML
> inspection, not plain-text extraction). Enforce JSON schema validation with
> retry on every LLM-calling stage. Surface real progress states to the UI
> matching the actual pipeline stages (not a single spinner), and add the
> Section 5 self-check pass before returning a report to the user.