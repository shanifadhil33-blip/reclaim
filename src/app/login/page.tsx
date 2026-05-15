"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

function AuthContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
  const [showPassword, setShowPassword] = useState(false);

  // OTP verification step (sign-up only)
  const [step, setStep] = useState<"credentials" | "otp" | "forgot_password">("credentials");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const router = useRouter();
  const supabase = createClient();

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const timer = setTimeout(() => setOtpResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpResendCooldown]);

  // Auto-focus the first OTP input when we enter OTP step
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);
    // Focus the last filled input or the next empty one
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Supabase returns a fake success with an empty identities array for existing users
        // to prevent email enumeration. We catch that here and flip them to the Login page.
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          setIsSignUp(false);
          setError("This email is already registered. Please log in.");
          return;
        }

        // Move to OTP verification step
        setStep("otp");
        setOtpResendCooldown(60);
      } else {
        // Login: instant, no OTP
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      if (isSignUp) {
        // If they get any signup error (like User already registered, rate limit, unable to send email)
        // just flip them to the login page because 99% of the time they just need to log in.
        setIsSignUp(false);
        setError("Account may already exist or email limit reached. Please try logging in.");
      } else {
        if (err.message.includes("Invalid login credentials")) {
          setError("Wrong password or email.");
        } else {
          setError(err.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otpDigits.join("");
    if (token.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });
      if (error) throw error;

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpResendCooldown > 0) return;
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      setOtpResendCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard/settings`,
      });
      if (error) throw error;
      toast.success("Password reset link sent! Check your email.");
      setStep("credentials");
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
      setLoading(false);
    }
  };

  // ── OTP Verification Screen ──
  if (step === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4 font-sans relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

        <Card className="w-full max-w-md shadow-2xl border-white/10 bg-white/5 backdrop-blur-xl text-white relative z-10">
          <form onSubmit={handleVerifyOtp}>
            <CardHeader className="space-y-3 text-center mb-2 mt-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-extrabold tracking-tight">Check Your Email</CardTitle>
              <CardDescription className="font-medium text-neutral-400">
                We sent a 6-digit verification code to<br />
                <span className="text-indigo-400 font-semibold">{email}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-md text-sm font-medium">
                  {error}
                </div>
              )}

              {/* OTP Input Grid */}
              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-lg bg-neutral-900/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
                  />
                ))}
              </div>

              <p className="text-xs text-neutral-500 text-center">
                Enter the code from your inbox. Check spam if you don't see it.
              </p>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-4 mb-2">
              <Button
                type="submit"
                className="w-full h-12 text-md transition-all hover:scale-[1.02] active:scale-[0.98] bg-white text-black hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                disabled={loading || otpDigits.join("").length !== 6}
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>

              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-black font-medium">Didn't receive it?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpResendCooldown > 0 || loading}
                  className="text-black hover:text-neutral-700 font-bold underline underline-offset-2 transition-colors disabled:text-black/60 disabled:cursor-not-allowed disabled:no-underline"
                >
                  {otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : "Resend Code"}
                </button>
              </div>

              <button
                type="button"
                className="text-sm text-black hover:text-neutral-700 transition-colors font-semibold"
                onClick={() => {
                  setStep("credentials");
                  setOtpDigits(["", "", "", "", "", ""]);
                  setError(null);
                }}
              >
                ← Back to sign up
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // ── Forgot Password Screen ──
  if (step === "forgot_password") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4 font-sans relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

        <Card className="w-full max-w-md shadow-2xl border-white/10 bg-white/5 backdrop-blur-xl text-white relative z-10">
          <form onSubmit={handleResetPassword}>
            <CardHeader className="space-y-3 text-center mb-2 mt-4">
              <CardTitle className="text-2xl font-extrabold tracking-tight">Reset Password</CardTitle>
              <CardDescription className="font-medium text-neutral-400">
                Enter your email and we'll send you a secure link to reset your password.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {error && (
                <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-md text-sm font-medium">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-neutral-300">Email Address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-neutral-900/50 border-white/10 text-white placeholder:text-neutral-600 focus-visible:ring-indigo-500"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-4 mb-2">
              <Button
                type="submit"
                className="w-full h-12 text-md transition-all hover:scale-[1.02] active:scale-[0.98] bg-white text-black hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                disabled={loading}
              >
                {loading ? "Sending Link..." : "Send Reset Link"}
              </Button>
              <button
                type="button"
                className="text-sm text-black hover:text-neutral-700 transition-colors font-semibold mt-2"
                onClick={() => {
                  setStep("credentials");
                  setError(null);
                }}
              >
                ← Back to Login
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // ── Credentials Screen (Sign Up / Login) ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4 font-sans relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      <Card className="w-full max-w-md shadow-2xl border-white/10 bg-white/5 backdrop-blur-xl text-white relative z-10">
        <form onSubmit={handleAuth}>
          <CardHeader className="space-y-3 text-center mb-2 mt-4">
            <CardTitle className="text-4xl font-extrabold tracking-tighter">Reclaim</CardTitle>
            <CardDescription className="font-medium text-neutral-400">
              {isSignUp ? "Create your account and start generating appeals." : "Log in to your Reclaim account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pb-8">
            {error && (
              <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-md text-sm font-medium">
                {error}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-12 text-md bg-white text-black hover:bg-neutral-200 border-none shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all flex items-center justify-center gap-2 font-semibold"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <div className="relative w-full py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1a1a1a] px-2 text-neutral-400">Or continue with email</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete={isSignUp ? "off" : "email"}
                className="bg-neutral-900/50 border-white/10 text-white placeholder:text-neutral-600 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-neutral-300">
                  {isSignUp ? "Create a new password " : "Type in your reclaim password "}
                  {isSignUp && <span className="text-xs font-normal text-white">(save it safely!)</span>}
                </Label>
                {!isSignUp && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setStep("forgot_password");
                      setError(null);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="bg-neutral-900/50 border-white/10 text-white focus-visible:ring-indigo-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-4 mb-2">
            <Button type="submit" className="w-full h-12 text-md transition-all hover:scale-[1.02] active:scale-[0.98] bg-indigo-600 text-white hover:bg-indigo-700 border-none shadow-[0_0_20px_rgba(99,102,241,0.2)]" disabled={loading}>
              {loading ? "Processing..." : isSignUp ? "Sign Up with Email" : "Log In with Email"}
            </Button>

            <button
              type="button"
              className="text-sm text-black hover:text-neutral-800 transition-colors font-medium mt-4"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setEmail("");
                setPassword("");
              }}
            >
              {isSignUp ? "Already have an account? Log in" : "Don't have an account? Sign up"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500">Loading...</div>}>
      <AuthContent />
    </Suspense>
  );
}
