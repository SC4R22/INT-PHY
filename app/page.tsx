import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'INTPHY — Physics with Mr. Eslam Rabea | Intelligent Physics',
  description:
    'Learn physics with Mr. Eslam Rabea at INTPHY (Intelligent Physics). HD video lessons and structured courses for Grade 11 & 12 students in Egypt. Centers in Faysl, October, and Dokki.',
  alternates: {
    canonical: 'https://int-phy.vercel.app',
  },
};

export default async function HomePage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, price_cash, is_free")
    .eq("published", true)
    .is("deleted_at", null)
    .limit(6);

  return (
    <div className="bg-theme-primary">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container-custom relative z-10 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 rounded-full">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-primary text-sm font-semibold tracking-wide">
                  Physics • Senior three
                </span>
              </div>

              <div>
                <h1 className="text-5xl md:text-6xl lg:text-8xl font-payback font-bold text-theme-primary leading-none mb-2">
                  MR.ESLAM
                </h1>
                <h1 className="text-5xl md:text-6xl lg:text-8xl font-payback font-bold text-gradient leading-none">
                  RABEA
                </h1>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/courses" className="btn btn-primary text-lg text-center">Browse Courses</Link>
                <Link href="/signup" className="btn btn-secondary text-lg text-center">Create Account</Link>
              </div>

              {/* Stats */}
              <div className="flex gap-8 pt-4 border-t border-[var(--border-color)]">
                {[
                  { value: courses?.length || "0", label: "Courses" },
                  { value: "3", label: "Centers" },
                  { value: "100%", label: "Focused" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-3xl font-payback font-bold text-theme-primary">{s.value}</p>
                    <p className="text-theme-secondary text-sm">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — decorative card */}
            <div className="relative hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30 shadow-2xl shadow-primary/20 aspect-[4/3] bg-[var(--bg-card)] flex items-center justify-center">
                <div className="absolute inset-0 opacity-10">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute border border-primary/40 rounded-full"
                      style={{
                        width: `${(i + 1) * 15}%`,
                        height: `${(i + 1) * 15}%`,
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%,-50%)",
                      }}
                    />
                  ))}
                </div>
                <span className="text-8xl font-payback font-bold text-primary opacity-60 select-none">
                  PHYSICS
                </span>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/30 rounded-full blur-2xl" />
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary/20 rounded-full blur-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className="section-padding bg-[var(--bg-secondary)]">
        <div className="container-custom">
          <div className="text-center mb-14">
            <h2 className="text-4xl lg:text-5xl font-payback font-bold text-theme-primary mb-4">
              Why Choose Us?
            </h2>
            <p className="text-theme-secondary text-lg max-w-xl mx-auto">
              Everything you need to master physics, in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: "🎬",
                title: "HD Videos",
                desc: "High-quality recorded lectures you can rewatch anytime, at your own pace.",
              },
              {
                icon: "📚",
                title: "Structured revisions & camps",
                desc: "Content organized into clear sections so you always know exactly where you are.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group bg-theme-card rounded-2xl p-8 border-2 border-[var(--border-color)] hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="text-5xl mb-5">{f.icon}</div>
                <h3 className="text-xl font-bold text-theme-primary mb-3">{f.title}</h3>
                <p className="text-theme-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COURSE PREVIEW ───────────────────────────────────── */}
      <section className="section-padding bg-theme-primary">
        <div className="container-custom">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-4xl lg:text-5xl font-payback font-bold text-theme-primary mb-2">
                Available Courses
              </h2>
              <p className="text-theme-secondary text-lg">Start learning today</p>
            </div>
            <Link
              href="/courses"
              className="hidden sm:flex items-center gap-2 text-primary font-semibold hover:text-primary/80 transition-colors"
            >
              View all <span>→</span>
            </Link>
          </div>

          {!courses || courses.length === 0 ? (
            <div className="text-center py-20 bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)]">
              <p className="text-6xl mb-4">📚</p>
              <p className="text-theme-primary text-xl font-bold mb-2">Courses Coming Soon</p>
              <p className="text-theme-secondary">Check back shortly — new content is being added.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="group bg-theme-card rounded-2xl overflow-hidden border-2 border-[var(--border-color)] hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 flex flex-col"
                >
                  <div className="h-44 bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute border border-primary/50 rounded-full"
                          style={{
                            width: `${(i + 1) * 30}%`,
                            height: `${(i + 1) * 60}%`,
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%,-50%)",
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-4xl font-payback font-bold text-primary/60 select-none">
                      PHY
                    </span>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-theme-primary font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-theme-secondary text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border-color)]">
                      <span className={`font-bold text-lg ${course.is_free ? "text-green-500" : "text-theme-primary"}`}>
                        {course.is_free ? "Free" : `${course.price_cash} EGP`}
                      </span>
                      <span className="text-primary text-sm font-semibold group-hover:translate-x-1 transition-transform inline-block">
                        View Course →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-10 sm:hidden">
            <Link href="/courses" className="btn btn-secondary">View All Courses</Link>
          </div>
        </div>
      </section>

      {/* ── CENTERS ──────────────────────────────────────────── */}
      <section className="section-padding bg-[var(--bg-secondary)]">
        <div className="container-custom">
          <h2 className="text-4xl lg:text-5xl font-payback font-bold text-center mb-12 text-theme-primary">
            Available Centers
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            {["Faysl", "October", "Dokki"].map((center) => (
              <div
                key={center}
                className="bg-primary text-white px-12 py-5 rounded-full text-xl lg:text-2xl font-bold font-payback shadow-lg shadow-primary/30 hover:scale-105 hover:shadow-primary/50 transition-all cursor-default"
              >
                {center}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────────── */}
      <section className="section-padding bg-theme-primary border-t-2 border-[var(--border-color)]">
        <div className="container-custom max-w-4xl mx-auto space-y-12">
          <div>
            <h2 className="text-4xl lg:text-5xl font-payback font-bold text-theme-primary mb-6">
              Who Are We?
            </h2>
            <p className="text-lg leading-relaxed text-theme-secondary">
              We are a dedicated physics education platform built around the
              teaching philosophy of Mr. Eslam Rabea. Our goal is to make
              high-quality physics education accessible to every student,
              whether they attend our physical centers or learn from home.
            </p>
          </div>
          <div className="text-center py-8 bg-theme-card rounded-2xl border-2 border-primary/20 px-8">
            <p className="text-2xl lg:text-3xl font-bold text-primary leading-relaxed" dir="rtl">
              ﴿ إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ إِنَّا لَا
              نُضِيعُ أَجْرَ مَنْ أَحْسَنَ عَمَلًا﴾
            </p>
            <p className="text-theme-secondary mt-4">[الكهف: 30]</p>
          </div>
        </div>
      </section>
    </div>
  );
}
