# Plan: Make cmptr.co More Attractive to Target Studios

**Audience:** Recruiters and hiring managers at DreamWorks, Pixar, Disney Animation, Sony Imageworks, DNEG, Framestore, Epic, SideFX, and similar (Lighting & Look Dev Tools, Pipeline Engineer, Technical Artist roles).

**Goal:** In under 60 seconds, a visitor should think: “This person builds the kind of tools we hire for, has done it at real studios, and is open to the roles we have.”

---

## 1. First 5 Seconds — Hero & “Open to”

**Current:** Hero says “Technical Artist” and “Building Houdini tools, shaders, and pipeline automation…”  
**Gap:** They don’t immediately know you’re *actively looking* or for *which roles*.

**Changes:**
- Add a short, scannable line under the subtitle, e.g.  
  **“Open to: Lighting & Look Dev Tools · Pipeline Engineer · Technical Artist (Tools)”**
- Keep it to one line so it doesn’t clutter the hero.
- Option: same line in the nav as a small “Hiring?” or “Open to work” badge that links to #contact or #resume.

**Why it works:** Recruiters scan for “are they looking?” and “for what?”. Stating it in the hero removes guesswork.

---

## 2. Proof of Work — Add a “Tools & Projects” Section

**Current:** Resume says you built Houdini/Unreal tools at Blur and pipeline automation at PPC, but there’s no dedicated section that *shows* what you built. Tools-heavy roles want to see concrete examples.

**Changes:**
- Add a compact **“Tools & Projects”** (or “Selected Work”) section between About and Reel.
- **3–4 project cards**, each with:
  - **Title** (e.g. “Houdini & Unreal pipeline tools”, “Blender shader add-on”, “Media pipeline automation”)
  - **Context** (studio or “Personal”)
  - **One sentence** on what it does / what problem it solved
  - **Optional:** link (GitHub, Gumroad, short video) or “Details on request”
- Suggested cards (tweak to what you have):
  1. **Houdini & Unreal tools** — Blur Studio — Pipeline and real-time tooling for artists.
  2. **Pipeline & media automation** — PPC — Python tools and APIs for asset validation and delivery.
  3. **Blender shader add-on** — Personal — Procedural toon and behavioral shader tools (you have the scripts in-repo).
  4. **Real-time viz & pipeline support** — The Third Floor — Workflow tooling and previs pipelines.

**Why it works:** Studios want to see “what have you built?” before they read the resume. A small, clear projects block answers that in one scroll.

---

## 3. Reel — Align Copy With Tools / Technical Art

**Current:** Main reel is titled “Demo Reel” with “Compilation of editorial and motion graphics work.”  
**Gap:** For Lighting & Look Dev Tools and Pipeline roles, “editorial and motion graphics” can sound like a different discipline.

**Changes:**
- Keep the same video; only change the **text**:
  - **Title:** e.g. “Reel — Technical art & pipeline-driven work” or “Demo Reel”.
  - **Description:** e.g. “Technical art, FX, lighting, and pipeline-driven work from studio and personal projects.”
- If any reel shots are from Blur or PPC, say so in the caption (e.g. “Includes work from Blur Studio”).

**Why it works:** Copy that matches “technical art” and “pipeline” helps recruiters mentally file you under the right role type.

---

## 4. Contact — Stronger CTA + Resume Download

**Current:** “Open to freelance, consulting, and full-time opportunities in technical art and creative development” + email + LinkedIn.  
**Gap:** No one-click way to get a resume PDF; some recruiters expect it.

**Changes:**
- Add a **“Download resume (PDF)”** button or link next to (or above) the email/LinkedIn links.  
  - If you don’t have a PDF yet: create one (export from Google Docs/Word or build a simple one-pager) and add it to the repo as e.g. `MarkGross_Resume.pdf`, then link it.
- Optionally tighten the opening line to:  
  “Open to **full-time** Lighting & Look Dev Tools, Pipeline Engineer, and Technical Artist roles — plus freelance and consulting.”
- Keep email and LinkedIn prominent.

**Why it works:** Recruiters often want to attach a PDF to your profile in their ATS; a direct download reduces friction.

---

## 5. Trust Signals — Studio Names Up Front (Optional)

**Current:** Blur and PPC appear in the Resume section; hero and about don’t name studios.

**Changes (optional):**
- In the **About** paragraph, add one line: e.g.  
  “I’ve built tools and pipelines at **Blur Studio** and **The Picture Production Company**, and supported previs pipelines at **The Third Floor**.”
- Or a small “Experience includes: Blur Studio · PPC · The Third Floor” text line under the hero or above the skills grid.

**Why it works:** Names like Blur and PPC are instant credibility for feature animation and VFX recruiters.

---

## 6. Intro Experience — Recruiter-Friendly

**Current:** Three.js “Click to Enter” intro; “Skip Intro” is available.  
**Gap:** On slow networks or strict corporate devices, the intro can feel slow. Some visitors will leave if they can’t get to content fast.

**Changes:**
- Ensure **“Skip Intro”** is very visible (contrast, size) and works on first tap/click.
- Consider making “Skip Intro” the default on **mobile** (e.g. show main content after a short delay or on first touch) so recruiters on phones get to the content quickly.
- No need to remove the intro; just optimize for “I need to see the resume in 10 seconds” users.

**Why it works:** Recruiters often have limited time; reducing friction to the main content keeps you in the running.

---

## 7. SEO / Shareability (Quick Wins)

**Current:** Meta title and description already say “Technical Artist” and “Houdini tools, shaders, lighting & look dev tools.”  
**Optional:**
- In the meta description, you could append: “Open to Lighting & Look Dev Tools and Pipeline Engineer roles.”  
  (Keeps it under ~160 characters so it doesn’t get cut off in search/social.)
- When you share cmptr.co on LinkedIn, write a one-line post that includes “Open to Lighting & Look Dev Tools and Pipeline Engineer roles at feature animation and VFX studios” so the link preview + your text tell the same story.

**Why it works:** When someone Googles you or sees your link on LinkedIn, the snippet reinforces that you’re a tools/pipeline candidate.

---

## Summary: Priority Order

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Add “Tools & Projects” section (3–4 cards) | Medium | High — direct proof of what you build |
| 2 | Add “Download resume (PDF)” + ensure PDF exists | Low | High — recruiters expect it |
| 3 | Hero or About: “Open to: Lighting & Look Dev Tools · Pipeline Engineer · …” | Low | High — instant clarity for recruiters |
| 4 | Reel copy: reframe as technical art / pipeline-driven work | Low | Medium |
| 5 | About: one sentence naming Blur, PPC, Third Floor | Low | Medium |
| 6 | Intro: ensure Skip Intro is obvious; consider mobile default | Low | Medium |
| 7 | Meta description: add “Open to … roles” | Low | Low (nice to have) |

---

## What to Leave As-Is

- **Nav:** About, Reel, Resume, Contact is clear; no need to add more items unless you add “Projects” as a nav link when you add the section.
- **Skills grid:** Already strong (Lighting & Look Dev, Tool Development, Computer Graphics, Pipeline). No change needed.
- **Resume section:** Job titles and bullets are already tool- and pipeline-focused. No structural change needed.
- **Overall look:** No need to redesign; these changes are content and one new section.

---

## Files to Touch (When You Implement)

- **index.html** — Hero line, About line, new “Tools & Projects” section, reel captions, Contact CTA + resume link, optional meta tweak.
- **styles.css** — Styles for the new project cards and any new buttons (e.g. Download Resume).
- **Add file:** `MarkGross_Resume.pdf` (or similar) in the project root and link from Contact.

You can implement in the order of the priority table above; 1–3 alone will already make the site much more attractive to the companies on your job target list.
