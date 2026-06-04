"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Check,
  Minus,
  Zap,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  Star,
  Shield,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── types ─── */
type Currency = "USD" | "ETB";
type Billing = "monthly" | "annual";

/* ─── exchange rate & formatting ─── */
const ETB_RATE = 57; // 1 USD ≈ 57 ETB
const ANNUAL_DISCOUNT = 0.2; // 20% off

function formatPrice(usd: number, currency: Currency, billing: Billing): string {
  const discounted = billing === "annual" ? usd * (1 - ANNUAL_DISCOUNT) : usd;
  if (currency === "USD") {
    return discounted === 0 ? "Free" : `$${discounted % 1 === 0 ? discounted : discounted.toFixed(0)}`;
  }
  const etb = discounted * ETB_RATE;
  return etb === 0 ? "Free" : `ETB ${etb % 1 === 0 ? etb.toLocaleString() : Math.round(etb).toLocaleString()}`;
}

function formatPeriod(usd: number, billing: Billing): string {
  if (usd === 0) return "";
  return billing === "annual" ? "/ mo, billed annually" : "/ month";
}

/* ─── plan data ─── */
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    icon: <Zap size={18} />,
    description: "Perfect for individuals and small side projects.",
    usdMonthly: 0,
    cta: "Get started free",
    ctaVariant: "outline" as const,
    highlight: false,
    badge: null,
    features: [
      { text: "3 active boards", included: true },
      { text: "Up to 5 collaborators", included: true },
      { text: "Basic shapes & sticky notes", included: true },
      { text: "7-day version history", included: true },
      { text: "Community support", included: true },
      { text: "Custom templates", included: false },
      { text: "Advanced export (PDF, PNG)", included: false },
      { text: "Priority support", included: false },
      { text: "SSO / SAML", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: <Star size={18} />,
    description: "For power users who need unlimited space and tools.",
    usdMonthly: 12,
    cta: "Start Pro trial",
    ctaVariant: "default" as const,
    highlight: true,
    badge: "Most popular",
    features: [
      { text: "Unlimited boards", included: true },
      { text: "Up to 15 collaborators", included: true },
      { text: "All shapes, templates & tools", included: true },
      { text: "60-day version history", included: true },
      { text: "Priority email support", included: true },
      { text: "Custom templates", included: true },
      { text: "Advanced export (PDF, PNG)", included: true },
      { text: "Priority support", included: false },
      { text: "SSO / SAML", included: false },
    ],
  },
  {
    id: "team",
    name: "Team",
    icon: <Building2 size={18} />,
    description: "For growing teams that need admin controls and scale.",
    usdMonthly: 30,
    cta: "Start Team trial",
    ctaVariant: "outline" as const,
    highlight: false,
    badge: null,
    features: [
      { text: "Unlimited boards", included: true },
      { text: "Unlimited collaborators", included: true },
      { text: "All shapes, templates & tools", included: true },
      { text: "Unlimited version history", included: true },
      { text: "Dedicated support & SLA", included: true },
      { text: "Custom templates", included: true },
      { text: "Advanced export (PDF, PNG)", included: true },
      { text: "Priority support", included: true },
      { text: "SSO / SAML", included: true },
    ],
  },
];

/* ─── FAQ data ─── */
const FAQS = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes. You can upgrade or downgrade your plan at any time from your account settings. Upgrades take effect immediately; downgrades apply at the end of your billing cycle.",
  },
  {
    q: "What happens to my boards if I downgrade?",
    a: "Your boards are never deleted. If you exceed the plan limit (e.g. more than 3 boards on Starter) you won't be able to create new boards until you're within limits, but all existing content stays intact.",
  },
  {
    q: "Do you support team invoicing in ETB?",
    a: "Yes. For Ethiopian-based businesses we issue invoices in ETB and support local bank transfers and Telebirr payments. Contact us at billing@drawspace.io for an enterprise quote.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "Every paid plan comes with a 14-day free trial — no credit card required. You'll be reminded before the trial ends.",
  },
  {
    q: "How does the annual discount work?",
    a: "Choosing annual billing gives you 2 months free (20% off). You're charged once per year as a single payment.",
  },
  {
    q: "Can I add payment methods later?",
    a: "Absolutely. Stripe (cards), Telebirr, and bank transfer options will be available at checkout. More local payment methods are coming soon.",
  },
];

/* ─── animated number ─── */
function AnimatedPrice({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={className}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

/* ─── FAQ accordion item ─── */
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="border-b border-border/50 last:border-0"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
      >
        <span>{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-4 shrink-0 text-muted-foreground"
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── currency toggle ─── */
function CurrencyToggle({
  currency,
  onChange,
}: {
  currency: Currency;
  onChange: (c: Currency) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 text-xs font-semibold">
      {(["USD", "ETB"] as Currency[]).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn(
            "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all",
            currency === c
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {currency === c && (
            <motion.span
              layoutId="currency-pill"
              className="absolute inset-0 rounded-lg bg-background shadow-sm"
              style={{ zIndex: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{c === "USD" ? "🇺🇸" : "🇪🇹"}</span>
          <span className="relative z-10">{c}</span>
        </button>
      ))}
    </div>
  );
}

/* ─── billing toggle ─── */
function BillingToggle({
  billing,
  onChange,
}: {
  billing: Billing;
  onChange: (b: Billing) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 text-xs font-semibold">
      {(["monthly", "annual"] as Billing[]).map((b) => (
        <button
          key={b}
          onClick={() => onChange(b)}
          className={cn(
            "relative flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all",
            billing === b
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {billing === b && (
            <motion.span
              layoutId="billing-pill"
              className="absolute inset-0 rounded-lg bg-background shadow-sm"
              style={{ zIndex: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 capitalize">{b}</span>
          {b === "annual" && (
            <span
              className={cn(
                "relative z-10 rounded-full px-1.5 py-0.5 text-[9px] font-bold transition-colors",
                billing === "annual"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              −20%
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── page ─── */
export default function PricingPage() {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* ── header ── */}
        <section className="relative overflow-hidden px-4 pt-24 pb-16 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-start justify-center"
          >
            <div className="h-[400px] w-[700px] rounded-full bg-violet-600/8 blur-[120px] dark:bg-violet-600/12" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-500">
              Pricing
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
              Start free and scale as your team grows. No hidden fees, no surprises.
            </p>

            {/* toggles */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <BillingToggle billing={billing} onChange={setBilling} />
              <div className="h-5 w-px bg-border hidden sm:block" />
              <CurrencyToggle currency={currency} onChange={setCurrency} />
            </motion.div>

            {billing === "annual" && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium"
              >
                🎉 You save 2 months free with annual billing
              </motion.p>
            )}
          </motion.div>
        </section>

        {/* ── pricing cards ── */}
        <section className="px-4 pb-24">
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: "easeOut" }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6 shadow-sm",
                  plan.highlight
                    ? "border-violet-500/60 bg-violet-600/5 shadow-violet-500/10 shadow-lg ring-1 ring-violet-500/20 dark:bg-violet-500/5"
                    : "border-border/60 bg-card"
                )}
              >
                {/* popular badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-[10px] font-bold text-white shadow-md shadow-violet-600/30">
                      <Star size={9} />
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* plan header */}
                <div className="mb-4">
                  <div
                    className={cn(
                      "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl",
                      plan.highlight
                        ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {plan.icon}
                  </div>
                  <h2 className="text-base font-bold">{plan.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                {/* price */}
                <div className="mb-6 border-b border-border/40 pb-6">
                  <div className="flex items-end gap-1.5">
                    <AnimatedPrice
                      value={formatPrice(plan.usdMonthly, currency, billing)}
                      className="text-3xl font-extrabold tracking-tight"
                    />
                    {plan.usdMonthly > 0 && (
                      <AnimatedPrice
                        value={currency === "USD" ? "USD" : "ETB"}
                        className="mb-0.5 text-xs font-medium text-muted-foreground"
                      />
                    )}
                  </div>
                  {plan.usdMonthly > 0 && (
                    <AnimatedPrice
                      value={formatPeriod(plan.usdMonthly, billing)}
                      className="mt-0.5 text-xs text-muted-foreground"
                    />
                  )}
                  {plan.usdMonthly === 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">forever</p>
                  )}

                  {/* annual savings callout */}
                  {plan.usdMonthly > 0 && billing === "annual" && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                    >
                      Save{" "}
                      {currency === "USD"
                        ? `$${Math.round(plan.usdMonthly * ANNUAL_DISCOUNT * 12)}/yr`
                        : `ETB ${Math.round(plan.usdMonthly * ANNUAL_DISCOUNT * 12 * ETB_RATE).toLocaleString()}/yr`}
                    </motion.p>
                  )}
                </div>

                {/* CTA */}
                <Button
                  variant={plan.highlight ? "default" : plan.ctaVariant}
                  size="lg"
                  className={cn(
                    "mb-6 w-full gap-2",
                    plan.highlight &&
                      "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/25"
                  )}
                  data-plan={plan.id}
                >
                  {plan.cta}
                  <ArrowRight size={14} />
                </Button>

                {/* features */}
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f.text}
                      className={cn(
                        "flex items-start gap-2.5 text-xs",
                        f.included ? "text-foreground" : "text-muted-foreground/50"
                      )}
                    >
                      {f.included ? (
                        <Check
                          size={13}
                          className={cn(
                            "mt-0.5 shrink-0",
                            plan.highlight ? "text-violet-500" : "text-emerald-500"
                          )}
                        />
                      ) : (
                        <Minus size={13} className="mt-0.5 shrink-0" />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── enterprise strip ── */}
        <section className="border-t border-border/40 px-4 py-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-2xl border border-border/60 bg-card px-8 py-10 text-center shadow-sm md:flex-row md:text-left"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Shield size={22} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold">Need a custom enterprise plan?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Custom seats, dedicated infrastructure, SLA guarantees, and local billing in ETB.
                Let's talk.
              </p>
            </div>
            <Button variant="outline" size="lg" className="shrink-0 gap-2">
              Contact sales
              <ArrowRight size={14} />
            </Button>
          </motion.div>
        </section>

        {/* ── FAQ ── */}
        <section className="px-4 py-20">
          <div className="mx-auto max-w-2xl">
            <div className="mb-10 text-center">
              <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <HelpCircle size={13} />
                FAQ
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Frequently asked questions
              </h2>
            </div>
            <div>
              {FAQS.map((faq, i) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── footer ── */}
      <footer className="border-t border-border/40 px-4 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DrawSpace. Prices shown are exclusive of applicable taxes.
      </footer>
    </div>
  );
}
