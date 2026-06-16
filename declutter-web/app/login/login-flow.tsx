"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Lock, Phone, ShieldCheck, UserRound } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { normalizeNigerianPhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { heroImages } from "@/lib/images";

type Step = "phone" | "otp" | "profile";

export function LoginFlow() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/marketplace";

  const { signIn } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const normalizedPhone = useMemo(() => normalizeNigerianPhone(phone), [phone]);

  function fail(err: unknown) {
    if (err instanceof ApiError) setError(err.message);
    else if (err instanceof Error) setError(err.message);
    else setError("Something went wrong");
  }

  async function submitPhone(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!normalizedPhone) {
        setError("Enter a valid Nigerian phone number.");
        return;
      }
      const res = await api.auth.requestOtp(normalizedPhone);
      setPhone(res.phone);
      setDevOtp(res.devOtp ?? null);
      setStep("otp");
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.verifyOtp(normalizedPhone ?? phone.trim(), otp.trim());
      if (res.needsProfile) {
        setStep("profile");
      } else {
        signIn({ user: res.user, tokens: res.tokens });
        router.push(next);
      }
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  }

  async function submitProfile(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.completeProfile({
        phone: normalizedPhone ?? phone.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role
      });
      signIn({ user: res.user, tokens: res.tokens });
      router.push(role === "seller" ? "/seller" : next);
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1fr_1fr] lg:py-24">
        <section className="relative hidden overflow-hidden rounded-3xl bg-black text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
          <Image
            src={heroImages.loginHero}
            alt="Inside a Lagos home filled with pre-loved finds"
            fill
            sizes="(max-width: 1024px) 0vw, 50vw"
            className="object-cover opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/50 to-black/70" />
          <Link href="/" className="relative text-xl font-black">Declutter</Link>
          <div className="relative">
            <h1 className="text-5xl font-semibold leading-tight">
              Lagos&apos; peer-to-peer marketplace for pre-loved things.
            </h1>
            <p className="mt-6 max-w-md text-sm text-white/80">
              Phone verification gets you in. Buy or list furniture, electronics,
              fashion, and more — with built-in escrow and 24-hour buyer protection.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[heroImages.furniture, heroImages.iphone, heroImages.weekenderBag].map((src, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-2xl ring-1 ring-white/15">
                  <Image src={src} alt="" fill sizes="120px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
          <ul className="relative space-y-3 text-sm text-white/80">
      
            <li className="flex items-center gap-3"><Lock className="h-4 w-4" /> Verified phone numbers only</li>
            <li className="flex items-center gap-3"><UserRound className="h-4 w-4" /> Switch between buyer and seller anytime</li>
          </ul>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <Stepper step={step} />

            {step === "phone" && (
              <form className="mt-8 space-y-5" onSubmit={submitPhone}>
                <h2 className="text-2xl font-semibold text-zinc-950">Sign in to Declutter</h2>
                <p className="text-sm text-zinc-500">Enter your Nigerian phone number to receive a one-time code.</p>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Phone number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      autoFocus
                      inputMode="tel"
                      placeholder="+2348063204042"
                      className="pl-11"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      data-testid="login-phone"
                      name="phone"
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-zinc-900">{error}</p>}
                {phone && normalizedPhone && (
                  <p className="text-xs text-zinc-500">We&apos;ll verify {phone}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading || !normalizedPhone} data-testid="login-phone-submit">
                  {loading ? "Sending..." : "Send code"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}

            {step === "otp" && (
              <form className="mt-8 space-y-5" onSubmit={submitOtp}>
                <h2 className="text-2xl font-semibold text-zinc-950">Enter verification code</h2>
                <p className="text-sm text-zinc-500">
                  We sent a 6-digit code to <span className="font-semibold text-zinc-900">{phone}</span>.
                  {devOtp && (
                    <span className="mt-2 block rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs">
                      Dev mode OTP: <span className="font-mono font-bold">{devOtp}</span>
                    </span>
                  )}
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">6-digit code</label>
                  <Input
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    className="text-center text-lg tracking-[0.6em]"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    data-testid="login-otp"
                    name="otp"
                  />
                </div>
                {error && <p className="text-sm text-zinc-900">{error}</p>}
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setStep("phone")}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading || otp.length !== 6} data-testid="login-otp-submit">
                    {loading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </form>
            )}

            {step === "profile" && (
              <form className="mt-8 space-y-5" onSubmit={submitProfile}>
                <h2 className="text-2xl font-semibold text-zinc-950">Complete your profile</h2>
                <p className="text-sm text-zinc-500">Tell us a little about yourself.</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">First name</label>
                    <Input
                      name="first"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Last name</label>
                    <Input
                      name="last"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Email</label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">I want to…</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["buyer", "seller"] as const).map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setRole(opt)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                          role === opt ? "border-black bg-black text-white" : "border-zinc-200 bg-white text-zinc-700"
                        }`}
                      >
                        {opt === "buyer" ? "Buy items" : "Sell items"}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm text-zinc-900">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading} data-testid="login-profile-submit">
                  {loading ? "Saving..." : "Continue"}
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-xs text-zinc-500">
              By continuing you agree to Declutter&apos;s Terms and Privacy Notice.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: "phone", label: "Phone" },
    { key: "otp", label: "Verify" },
    { key: "profile", label: "Profile" }
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);
  return (
    <ol className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={`grid h-7 w-7 place-items-center rounded-full text-xs ${
              i <= activeIndex ? "bg-black text-white" : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {i + 1}
          </span>
          <span className={i === activeIndex ? "text-zinc-900" : ""}>{s.label}</span>
          {i < steps.length - 1 && <span className="mx-2 h-px w-6 bg-zinc-200" />}
        </li>
      ))}
    </ol>
  );
}
