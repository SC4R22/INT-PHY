"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      // Convert phone to email format
      const cleanPhone = formData.phoneNumber.replace(/[^0-9]/g, "");
      const email = `${cleanPhone}@intphy.app`;

      const { error } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            parent_name: formData.parentName || null,
            phone_number: formData.phoneNumber,
            parent_phone_number: formData.parentPhoneNumber || null,
            role: "student",
          },
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Signup successful - redirect to dashboard
      router.push("/dashboard");
      router.refresh(); // Refresh to update server components
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#6A0DAD] to-[#8B2CAD] rounded-b-[2rem] p-16 text-center">
        <h1 className="text-7xl font-black text-[#E8E8E8] uppercase italic tracking-tighter drop-shadow-lg font-payback">
          WELCOME !
        </h1>
      </div>

      {/* Auth Container */}
      <div className="max-w-3xl mx-auto mt-8 bg-[#2A2A2A] rounded-xl overflow-hidden shadow-2xl mb-8">
        {/* Tabs */}
        <div className="flex border-b-4 border-[#6A0DAD]">
          <button
            onClick={() => setActiveTab("signup")}
            className={`flex-1 py-6 text-2xl font-extrabold transition-all ${
              activeTab === "signup"
                ? "text-[#6A0DAD] bg-[#2A2A2A]"
                : "text-[#EFEFEF] bg-[#1a1a1a]"
            }`}
            suppressHydrationWarning
          >
            Sign-up
          </button>
          <button
            onClick={() => {
              setActiveTab("login");
              router.push("/login");
            }}
            className={`flex-1 py-6 text-2xl font-extrabold transition-all ${
              activeTab === "login"
                ? "text-[#6A0DAD] bg-[#2A2A2A]"
                : "text-[#EFEFEF] bg-[#1a1a1a]"
            }`}
            suppressHydrationWarning
          >
            Log-in
          </button>
        </div>

        {/* Sign Up Form */}
        <div className="p-12">
          {error && (
            <div className="bg-red-500 text-white px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-6">
            <div>
              <label className="block text-[#B3B3B3] text-sm font-semibold mb-2">
                Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your name"
                required
                className="w-full px-4 py-4 bg-[#3A3A3A] border-4 border-[#6A0DAD] rounded-lg text-[#EFEFEF] focus:outline-none focus:border-[#8B2CAD] focus:bg-[#404040] transition-all placeholder:text-gray-500"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-[#B3B3B3] text-sm font-semibold mb-2">
                Parent Name
              </label>
              <input
                type="text"
                name="parentName"
                value={formData.parentName}
                onChange={handleInputChange}
                placeholder="Enter parent's name (optional)"
                className="w-full px-4 py-4 bg-[#3A3A3A] border-4 border-[#6A0DAD] rounded-lg text-[#EFEFEF] focus:outline-none focus:border-[#8B2CAD] focus:bg-[#404040] transition-all placeholder:text-gray-500"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-[#B3B3B3] text-sm font-semibold mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
                required
                className="w-full px-4 py-4 bg-[#3A3A3A] border-4 border-[#6A0DAD] rounded-lg text-[#EFEFEF] focus:outline-none focus:border-[#8B2CAD] focus:bg-[#404040] transition-all placeholder:text-gray-500"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-[#B3B3B3] text-sm font-semibold mb-2">
                Parent Phone Number
              </label>
              <input
                type="tel"
                name="parentPhoneNumber"
                value={formData.parentPhoneNumber}
                onChange={handleInputChange}
                placeholder="Enter parent's phone number (optional)"
                className="w-full px-4 py-4 bg-[#3A3A3A] border-4 border-[#6A0DAD] rounded-lg text-[#EFEFEF] focus:outline-none focus:border-[#8B2CAD] focus:bg-[#404040] transition-all placeholder:text-gray-500"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-[#B3B3B3] text-sm font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a password"
                required
                minLength={8}
                className="w-full px-4 py-4 bg-[#3A3A3A] border-4 border-[#6A0DAD] rounded-lg text-[#EFEFEF] focus:outline-none focus:border-[#8B2CAD] focus:bg-[#404040] transition-all placeholder:text-gray-500"
                suppressHydrationWarning
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-[#6A0DAD] text-[#EFEFEF] rounded-lg text-xl font-bold hover:bg-[#8B2CAD] transform hover:-translate-y-1 transition-all shadow-lg hover:shadow-[#6A0DAD]/40 disabled:opacity-60 disabled:cursor-not-allowed"
              suppressHydrationWarning
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
