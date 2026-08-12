import React, { useState, useEffect } from "react";
import { Mail, User, Lock, ArrowRight } from "lucide-react";
import { API_URL, GOOGLE_CLIENT_ID } from "../config";
import { apiFetch } from "../api";

// Typings for Google Identity Services SDK on window object
declare global {
  interface Window {
    google?: any;
  }
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  target_language?: string;
}

interface AuthProps {
  onLogin: (user: UserProfile, dashboard?: { logs?: any; chunks?: any }) => void;
}

async function MathSha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Initialize and render Google Sign-In button on component mount
  useEffect(() => {
    const handleCredentialResponse = async (response: any) => {
      setErrorMsg("");
      setIsLoading(true);

      try {
        const res = await apiFetch("/auth/google", {
          method: "POST",
          skipAuthRedirect: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        const resData = await res.json();

        if (res.ok && resData.success) {
          if (resData.token) {
            localStorage.setItem('swaralingo_token', resData.token);
          }
          onLogin(resData.data, resData.dashboard);
        } else {
          setErrorMsg(resData.error || "Google Sign-In failed");
        }
      } catch (err) {
        setErrorMsg("Network error. Failed to connect to server.");
      } finally {
        setIsLoading(false);
      }
    };

    if (window.google) {
      // In local development, we fallback to a dummy Client ID if process.env.GOOGLE_CLIENT_ID isn't set
      const googleClientId = GOOGLE_CLIENT_ID;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
      });

      // Render official Google Sign-In button inside #google-signin-btn-container
      const container = document.getElementById('google-signin-btn-container');
      const containerWidth = (container && container.offsetWidth) ? container.offsetWidth : 372;
      const buttonWidth = Math.max(200, Math.min(400, containerWidth));

      window.google.accounts.id.renderButton(
        container,
        { 
          theme: 'dark', 
          size: 'large', 
          width: buttonWidth, 
          text: isLogin ? 'signin_with' : 'signup_with',
          shape: 'pill'
        }
      );
    }
  }, [onLogin, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    // Validasi panjang password hanya untuk register — login tidak boleh menolak password lama yang valid
    if (!isLogin && password.length < 6) {
      setErrorMsg("Password minimal harus 6 karakter.");
      setIsLoading(false);
      return;
    }

    try {
      // Hash password using SHA-256 before transmission to protect against MitM eavesdropping
      const clientSideHash = await MathSha256(password);

      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin
        ? { email, password: clientSideHash }
        : { email, name, password: clientSideHash };

      const response = await apiFetch(endpoint, {
        method: "POST",
        skipAuthRedirect: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        if (resData.token) {
          localStorage.setItem('swaralingo_token', resData.token);
        }
        onLogin(resData.data, resData.dashboard);
      } else {
        setErrorMsg(resData.error || "Autentikasi gagal. Silakan coba lagi.");
      }
    } catch (err) {
      setErrorMsg("Kesalahan koneksi ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-6 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-white uppercase">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-xs text-[#a1a1aa]">
            {isLogin
              ? "Sign in to access your dashboard"
              : "Join SwaraLingo and start practicing"}
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-[#27272a]/60 space-y-6">
          {errorMsg && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-400 font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Traditional Form login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="flex flex-col space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b]">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#121214] border border-[#27272a] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
                    placeholder="Muhammad Farid"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#121214] border border-[#27272a] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#121214] border border-[#27272a] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#22c55e] hover:bg-[#4ade80] text-black text-sm font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-6"
            >
              {isLoading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
          </form>

          {/* Decorative Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[#27272a]/50"></div>
            <span className="flex-shrink mx-4 text-[10px] text-[#52525b] uppercase font-bold tracking-widest">
              or continue with
            </span>
            <div className="flex-grow border-t border-[#27272a]/50"></div>
          </div>

          {/* Google Sign-In Button Container */}
          <div className="flex justify-center w-full">
            <div id="google-signin-btn-container" className="w-full"></div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => {
                setErrorMsg("");
                setIsLogin(!isLogin);
              }}
              className="text-xs text-[#a1a1aa] hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              {isLogin
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
