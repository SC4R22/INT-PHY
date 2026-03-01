"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signup } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"signup" | "login">("signup");

  const [formData, setFormData] = useState({
    fullName: "",
    parentName: "",
    phoneNumber: "",
    parentPhoneNumber: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signup(
        formData.fullName,
        formData.phoneNumber,
        formData.password,
        formData.parentName || undefined,
        formData.parentPhoneNumber || undefined,
      );
      if (result?.error) { setError(result.error); setLoading(false); return; }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Theme toggle top-right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="bg-gradient-to-br from-[#6A0DAD] to-[#8B2CAD] rounded-b-[2rem] p-8 md:p-16 text-center">
        <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter drop-shadow-lg font-payback">
          WELCOME !
        </h1>
      </div>

      <div className="max-w-3xl mx-4 md:mx-auto mt-6 md:mt-8 bg-theme-card rounded-xl overflow-hidden shadow-2xl mb-8">
        <div className="flex border-b-4 border-[#6A0DAD]">
          <button
            suppressHydrationWarning
            onClick={() => setActiveTab("signup")}
            className={`flex-1 py-4 md:py-6 text-xl md:text-2xl font-extrabold transition-all ${
              activeTab === "signup" ? "text-primary bg-theme-card" : "text-theme-secondary bg-theme-primary"
            }`}
          >
            Sign-up
          </button>
          <button
            suppressHydrationWarning
            onClick={() => { setActiveTab("login"); router.push("/login"); }}
            className={`flex-1 py-4 md:py-6 text-xl md:text-2xl font-extrabold transition-all ${
              activeTab === "login" ? "text-primary bg-theme-card" : "text-theme-secondary bg-theme-primary"
            }`}
          >
            Log-in
          </button>
        </div>

        <div className="p-6 md:p-12">
          {error && (
            <div className="bg-red-500 text-white px-4 py-3 rounded-lg mb-6">{error}</div>
          )}

          <form onSubmit={handleSignUp} className="space-y-6">
            {[
              { label: "Name", name: "fullName", type: "text", placeholder: "Enter your name", required: true, maxLength: 100 },
              { label: "Parent Name", name: "parentName", type: "text", placeholder: "Enter parent's name (optional)", required: false, maxLength: 100 },
              { label: "Phone Number", name: "phoneNumber", type: "tel", placeholder: "Enter your phone number", required: true, maxLength: 20 },
              { label: "Parent Phone Number", name: "parentPhoneNumber", type: "tel", placeholder: "Enter parent's phone number (optional)", required: false, maxLength: 20 },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-theme-secondary text-sm font-semibold mb-2">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={(formData as any)[field.name]}
                  onChange={handleInputChange}
                  placeholder={field.placeholder}
                  required={field.required}
                  maxLength={field.maxLength}
                  className="w-full px-4 py-4 bg-[var(--bg-input)] border-4 border-[#6A0DAD] rounded-lg text-theme-primary focus:outline-none focus:border-primary-400 transition-all placeholder:text-theme-muted"
                />
              </div>
            ))}

            <div>
              <label className="block text-theme-secondary text-sm font-semibold mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Create a password (min 8 characters)"
                  required
                  minLength={8}
                  maxLength={72}
                  suppressHydrationWarning
                  className="w-full px-4 py-4 pr-14 bg-[var(--bg-input)] border-4 border-[#6A0DAD] rounded-lg text-theme-primary focus:outline-none focus:border-primary-400 transition-all placeholder:text-theme-muted"
                />
                <button type="button" suppressHydrationWarning onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary transition-colors select-none">
                  <i className={`fi ${showPassword ? 'fi-rr-eye-crossed' : 'fi-rr-eye'} text-xl`} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} suppressHydrationWarning
              className="w-full py-5 bg-primary text-white rounded-lg text-xl font-bold hover:bg-primary-600 transform hover:-translate-y-1 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
