import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Image, MapPin, Palette, Share2 } from 'lucide-react';

interface SiteSettings {
  logo: string;
  favicon: string;
  hero_image: string;
  about_image: string;
  contact_image: string;
  background_color: string;
  location_title: string;
  location_address: string;
  location_map_url: string;
  location_link: string;
  location_phone: string;
  location_email: string;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  tiktok_url: string;
  whatsapp_number: string;
  tab_title: string;
}

function normalizeSiteSettings(data: Partial<Record<keyof SiteSettings, string | null>>): SiteSettings {
  return {
    logo: data.logo ?? '',
    favicon: data.favicon ?? '',
    hero_image: data.hero_image ?? '',
    about_image: data.about_image ?? '',
    contact_image: data.contact_image ?? '',
    background_color: data.background_color ?? '#ffffff',
    location_title: data.location_title ?? 'Notre localisation',
    location_address: data.location_address ?? '111 Avenue Blaise Diagne, Dakar, Senegal',
    location_map_url: data.location_map_url ?? '',
    location_link: data.location_link ?? '',
    location_phone: data.location_phone ?? '',
    location_email: data.location_email ?? 'contact@sphere-office.com',
    facebook_url: data.facebook_url ?? '',
    instagram_url: data.instagram_url ?? '',
    linkedin_url: data.linkedin_url ?? '',
    tiktok_url: data.tiktok_url ?? '',
    whatsapp_number: data.whatsapp_number ?? '',
    tab_title: data.tab_title ?? 'Sphere Office',
  };
}

const inputCls = 'block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</label>
      {hint && <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}

export function Settings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = React.useState<SiteSettings>({
    logo: '',
    favicon: '',
    hero_image: '',
    about_image: '',
    contact_image: '',
    background_color: '#ffffff',
    location_title: 'Notre localisation',
    location_address: '111 Avenue Blaise Diagne, Dakar, Senegal',
    location_map_url: '',
    location_link: '',
    location_phone: '',
    location_email: 'contact@sphere-office.com',
    facebook_url: '',
    instagram_url: '',
    linkedin_url: '',
    tiktok_url: '',
    whatsapp_number: '',
    tab_title: 'Sphère Office',
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('site_settings').select('*').single();
        if (error) throw error;
        if (data) setSettings(normalizeSiteSettings(data));
      } catch {
        toast.error('Erreur lors du chargement des paramètres');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('site_settings').upsert(settings);
      if (error) throw error;
      toast.success('Paramètres enregistrés avec succès');
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    } catch {
      toast.error("Erreur lors de l'enregistrement des paramètres");
    } finally {
      setIsSaving(false);
    }
  };

  const set = <K extends keyof SiteSettings>(key: K) =>
    (value: SiteSettings[K]) => setSettings((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white h-48 dark:border-slate-800 dark:bg-slate-900" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Paramètres du site</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Configuration générale de Sphère Office</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full bg-sky-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-800 active:scale-95 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
        >
          {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>

      {/* Appearance */}
      <Section icon={Palette} title="Apparence">
        <div className="space-y-6">
          <Field label="Titre de l'onglet" hint="Le titre affiché dans l'onglet du navigateur">
            <input
              type="text"
              value={settings.tab_title}
              onChange={(e) => set('tab_title')(e.target.value)}
              className={inputCls}
              placeholder="Sphère Office"
            />
          </Field>
          <Field label="Couleur de fond" hint="Couleur de fond principale du site">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.background_color}
                onChange={(e) => set('background_color')(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded-xl border border-slate-200 p-1 dark:border-slate-700"
              />
              <input
                type="text"
                value={settings.background_color}
                onChange={(e) => set('background_color')(e.target.value)}
                className={`${inputCls} font-mono`}
                placeholder="#ffffff"
              />
            </div>
          </Field>
        </div>
      </Section>

      {/* Images */}
      <Section icon={Image} title="Images du site">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {[
            { label: 'Logo', key: 'logo' as const },
            { label: 'Favicon', key: 'favicon' as const },
            { label: "Image d'accueil", key: 'hero_image' as const },
            { label: 'Image "À propos"', key: 'about_image' as const },
            { label: 'Image de contact', key: 'contact_image' as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</label>
              <ImageUpload
                value={settings[key] ? [settings[key] as string] : []}
                onChange={(urls) => set(key)(urls[0] || '')}
                maxFiles={1}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Coordinates */}
      <Section icon={MapPin} title="Coordonnées">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Titre de la section localisation">
            <input
              type="text"
              value={settings.location_title}
              onChange={(e) => set('location_title')(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Adresse">
            <input
              type="text"
              value={settings.location_address}
              onChange={(e) => set('location_address')(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Téléphone">
            <input
              type="text"
              value={settings.location_phone}
              onChange={(e) => set('location_phone')(e.target.value)}
              className={inputCls}
              placeholder="+221 77 000 00 00"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={settings.location_email}
              onChange={(e) => set('location_email')(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Lien Google Maps">
            <input
              type="text"
              value={settings.location_link}
              onChange={(e) => set('location_link')(e.target.value)}
              className={inputCls}
              placeholder="https://goo.gl/maps/..."
            />
          </Field>
          <Field label="Numéro WhatsApp">
            <input
              type="text"
              value={settings.whatsapp_number}
              onChange={(e) => set('whatsapp_number')(e.target.value)}
              className={inputCls}
              placeholder="+221770000000"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="URL d'integration Google Maps (iframe)">
              <input
                type="text"
                value={settings.location_map_url}
                onChange={(e) => set('location_map_url')(e.target.value)}
                className={inputCls}
                placeholder="https://www.google.com/maps/embed?..."
              />
            </Field>
          </div>
        </div>
      </Section>

      {/* Social networks */}
      <Section icon={Share2} title="Réseaux sociaux">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {[
            { label: 'Facebook', key: 'facebook_url' as const, placeholder: 'https://facebook.com/votre-page' },
            { label: 'Instagram', key: 'instagram_url' as const, placeholder: 'https://instagram.com/votre-compte' },
            { label: 'LinkedIn', key: 'linkedin_url' as const, placeholder: 'https://linkedin.com/company/...' },
            { label: 'TikTok', key: 'tiktok_url' as const, placeholder: 'https://tiktok.com/@votre-compte' },
          ].map(({ label, key, placeholder }) => (
            <Field key={key} label={label}>
              <input
                type="url"
                value={settings[key]}
                onChange={(e) => set(key)(e.target.value)}
                className={inputCls}
                placeholder={placeholder}
              />
            </Field>
          ))}
        </div>
      </Section>

      {/* Save button (bottom) */}
      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full bg-sky-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-800 active:scale-95 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
        >
          {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  );
}
