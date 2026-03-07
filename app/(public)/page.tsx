import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "المبدع — عربي مع الأستاذ أحمد بدوي",
  description:
    "تعلم اللغة العربية مع الأستاذ أحمد بدوي على منصة المبدع. دروس فيديو HD وكورسات منظمة لطلاب الثانوية العامة في مصر.",
  alternates: {
    canonical: "https://int-phy.vercel.app",
  },
};

export default async function HomePage() {
  return (
    <div className="bg-theme-primary">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container-custom relative z-10 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 rounded-full">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-primary text-sm font-semibold tracking-wide">
                  عربي • ثانوية عامة
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-1">
                <p
                  className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-theme-secondary"
                  style={{ fontFamily: "var(--font-tajawal)" }}
                >
                  مع المبدع
                </p>
                <h1
                  className="text-5xl md:text-6xl lg:text-7xl font-black"
                  style={{
                    fontFamily: "var(--font-cairo)",
                    background:
                      "linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    lineHeight: "1.3",
                    paddingBottom: "0.15em",
                  }}
                >
                  أحمد بدوي
                </h1>
              </div>

              {/* Divider */}
              <div
                className="h-px w-16"
                style={{
                  background:
                    "linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)",
                }}
              />

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/courses"
                  className="btn btn-primary text-lg text-center"
                >
                  تصفح الكورسات
                </Link>
                <Link
                  href="/signup"
                  className="btn btn-secondary text-lg text-center"
                >
                  إنشاء حساب
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-8 pt-4 border-t border-[var(--border-color)]">
                {[
                  { value: "3", label: "مراكز" },
                  { value: "100%", label: "تركيز" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-3xl font-payback font-bold text-theme-primary">
                      {s.value}
                    </p>
                    <p className="text-theme-secondary text-sm">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div
                className="relative rounded-2xl overflow-hidden border-2 border-primary/30 bg-[var(--bg-card)]"
                style={{
                  boxShadow: "0 0 40px rgba(255,120,2,0.2)",
                  height: "480px",
                  width: "360px",
                }}
              >
                <Image
                  src="/profile.jpg"
                  alt="الأستاذ أحمد بدوي"
                  fill
                  className="object-cover object-top"
                  priority
                />
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
              ليه تختار المبدع؟
            </h2>
            <p className="text-theme-secondary text-lg max-w-xl mx-auto">
              كل اللي تحتاجه عشان تتقن اللغة العربية، في مكان واحد.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "🎬",
                title: "تعلم على أصوله",
                desc: "منصة متكاملة فيها كل اللي تحتاجه، تتابع تقدمك بنفسك وتذاكر براحتك من غير أي تعقيد.",
              },
              {
                icon: "📚",
                title: "اتحدَ نفسك",
                desc: "تمارين واختبارات تفاعلية عشان تعرف مستواك وتطور نفسك خطوة بخطوة، ودايمًا بنوجهك للطريق الصح.",
              },
              {
                icon: "📚",
                title: "مذاكرتك في وقتها",
                desc: "محتوى مرتب في أقسام واضحة عشان تعرف دايمًا فين كل دروسك موجودة ومتاحة في أي وقت، تقدر تحجز حصصك بسهولة وتتابع مذاكرتك من غير ما تضيع وقتك..",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group bg-theme-card rounded-2xl p-8 border-2 border-[var(--border-color)] hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="text-5xl mb-5">{f.icon}</div>
                <h3 className="text-xl font-bold text-theme-primary mb-3">
                  {f.title}
                </h3>
                <p className="text-theme-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CENTERS ──────────────────────────────────────────── */}
      <section className="section-padding bg-[var(--bg-secondary)]">
        <div className="container-custom">
          <h2 className="text-4xl lg:text-5xl font-payback font-bold text-center mb-12 text-theme-primary">
            المراكز المتاحة
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            {["حدائق اكتوبر", "اكتوبر", "الشيخ زايد"].map((center) => (
              <div
                key={center}
                className="text-white px-12 py-5 rounded-full text-xl lg:text-2xl font-bold font-payback hover:scale-105 transition-all cursor-default"
                style={{
                  background:
                    "linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)",
                  boxShadow: "0 4px 20px rgba(255,120,2,0.35)",
                }}
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
              مين إحنا؟
            </h2>
            <p className="text-lg leading-relaxed text-theme-secondary">
              إحنا منصة تعليمية متخصصة في اللغة العربية، مبنية حول فلسفة التدريس
              المميزة للأستاذ أحمد بدوي. هدفنا إننا نوصّل تعليم عربي عالي الجودة
              لكل طالب، سواء بيحضر في مراكزنا أو بيذاكر من البيت.
            </p>
          </div>
          <div className="text-center py-8 bg-theme-card rounded-2xl border-2 border-primary/20 px-8">
            <p
              className="text-2xl lg:text-3xl font-bold text-primary leading-relaxed"
              dir="rtl"
            >
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
