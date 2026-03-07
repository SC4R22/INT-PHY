"use client";

import { useState, useTransition } from "react";
import { signup } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const GRADES = [
  { value: 'prep_1', label: 'إعدادي أول' },
  { value: 'prep_2', label: 'إعدادي ثاني' },
  { value: 'prep_3', label: 'إعدادي ثالث' },
  { value: 'sec_1',  label: 'أول ثانوي' },
  { value: 'sec_2',  label: 'تاني ثانوي' },
  { value: 'sec_3',  label: 'تالت ثانوي' },
]

const INPUT_STYLE = { border: '3px solid transparent', borderImage: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%) 1' }
const BRAND_GRADIENT = 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)'

export default function SignUpPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "", parentName: "", phoneNumber: "",
    parentPhoneNumber: "", password: "", grade: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await signup(
          formData.fullName, formData.phoneNumber, formData.password,
          formData.grade, formData.parentName || undefined, formData.parentPhoneNumber || undefined,
        );
        if (result?.error) setError(result.error);
      } catch {
        // redirect() throws internally in Next.js — not a real error
      }
    });
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-theme-primary">
      <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>

      <div className="rounded-b-[2rem] p-8 md:p-16 text-center" style={{ background: BRAND_GRADIENT }}>
        <h1 suppressHydrationWarning className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter drop-shadow-lg font-payback">
          اهلا بيك يا فنان !
        </h1>
      </div>

      <div className="max-w-3xl mx-4 md:mx-auto mt-6 md:mt-8 bg-theme-card rounded-xl overflow-hidden shadow-2xl mb-8">
        <div className="flex" style={{ borderBottom: '4px solid transparent', borderImage: `${BRAND_GRADIENT} 1` }}>
          <div className="flex-1 py-4 md:py-6 text-xl md:text-2xl font-extrabold text-center text-primary bg-theme-card">
            سجل حساب
          </div>
          <a href="/login" className="flex-1 py-4 md:py-6 text-xl md:text-2xl font-extrabold text-center text-theme-secondary bg-theme-primary">
            دخول
          </a>
        </div>

        <div className="p-6 md:p-12">
          {error && <div className="bg-red-500 text-white px-4 py-3 rounded-lg mb-6">{error}</div>}

          <form onSubmit={handleSignUp} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-theme-secondary text-sm font-semibold mb-2">الاسم *</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange}
                placeholder="ادخل اسمك" required maxLength={100}
                className="w-full px-4 py-4 bg-[var(--bg-input)] rounded-lg text-theme-primary focus:outline-none transition-all placeholder:text-theme-muted"
                style={INPUT_STYLE} />
            </div>

            {/* Grade */}
            <div>
              <label className="block text-theme-secondary text-sm font-semibold mb-2">الصف *</label>
              <div className="grid grid-cols-3 gap-3">
                {GRADES.map((g) => (
                  <button key={g.value} type="button"
                    onClick={() => setFormData({ ...formData, grade: g.value })}
                    className="py-3 rounded-lg font-bold text-sm transition-all"
                    style={formData.grade === g.value
                      ? { background: BRAND_GRADIENT, color: 'white', border: '3px solid transparent' }
                      : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '3px solid transparent', borderImage: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%) 1', opacity: 0.5 }
                    }>
                    {g.label}
                  </button>
                ))}
              </div>
              <input type="text" required value={formData.grade} onChange={() => {}}
                className="sr-only" tabIndex={-1} aria-hidden="true" />
            </div>

            {/* Parent Name */}
            <div>
              <label className="block text-theme-secondary text-sm font-semibold mb-2">اسم ولي الأمر</label>
              <input type="text" name="parentName" value={formData.parentName} onChange={handleInputChange}
                placeholder="ادخل اسم ولي الأمر (اختياري)" maxLength={100}
                className="w-full px-4 py-4 bg-[var(--bg-input)] rounded-lg text-theme-primary focus:outline-none transition-all placeholder:text-theme-muted"
                style={INPUT_STYLE} />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-theme-secondary text-sm font-semibold mb-2">رقم الهاتف *</label>
              <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange}
                placeholder="ادخل رقم هاتفك" required maxLength={20}
                className="w-full px-4 py-4 bg-[var(--bg-input)] rounded-lg text-theme-primary focus:outline-none transition-all placeholder:text-theme-muted"
                style={INPUT_STYLE} />
            </div>

            {/* Parent Phone */}
            <div>
              <label className="block text-theme-secondary text-sm font-semibold mb-2">رقم هاتف ولي الأمر</label>
              <input type="tel" name="parentPhoneNumber" value={formData.parentPhoneNumber} onChange={handleInputChange}
                placeholder="ادخل رقم هاتف ولي الأمر (اختياري)" maxLength={20}
                className="w-full px-4 py-4 bg-[var(--bg-input)] rounded-lg text-theme-primary focus:outline-none transition-all placeholder:text-theme-muted"
                style={INPUT_STYLE} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-theme-secondary text-sm font-semibold mb-2">كلمة السر *</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} name="password" value={formData.password}
                  onChange={handleInputChange} placeholder="اختر كلمة سر (أدنى 8 حروف)"
                  required minLength={8} maxLength={72}
                  className="w-full px-4 py-4 pr-14 bg-[var(--bg-input)] rounded-lg text-theme-primary focus:outline-none transition-all placeholder:text-theme-muted"
                  style={INPUT_STYLE} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-primary transition-colors select-none">
                  <i className={`fi ${showPassword ? 'fi-rr-eye-crossed' : 'fi-rr-eye'} text-xl`} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={isPending || !formData.grade}
              className="w-full py-5 text-white rounded-lg text-xl font-bold transform hover:-translate-y-1 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: BRAND_GRADIENT }}>
              {isPending ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
