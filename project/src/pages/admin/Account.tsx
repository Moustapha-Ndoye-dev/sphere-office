import React from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { changePassword } from '../../lib/auth';
import { validatePassword } from '../../lib/security';
import { useAuthStore } from '../../store/auth';

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
};

const inputClass =
  'block w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-12 text-sm text-slate-900 shadow-sm transition-colors placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

function PasswordField({ id, label, value, autoComplete, onChange }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <span className="relative block">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          aria-label={isVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

export function Account() {
  const user = useAuthStore((state) => state.user);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword === currentPassword) {
      toast.error('Choisissez un mot de passe différent de l’ancien');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    if (newPassword !== confirmation) {
      toast.error('La confirmation ne correspond pas au nouveau mot de passe');
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      toast.success('Votre mot de passe a été modifié');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de modifier le mot de passe');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mon compte</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gérez vos informations personnelles et sécurisez votre accès.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Modifier mon mot de passe</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Votre mot de passe actuel est demandé avant toute modification.
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <PasswordField
              id="current-password"
              label="Mot de passe actuel"
              value={currentPassword}
              autoComplete="current-password"
              onChange={setCurrentPassword}
            />
            <PasswordField
              id="new-password"
              label="Nouveau mot de passe"
              value={newPassword}
              autoComplete="new-password"
              onChange={setNewPassword}
            />
            <PasswordField
              id="confirm-password"
              label="Confirmer le nouveau mot de passe"
              value={confirmation}
              autoComplete="new-password"
              onChange={setConfirmation}
            />

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Exigences de sécurité
              </p>
              <ul className="mt-2 grid gap-1.5 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-500" />8 caractères minimum</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-500" />Majuscule et minuscule</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-500" />Au moins un chiffre</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-500" />Un caractère spécial</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500 sm:w-auto"
            >
              <LockKeyhole className="h-4 w-4" />
              {isSaving ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-sky-900 text-sm font-bold text-sky-100">
              {user?.email.slice(0, 2).toUpperCase() || 'SO'}
            </div>
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <UserRound className="h-4 w-4 text-sky-500" />
              <h2 className="text-sm font-semibold">Compte connecté</h2>
            </div>
            <p className="mt-3 break-all text-sm text-slate-600 dark:text-slate-300">{user?.email}</p>
            <span className="mt-3 inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              {user?.role === 'superadmin' ? 'Super administrateur' : user?.role === 'admin' ? 'Administrateur' : 'Caissier'}
            </span>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="mt-3 text-sm font-semibold">Modification sécurisée</h2>
            <p className="mt-1 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
              Le mot de passe est mis à jour directement dans votre compte d’authentification. Il n’est jamais enregistré dans le profil métier.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
