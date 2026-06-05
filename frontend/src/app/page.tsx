"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Play,
  Zap,
  Users,
  Layers,
  Wand2,
  MousePointer2,
  StickyNote,
  Shapes,
} from "lucide-react";

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      id={id}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── canvas preview mockup ─── */
const STICKY_NOTES = [
  { id: 1, text: "Design review notes 📝", color: "bg-yellow-300 dark:bg-yellow-400", x: "8%", y: "12%" },
  { id: 2, text: "Sprint goals Q3", color: "bg-purple-200 dark:bg-purple-300", x: "34%", y: "32%" },
  { id: 3, text: "User flow ideas", color: "bg-green-200 dark:bg-green-300", x: "10%", y: "56%" },
];

const CURSORS = [
  { name: "Alex", color: "bg-violet-500", x: "62%", y: "46%" },
  { name: "Jamie", color: "bg-pink-500", x: "42%", y: "72%" },
];

/* ─── features ─── */
const FEATURES = [
  {
    icon: <Zap size={20} />,
    title: "Real-time sync",
    description: "Every stroke, shape, and note syncs instantly across all collaborators with sub-50ms latency.",
  },
  {
    icon: <Users size={20} />,
    title: "Live cursors",
    description: "See exactly where teammates are and what they're working on with named live cursors.",
  },
  {
    icon: <Layers size={20} />,
    title: "Infinite canvas",
    description: "No more running out of space. Pan, zoom, and organize freely across an unbounded canvas.",
  },
  {
    icon: <Wand2 size={20} />,
    title: "Smart templates",
    description: "Jump-start your session with curated templates for retrospectives, roadmaps, wireframes, and more.",
  },
  {
    icon: <MousePointer2 size={20} />,
    title: "Multiplayer editing",
    description: "Multiple people can draw, type, and move objects simultaneously without conflicts.",
  },
  {
    icon: <StickyNote size={20} />,
    title: "Rich sticky notes",
    description: "Add styled notes with markdown, reactions, and assignees — all within the canvas.",
  },
];

const AVATARS = [
  { initials: "AK", color: "bg-violet-500" },
  { initials: "JM", color: "bg-emerald-500" },
  { initials: "RL", color: "bg-orange-500" },
  { initials: "TN", color: "bg-sky-500" },
];

export default function Home() {
  const { isSignedIn } = useAuth();
  const ctaHref = isSignedIn ? "/dashboard" : "/sign-up";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* ── HERO ── */}
      <main className="flex-1">
        <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16 text-center md:pt-32 md:pb-24">
          {/* background radial glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-start justify-center"
          >
            <div className="h-[500px] w-[800px] rounded-full bg-violet-600/10 blur-[120px] dark:bg-violet-600/15" />
          </div>

          {/* Badge */}
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="show"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            Real-time collaboration
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="show"
            className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Brainstorm together,{" "}
            <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
              in real time
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="show"
            className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
          >
            A collaborative infinite canvas where your team draws, plans, and
            creates — all at once, from anywhere.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="show"
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Button size="lg" asChild className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/25">
              <Link href={ctaHref}>
                <Shapes size={16} />
                {isSignedIn ? "Go to dashboard" : "Start for free"}
                <ArrowRight size={14} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <Play size={14} className="fill-current" />
              Watch demo
            </Button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            variants={fadeUp}
            custom={4}
            initial="hidden"
            animate="show"
            className="mt-8 flex items-center gap-3"
          >
            <div className="flex -space-x-2">
              {AVATARS.map((a) => (
                <div
                  key={a.initials}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-background ${a.color}`}
                >
                  {a.initials}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">4,200+</span>{" "}
              teams already collaborating
            </p>
          </motion.div>
        </section>

        {/* ── CANVAS PREVIEW ── */}
        <Section className="px-4 pb-24">
          <motion.div
            variants={fadeUp}
            custom={0}
            className="mx-auto max-w-5xl"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-zinc-950 shadow-2xl shadow-black/40 dark:shadow-black/60">
              {/* toolbar strip */}
              <div className="flex items-center gap-1.5 border-b border-white/5 bg-zinc-900/80 px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-red-500/70" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <span className="h-3 w-3 rounded-full bg-green-500/70" />
                <div className="ml-4 flex gap-1">
                  {[MousePointer2, StickyNote, Shapes].map((Icon, i) => (
                    <div
                      key={i}
                      className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:text-zinc-300"
                    >
                      <Icon size={13} />
                    </div>
                  ))}
                </div>
              </div>

              {/* canvas area */}
              <div
                className="relative h-[340px] md:h-[420px]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              >
                {/* Sticky notes */}
                {STICKY_NOTES.map((note, i) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
                    style={{ left: note.x, top: note.y }}
                    className={`absolute w-36 rounded-md px-3 py-2.5 text-[11px] font-medium text-zinc-900 shadow-md ${note.color}`}
                  >
                    {note.text}
                  </motion.div>
                ))}

                {/* SVG arrow */}
                <svg
                  className="absolute inset-0 h-full w-full pointer-events-none"
                  viewBox="0 0 800 420"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <motion.path
                    d="M 310 120 C 380 140, 420 200, 490 240"
                    stroke="#7c3aed"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.8 }}
                  />
                  <motion.path
                    d="M 200 320 C 260 290, 310 310, 380 360"
                    stroke="#ec4899"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: 1.1, duration: 0.8 }}
                  />
                </svg>

                {/* Rectangle shape */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="absolute rounded border-2 border-violet-500/60"
                  style={{ left: "65%", top: "18%", width: 100, height: 56 }}
                />

                {/* Circle shape */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, type: "spring" }}
                  className="absolute rounded-full border-2 border-teal-400/60"
                  style={{ left: "80%", top: "58%", width: 56, height: 56 }}
                />

                {/* Live cursors */}
                {CURSORS.map((cursor, i) => (
                  <motion.div
                    key={cursor.name}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2 + i * 0.15, type: "spring" }}
                    style={{ left: cursor.x, top: cursor.y }}
                    className="absolute flex flex-col items-start gap-1"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M2 2l10 4.5-5 1.5-2 5z"
                        fill={cursor.color.replace("bg-", "").includes("violet") ? "#7c3aed" : "#ec4899"}
                        stroke="white"
                        strokeWidth="0.8"
                      />
                    </svg>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-semibold text-white ${cursor.color}`}
                    >
                      {cursor.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </Section>

        {/* ── FEATURES ── */}
        <Section
          id="features"
          className="px-4 py-24 border-t border-border/40"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <motion.p
                variants={fadeUp}
                custom={0}
                className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-500"
              >
                Features
              </motion.p>
              <motion.h2
                variants={fadeUp}
                custom={1}
                className="text-3xl font-bold tracking-tight md:text-4xl"
              >
                Everything your team needs
              </motion.h2>
              <motion.p
                variants={fadeUp}
                custom={2}
                className="mt-4 text-muted-foreground"
              >
                Purpose-built for creative and technical teams who need more than a whiteboard.
              </motion.p>
            </div>

            <motion.div
              variants={stagger}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    {f.icon}
                  </div>
                  <h3 className="mb-1.5 font-semibold text-sm">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Section>

        {/* ── CTA BANNER ── */}
        <Section className="px-4 py-24">
          <motion.div
            variants={fadeUp}
            custom={0}
            className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 via-purple-600/5 to-indigo-600/10 p-10 text-center shadow-xl"
          >
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold tracking-tight md:text-4xl">
              Ready to draw together?
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground">
              Start your free workspace — no credit card required.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/25">
                <Link href={ctaHref}>
                  {isSignedIn ? "Open dashboard" : "Start for free"}
                  <ArrowRight size={14} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/pricing">See pricing</a>
              </Button>
            </motion.div>
          </motion.div>
        </Section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/40 px-4 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DrawSpace. Built with Next.js &amp; Clerk.
      </footer>
    </div>
  );
}
