import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, ShieldCheck, Loader2, Phone, Mail, User, Lock,
  CheckCircle2, Wifi, Globe, Headphones, ChevronRight, Eye, EyeOff,
} from "lucide-react";
import { getGetMeQueryKey, useLogin, useRegisterReseller, LoginRequestRole } from "@workspace/api-client-react";
import { loginSchema, resellerSignupSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof resellerSignupSchema>;
type View = "login" | "signup" | "pending";

const features = [
  { icon: Wifi, text: "Managed VoIP & SIP trunking" },
  { icon: Globe, text: "Domain & web hosting resale" },
  { icon: Headphones, text: "Dedicated reseller support" },
  { icon: CheckCircle2, text: "Real-time billing & commissions" },
];

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-red-400 mt-1">{msg}</p> : null;
}

function InputField({
  label, placeholder, type = "text", error, showToggle, ...props
}: {
  label: string; placeholder?: string; type?: string; error?: string;
  showToggle?: boolean; [k: string]: any;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-200">{label}</label>
      <div className="relative">
        <input
          {...props}
          type={isPassword && show ? "text" : type}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4BA3E3]/60 focus:border-[#4BA3E3] transition-all duration-200 text-sm"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<View>(() =>
    new URLSearchParams(search).has("signup") ? "signup" : "login"
  );
  const [loginRole, setLoginRole] = useState<LoginRequestRole>(LoginRequestRole.reseller);

  const loginMutation = useLogin();
  const registerMutation = useRegisterReseller();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", role: LoginRequestRole.reseller },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(resellerSignupSchema),
    defaultValues: { companyName: "", contactName: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  const handleLoginRoleChange = (role: LoginRequestRole) => {
    setLoginRole(role);
    loginForm.setValue("role", role);
    loginForm.clearErrors();
  };

  const onLogin = async (data: LoginForm) => {
    try {
      const result = await loginMutation.mutateAsync({ data });
      if (result.success) {
        // Full page navigation to ensure clean state with new session cookie
        window.location.replace(result.role === "admin" ? "/admin" : "/reseller");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description:
          error?.data?.error ||
          error?.message ||
          "Invalid credentials. Please try again.",
      });
    }
  };

  const onSignup = async (data: SignupForm) => {
    try {
      const { confirmPassword, ...payload } = data;
      await registerMutation.mutateAsync({ data: payload });
      setView("pending");
      signupForm.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error?.data?.error || "Could not complete registration. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* ── Left panel: branding ───────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden">
        <img
          src={`${import.meta.env.BASE_URL}images/auth-bg.jpg`}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1e3d]/90 via-[#0a2952]/80 to-[#4BA3E3]/30" />

        <div className="relative z-10 p-10 flex flex-col h-full">
          <div>
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Black Tie VoIP" className="h-14 w-auto" />
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                Your VoIP Business,<br />
                <span className="text-[#4BA3E3]">Powered by Us.</span>
              </h2>
              <p className="text-slate-300 text-lg mb-10 leading-relaxed">
                Resell South Africa's premium VoIP services with full billing, client management, and support tools — all in one place.
              </p>

              <div className="space-y-4">
                {features.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#4BA3E3]/20 border border-[#4BA3E3]/30 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-[#4BA3E3]" />
                    </div>
                    <span className="text-slate-200 text-sm">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} Black Tie VoIP. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel: auth forms ────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#0d1b2a] p-6 overflow-y-auto min-h-screen">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Black Tie VoIP" className="h-14 w-auto" />
          </div>

          <AnimatePresence mode="wait">

            {/* ── Pending approval screen ── */}
            {view === "pending" && (
              <motion.div
                key="pending"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-full bg-[#4BA3E3]/20 border-2 border-[#4BA3E3]/40 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-[#4BA3E3]" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Registration Submitted!</h2>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  Your reseller application has been received. An admin will review and activate your account shortly. You'll be able to log in once approved.
                </p>
                <button
                  onClick={() => setView("login")}
                  className="w-full py-3 bg-[#4BA3E3] hover:bg-[#3a8fd6] text-white font-semibold rounded-xl transition-all duration-200"
                >
                  Back to Sign In
                </button>
              </motion.div>
            )}

            {/* ── Login / Signup card ── */}
            {view !== "pending" && (
              <motion.div
                key="auth-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-white">
                    {view === "login" ? "Welcome Back" : "Become a Reseller"}
                  </h1>
                  <p className="text-slate-400 mt-1.5 text-sm">
                    {view === "login"
                      ? "Sign in to your portal account"
                      : "Create a reseller account — free to join"}
                  </p>
                </div>

                {/* Tab bar */}
                <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-6">
                  <button
                    onClick={() => setView("login")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200",
                      view === "login"
                        ? "bg-[#4BA3E3] text-white shadow"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Building2 className="w-4 h-4" /> Sign In
                  </button>
                  <button
                    onClick={() => setView("signup")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200",
                      view === "signup"
                        ? "bg-[#4BA3E3] text-white shadow"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <User className="w-4 h-4" /> Sign Up
                  </button>
                </div>

                <AnimatePresence mode="wait">

                  {/* ── Login form ── */}
                  {view === "login" && (
                    <motion.div
                      key="login-form"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Role selector */}
                      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-5">
                        <button
                          onClick={() => handleLoginRoleChange(LoginRequestRole.reseller)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-200",
                            loginRole === LoginRequestRole.reseller
                              ? "bg-white/15 text-white"
                              : "text-slate-500 hover:text-slate-300"
                          )}
                        >
                          <Building2 className="w-3.5 h-3.5" /> Reseller
                        </button>
                        <button
                          onClick={() => handleLoginRoleChange(LoginRequestRole.admin)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-200",
                            loginRole === LoginRequestRole.admin
                              ? "bg-white/15 text-white"
                              : "text-slate-500 hover:text-slate-300"
                          )}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Admin
                        </button>
                      </div>

                      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                        <InputField
                          label="Email Address"
                          type="email"
                          placeholder="name@company.com"
                          error={loginForm.formState.errors.email?.message}
                          {...loginForm.register("email")}
                        />
                        <InputField
                          label="Password"
                          type="password"
                          placeholder="••••••••"
                          error={loginForm.formState.errors.password?.message}
                          {...loginForm.register("password")}
                        />
                        <button
                          type="submit"
                          disabled={loginMutation.isPending}
                          className="w-full mt-2 py-3 bg-[#4BA3E3] hover:bg-[#3a8fd6] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-[#4BA3E3]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          {loginMutation.isPending ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Signing In...</>
                          ) : (
                            <><ChevronRight className="w-4 h-4" /> Sign In to Portal</>
                          )}
                        </button>
                      </form>

                      <p className="text-center text-sm text-slate-500 mt-6">
                        Don't have an account?{" "}
                        <button onClick={() => setView("signup")} className="text-[#4BA3E3] hover:underline font-medium">
                          Apply as a reseller
                        </button>
                      </p>
                      <div className="mt-3 text-center">
                        <a
                          href="https://voipreseller.co.za/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" /> Main Site
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Signup form ── */}
                  {view === "signup" && (
                    <motion.div
                      key="signup-form"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Company Name"
                            placeholder="Acme Telecoms"
                            error={signupForm.formState.errors.companyName?.message}
                            {...signupForm.register("companyName")}
                          />
                          <InputField
                            label="Contact Name"
                            placeholder="Jane Smith"
                            error={signupForm.formState.errors.contactName?.message}
                            {...signupForm.register("contactName")}
                          />
                        </div>
                        <InputField
                          label="Email Address"
                          type="email"
                          placeholder="jane@acmetelesoms.co.za"
                          error={signupForm.formState.errors.email?.message}
                          {...signupForm.register("email")}
                        />
                        <InputField
                          label="Phone Number (optional)"
                          type="tel"
                          placeholder="+27 82 000 0000"
                          error={signupForm.formState.errors.phone?.message}
                          {...signupForm.register("phone")}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            error={signupForm.formState.errors.password?.message}
                            {...signupForm.register("password")}
                          />
                          <InputField
                            label="Confirm Password"
                            type="password"
                            placeholder="••••••••"
                            error={signupForm.formState.errors.confirmPassword?.message}
                            {...signupForm.register("confirmPassword")}
                          />
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                          By registering, your account will be reviewed by an admin before activation.
                        </p>

                        <button
                          type="submit"
                          disabled={registerMutation.isPending}
                          className="w-full py-3 bg-[#4BA3E3] hover:bg-[#3a8fd6] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-[#4BA3E3]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          {registerMutation.isPending ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                          ) : (
                            <><ChevronRight className="w-4 h-4" /> Submit Application</>
                          )}
                        </button>
                      </form>

                      <p className="text-center text-sm text-slate-500 mt-6">
                        Already have an account?{" "}
                        <button onClick={() => setView("login")} className="text-[#4BA3E3] hover:underline font-medium">
                          Sign in
                        </button>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
