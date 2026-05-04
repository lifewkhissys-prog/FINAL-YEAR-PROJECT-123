import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Activity, Users, Code2, Shield, Cpu } from 'lucide-react';
import DevLabLogo from '../../components/ui/DevLabLogo';
import { SkillTree } from '../../components/ui/SkillTree';
import { ReadinessRadar } from '../../components/ui/ReadinessRadar';
import { ThemeSwitcher } from '../../components/ui/ThemeSwitcher';

export function LandingPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-150px] left-[-120px] w-96 h-96 rounded-full bg-brand-blue/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-120px] w-96 h-96 rounded-full bg-brand-purple/10 blur-3xl" />
      </div>

      <header className="relative z-10 py-24 px-6 lg:px-12">
        <div className="absolute top-6 right-6 z-20">
          <ThemeSwitcher />
        </div>
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center gap-3 px-4 py-2 rounded-full bg-brand-blue/10 border border-brand-blue/20 mb-6">
            <Zap size={16} className="text-brand-blue" />
            <span className="text-xs uppercase tracking-[0.35em] text-brand-blue font-semibold">DevLab Platform</span>
          </div>

          <div className="space-y-6">
            <div className="mx-auto inline-flex items-center justify-center rounded-full bg-white/5 px-6 py-3 border border-white/10 shadow-lg shadow-brand-blue/10">
              <DevLabLogo size="md" />
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight leading-[1.02]">
              Code faster, learn smarter, and get assessed in real time.
            </h1>

            <p className="mx-auto max-w-3xl text-lg text-[var(--text-secondary)] leading-relaxed">
              An immersive developer assessment workspace for students and lecturers, built with modern tooling, interactive labs, and intelligent progress tracking.
            </p>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-blue px-8 py-4 text-sm font-semibold text-white transition hover:bg-brand-blue/90">
              Sign in
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-white/20">
              Register
            </Link>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Users, label: 'Community-driven labs', description: 'Engage with courses, problems, and competence tracking.' },
              { icon: Code2, label: 'Live code challenges', description: 'Solve problems with instant assessment and progress feedback.' },
              { icon: Shield, label: 'Secure evaluation', description: 'Protect student records and instructor workflows.' }
            ].map((item, index) => (
              <div key={index} className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-brand-blue mb-4">
                  <item.icon size={20} />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{item.label}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="relative z-10 py-20 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-4 py-2 text-sm uppercase tracking-[0.35em] text-brand-blue font-semibold">
              <Activity size={16} /> Live Metrics
            </span>
            <h2 className="text-4xl font-bold text-[var(--text-primary)]">Track your learning rhythm at a glance.</h2>
            <p className="max-w-xl text-lg text-[var(--text-secondary)] leading-relaxed">
              DevLab surfaces your assessment progress, system performance, and learning velocity with a high-fidelity UI designed for learners and lecturers.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-sm uppercase tracking-[0.35em] text-[var(--text-secondary)] mb-3">Live completion</h3>
                <p className="text-3xl font-bold text-white">94%</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-sm uppercase tracking-[0.35em] text-[var(--text-secondary)] mb-3">Active learners</h3>
                <p className="text-3xl font-bold text-white">2.8k</p>
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[#090B0F] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <SkillTree />
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-6 lg:px-12 bg-[rgba(255,255,255,0.02)] border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-purple/10 px-4 py-2 text-sm uppercase tracking-[0.35em] text-brand-purple font-semibold">
            <Cpu size={16} /> Readiness
          </span>
          <h2 className="mt-6 text-4xl font-bold text-[var(--text-primary)]">Industry-grade readiness tracking.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--text-secondary)] leading-relaxed">
            DevLab helps learners understand strengths, benchmarks, and next steps across algorithms, architecture, security and optimization.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <ReadinessRadar />
        </div>
      </section>

      <footer className="relative z-10 py-12 px-6 lg:px-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-sm text-[var(--text-secondary)]">
          <p>© 2026 DevLab Technologies. Built for modern engineering teaching and assessment.</p>
          <p className="text-brand-blue uppercase tracking-[0.3em]">ANKOMAH KELVIN • MAHFUZ ABGOR SEIDU</p>
        </div>
      </footer>
    </motion.div>
  );
}
