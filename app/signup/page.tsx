"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signup } from "@/app/actions/auth";

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
      // Use the server action — has proper validation, sanitization, and
      // hardcodes role: "student" server-side so it cannot be tampered with
      const result = await signup(
        formData.fullName,
        formData.phoneNumber,
        formData.password,
        formData.parentName || undefined,
        formData.parentPhoneNumber || undefined,
      );

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      // Server action handles redirect — nothing to do here
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="bg-gradient-to-br from-[#6A0DAD] to-[#8B2CAD] rounded-b-[2rem] p-8 md:p-16 text-center">
        <h1 className="text-5xl md:text-7xl font-black text-[#E8E8E8] uppercase italic tracking-tighter drop-shadow-lg font-payback">
          WELCOME !
        </h1>
      </div>

      <div className="max-w-3xl mx-4 md:mx-auto mt-6 md:mt-8 bg-[#2A2A2A] rounded-xl overflow-hidden shadow-2xl mb-8">
        <div className="flex border-b-4 border-[#6A0DAD]">
          <button
            suppressHydrationWarning
            onClick={() => setActiveTab("signup")}
            className={`flex-1 py-4 md:py-6 text-xl md:text-2xl font-extrabold transition-all ${
              activeTab === "signup" ? "text-[#6A0DAD] bg-[#2A2A2A]" : "text-[#EFEFEF] bg-[#1a1a1a]"
            }`}
          >
            Sign-up
          </button>
          <button
            suppressHydrationWarning
            onClick={() => { setActiveTab("login"); router.push("/login"); }}
            className={`flex-1 py-4 md:py-6 text-xl md:text-2xl font-extrabold transition-all ${
              activeTab === "login" ? "text-[#6A0DAD] bg-[#2A2A2A]" : "text-[#EFEFEF] bg-[#1a1a1a]"
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
            <div>
              <label className="block text-[#B3B3B3] text-sm font-semibold mb-2">Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange}
                placeholder="Enter your name" required maxLength={100}
                className="w-full px-4 py-4 bg-[#3A3A3A] border-4 border-[#6A0DAD] rounded-lg text-[#EFEFEF] focus:outline-none focus:border-[#8B2CAD] transition-all placeholder:text-gray-500" />
            </div>
            <div>
              <label className="block text-[#B3B3B3] text-sm font-semibold mb-2">Parent Name</label>
              <input type="text" name="parentName" value={formData.parentName} onChange={handleInputChange}
                placeholder="Enter parent's name (optional)" maxLength={100}
                className="w-full px-4 py-4 bg-[#3A3A3A] border-4 border-[#6A0DAD] rounded-lg text-[#EFEFEF] focus:outline-none focus:border-[#8B2CAD] transition-all placeholder:text-gray-500" />
            </div>
            <div>
              <label className="block text-[#B3B3B3] text-sm font-semibold mb-2">Phone Number</label>
              <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange}
                placeholder="Enter your phone number" required maxLength={20}
                className="w-full px-4 py-4 bg-[#3A3A3A] border-4 border-[#6A0DAD] rounded-lg text-[#EFEFEF] focus:outline-none focus:border-[#8B2CAD] transition-all placeholder:text-gray-500" />
            </div>
            <div>
              <label className="block text-[#B3B3B3] text-sm font-semibold mb-2">Parent Phone Number</label>
              <input type="tel" name="parentPhoneNumber" value={formData.parentPhoneNumber} onChange={handleInputChange}
                placeholder="Enter parent's phone number (optional)" maxLength={20}
                className="w-full px-4 py-4 bg-[#3A3A3A] border-4 border-[#6A0DAD] rounded-lg text-[#EFEFEF] focus:outline-none focus:border-[#8B2CAD] transition-all placeholder:text-gray-500" />
            </div>
            <div>
              <label className="block text-[#B3B3B3] text-sm font-semibold mb-2">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange}
                  placeholder="Create a password (min 8 characters)" required minLength={8} maxLength={72}
                  suppressHydrationWarning
                  className="w-full px-4 py-4 pr-14 bg-[#3A3A3A] border-4 border-[#6A0DAD] rounded-lg text-[#EFEFEF] focus:outline-none focus:border-[#8B2CAD] transition-all placeholder:text-gray-500" />
                <button type="button" suppressHydrationWarning onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#EFEFEF] transition-colors select-none">
                  <i className={`fi ${showPassword ? 'fi-rr-eye-crossed' : 'fi-rr-eye'} text-xl`} />
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} suppressHydrationWarning
              className="w-full py-5 bg-[#6A0DAD] text-[#EFEFEF] rounded-lg text-xl font-bold hover:bg-[#8B2CAD] transform hover:-translate-y-1 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
