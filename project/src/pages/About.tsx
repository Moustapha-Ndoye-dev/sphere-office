import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Award, Building2, Leaf, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getProducts } from '../services/products';

const STORY_IMAGES = [
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=900&q=80',
];

const VALUES = [
  {
    icon: Building2,
    title: 'Exigence',
    description: 'Des produits et une presentation qui renforcent la credibilite de votre environnement de travail.',
  },
  {
    icon: Users,
    title: 'Accompagnement',
    description: 'Une experience plus simple pour choisir, comparer et contacter rapidement.',
  },
  {
    icon: Award,
    title: 'Qualite percue',
    description: "Un soin particulier apporte au confort, a l'usage et a l'image professionnelle.",
  },
  {
    icon: Leaf,
    title: 'Cohesion',
    description: 'Un catalogue plus coherent, au service des besoins reels des entreprises et des equipes.',
  },
];

function AnimatedCounter({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) {
  const [display, setDisplay] = React.useState('--');
  const ref = React.useRef<HTMLDivElement>(null);
  const hasAnimated = React.useRef(false);

  React.useEffect(() => {
    if (hasAnimated.current || value === '--') {
      if (value === '--') setDisplay('--');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;

        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
          setDisplay(value);
          observer.disconnect();
          return;
        }

        const duration = 1400;
        const start = Date.now();

        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(2, -10 * progress);
          setDisplay(String(Math.round(eased * numValue)));
          if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.6 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div
      ref={ref}
      className="stat-card"
      data-reveal="scale"
      data-delay={String(delay)}
    >
      <p className="counter-num text-shimmer text-4xl font-extrabold leading-none sm:text-5xl">{display}</p>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
    </div>
  );
}

export function About() {
  const { data: productsCount, isError: isProductsCountError } = useQuery({
    queryKey: ['about-products-count'],
    queryFn: async () => {
      const result = await getProducts(1, 1);
      return result.totalCount;
    },
  });

  const { data: categoriesCount, isError: isCategoriesCountError } = useQuery({
    queryKey: ['about-categories-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('categories').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const metrics = [
    { value: isProductsCountError ? '--' : String(productsCount ?? '--'), label: 'Produits au catalogue' },
    { value: isCategoriesCountError ? '--' : String(categoriesCount ?? '--'), label: 'Collections disponibles' },
    { value: 'B2B', label: 'Approche orientee entreprise' },
    { value: '1', label: 'Vitrine plus coherente' },
  ];

  return (
    <div className="overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="grain-overlay mx-auto grid w-full max-w-[1800px] items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:gap-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:px-8 lg:py-20 2xl:px-12">
        <div>
          <p className="section-label animate-fade-in">A propos</p>
          <h1
            className="animate-fade-in-up mt-5 font-display text-[2rem] font-bold leading-[1.12] tracking-tight text-slate-950 sm:text-4xl md:text-[3.4rem] md:leading-[1.08] dark:text-white"
            style={{ animationDelay: '100ms' }}
          >
            Construire un espace de travail plus clair, plus fort, plus professionnel.
          </h1>
          <p
            className="animate-fade-in-up mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300"
            style={{ animationDelay: '200ms' }}
          >
            Sphere Office est concu comme un point de rencontre entre l'image de marque, le confort d'usage et l'efficacite au quotidien.
          </p>
          <p
            className="animate-fade-in-up mt-5 max-w-2xl text-base leading-8 text-slate-500 dark:text-slate-400"
            style={{ animationDelay: '280ms' }}
          >
            Notre ambition est simple : proposer un catalogue qui aide reellement a choisir de bons produits, a mieux se projeter et a contacter rapidement l'entreprise pour avancer sans friction.
          </p>
          <div
            className="animate-fade-in-up mt-10 flex flex-wrap gap-4"
            style={{ animationDelay: '360ms' }}
          >
            <Link
              to="/products"
              className="btn-liquid btn-lift inline-flex items-center rounded-full bg-sky-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-sky-900/20 transition-all hover:bg-sky-800 dark:bg-sky-500 dark:hover:bg-sky-400"
            >
              Explorer la boutique
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center rounded-full border border-slate-300 px-6 py-3.5 text-sm font-semibold text-slate-900 transition-all hover:border-sky-400 hover:text-sky-800 dark:border-slate-700 dark:text-white dark:hover:border-sky-400 dark:hover:text-sky-300"
            >
              Discuter avec nous
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Image mosaic */}
        <div className="grid grid-cols-2 gap-4" data-reveal="fade-right" data-delay="150">
          <div className="space-y-4 sm:pt-10">
            <img
              src={STORY_IMAGES[0]}
              alt="Showroom Sphere Office"
              className="h-52 w-full rounded-[26px] object-cover shadow-xl transition-transform duration-500 hover:-translate-y-1 sm:h-72 sm:rounded-[30px]"
            />
            <img
              src={STORY_IMAGES[1]}
              alt="Materiaux et accessoires premium"
              className="h-36 w-full rounded-[22px] object-cover shadow-xl transition-transform duration-500 hover:-translate-y-1 sm:h-48 sm:rounded-[26px]"
            />
          </div>
          <img
            src={STORY_IMAGES[2]}
            alt="Bureau moderne et lumineux"
            className="h-52 w-full rounded-[26px] object-cover shadow-xl transition-transform duration-500 hover:-translate-y-1 sm:h-[480px] sm:rounded-[30px]"
          />
        </div>
      </section>

      {/* ── Metrics ────────────────────────────────────────────── */}
      <section className="bg-white py-14 sm:py-18 md:py-22 dark:bg-slate-900">
        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 2xl:px-12">
          <div className="mb-10 text-center" data-reveal>
            <p className="section-label justify-center">En chiffres</p>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Un apercu de l'experience Sphere Office en quelques donnees cles.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 sm:gap-5">
            {metrics.map((metric, i) => (
              <AnimatedCounter key={metric.label} value={metric.value} label={metric.label} delay={i * 90} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ─────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1800px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 md:py-24 2xl:px-12">
        <div className="max-w-2xl" data-reveal>
          <p className="section-label">Notre approche</p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-950 md:text-4xl dark:text-white">
            Une experience digitale plus digne des produits presentes.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {VALUES.map((value, i) => (
            <div
              key={value.title}
              data-reveal="scale"
              data-delay={String(i * 90)}
              className="value-card-accent group rounded-[26px] border border-slate-200 bg-white p-7 shadow-[0_16px_50px_-32px_rgba(15,23,42,0.35)] transition-all duration-350 hover:-translate-y-2 hover:border-sky-200/70 hover:shadow-[0_28px_64px_-28px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-900/60"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-900 transition-all duration-300 group-hover:scale-110 group-hover:bg-sky-900 group-hover:text-white dark:bg-sky-950/70 dark:text-sky-200 dark:group-hover:bg-sky-600">
                <value.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-950 dark:text-white">{value.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">{value.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
