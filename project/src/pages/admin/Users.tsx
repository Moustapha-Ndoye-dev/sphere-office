import React from 'react';
import { Trash2, X, UserPlus, RefreshCw, ShieldCheck, CreditCard, Search, KeyRound } from 'lucide-react';
import { validateInput, validatePassword } from '../../lib/security';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createUser, deleteUser, getUsers, updateUser, type ManagedUser, type ManagedUserRole } from '../../services/users';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Pagination } from '../../components/ui/Pagination';

interface UserFormData {
  email: string;
  password: string;
  role: ManagedUserRole;
}

const initialFormData: UserFormData = { email: '', password: '', role: 'cashier' };

const inputCls = 'block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const roleLabels: Record<ManagedUserRole, string> = {
  superadmin: 'Super administrateur',
  admin: 'Administrateur',
  cashier: 'Caissier',
};

function RoleBadge({ role }: { role: ManagedUserRole }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        role === 'superadmin'
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300'
          : role === 'admin'
            ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300'
            : 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
      }`}
    >
      {role === 'cashier' ? <CreditCard className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
      {roleLabels[role]}
    </span>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.error_description === 'string') return e.error_description;
    if (typeof e.details === 'string') return e.details;
  }
  return fallback;
}

export function Users() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<UserFormData>(initialFormData);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [passwordResetUser, setPasswordResetUser] = React.useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const { data: users, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 10000,
  });

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Liste des utilisateurs mise à jour');
    } catch {
      toast.error('Erreur lors du rafraîchissement');
    } finally {
      setIsRefreshing(false);
    }
  };

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setFormData(initialFormData);
      toast.success('Utilisateur créé avec succès');
    },
    onError: (error: unknown) => {
      toast.error(`Erreur: ${getErrorMessage(error, "Erreur lors de la création de l'utilisateur")}`);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur supprimé avec succès');
      setDeleteConfirmId(null);
    },
    onError: (error: unknown) => {
      toast.error(`Erreur: ${getErrorMessage(error, 'Erreur lors de la suppression')}`);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) => updateUser(userId, { password }),
    onSuccess: () => {
      setPasswordResetUser(null);
      setNewPassword('');
      toast.success('Mot de passe mis a jour');
    },
    onError: (error: unknown) => {
      toast.error(`Erreur: ${getErrorMessage(error, 'Erreur lors du changement de mot de passe')}`);
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateInput(formData.email, 'email')) {
      toast.error('Email invalide');
      return;
    }
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.message);
      return;
    }
    if (users?.some((user: ManagedUser) => user.email === formData.email)) {
      toast.error('Cet email est déjà utilisé');
      return;
    }
    try {
      await createUserMutation.mutateAsync(formData);
    } catch {
      // handled in mutation
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordResetUser) return;

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.message);
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({ userId: passwordResetUser.id, password: newPassword });
    } catch {
      // handled in mutation
    }
  };

  const filteredUsers = (users ?? []).filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.email.toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner variant="logo" size="lg" text="Chargement des utilisateurs..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        <h1 className="text-lg font-semibold">Impossible de charger les utilisateurs</h1>
        <p className="mt-2 text-sm">
          {error instanceof Error ? error.message : 'Vérifiez les droits admin et la configuration Supabase.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Utilisateurs</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {search || roleFilter ? (
                <><span className="font-semibold text-sky-600 dark:text-sky-400">{filteredUsers.length}</span> résultat{filteredUsers.length > 1 ? 's' : ''} sur {users?.length ?? 0} utilisateur{(users?.length ?? 0) > 1 ? 's' : ''}</>
              ) : (
                <>{users?.length ?? 0} utilisateur{(users?.length ?? 0) > 1 ? 's' : ''} enregistré{(users?.length ?? 0) > 1 ? 's' : ''}</>
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Actualiser"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <button
          onClick={() => { setFormData(initialFormData); setIsModalOpen(true); }}
          className="inline-flex items-center gap-2 rounded-full bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-800 active:scale-95 dark:bg-sky-600 dark:hover:bg-sky-500"
        >
          <UserPlus className="h-4 w-4" />
          Nouvel utilisateur
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par adresse e-mail…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 shrink-0"
        >
          <option value="">Tous les rôles</option>
          <option value="superadmin">Super administrateur</option>
          <option value="admin">Administrateur</option>
          <option value="cashier">Caissier</option>
        </select>
      </div>

      <div className="space-y-3 md:hidden">
        {paginated.length > 0 ? (
          paginated.map((user) => (
            <article key={user.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                  {user.email.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-semibold text-slate-900 dark:text-slate-100">{user.email}</p>
                  <div className="mt-2"><RoleBadge role={user.role} /></div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setPasswordResetUser(user); setNewPassword(''); }}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                >
                  <KeyRound className="h-4 w-4" />
                  Mot de passe
                </button>
                <button
                  onClick={() => setDeleteConfirmId(user.id)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
            {search || roleFilter ? 'Aucun utilisateur ne correspond a ces criteres.' : 'Aucun utilisateur trouve.'}
          </div>
        )}
      </div>

      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] overflow-hidden dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Utilisateur</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Rôle</th>
                <th className="px-6 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginated.length > 0 ? (
                paginated.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                          {user.email.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => { setPasswordResetUser(user); setNewPassword(''); }}
                        className="mr-1 rounded-xl p-2 text-slate-400 transition-all hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-950/50 dark:hover:text-amber-300"
                        title="Changer le mot de passe"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(user.id)}
                        className="rounded-xl p-2 text-slate-400 transition-all hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-400">
                    {search || roleFilter ? 'Aucun utilisateur ne correspond à ces critères.' : 'Aucun utilisateur trouvé.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length > 0 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            itemLabel="utilisateur"
          />
        )}
      </div>

      {filteredUsers.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            itemLabel="utilisateur"
          />
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Supprimer cet utilisateur ?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              L'utilisateur perdra immédiatement l'accès à l'administration.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteUserMutation.mutate(deleteConfirmId)}
                disabled={deleteUserMutation.isPending}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password reset */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-3 py-6 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setPasswordResetUser(null)} />
          <div className="relative my-auto flex max-h-[calc(100dvh-3rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Changer le mot de passe</h2>
                <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{passwordResetUser.email}</p>
              </div>
              <button
                onClick={() => setPasswordResetUser(null)}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordReset} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputCls}
                  required
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Min. 8 caracteres, une majuscule, une minuscule et un chiffre.
                </p>
              </div>
              </div>
              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-amber-700 active:scale-95 disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4" />
                  {resetPasswordMutation.isPending ? 'Modification...' : 'Modifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create user modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-3 py-6 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative my-auto flex max-h-[calc(100dvh-3rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nouvel utilisateur</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Mot de passe</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className={inputCls}
                  required
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Min. 8 caractères, une majuscule, une minuscule et un chiffre.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Rôle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as ManagedUserRole }))}
                  className={inputCls}
                >
                  <option value="superadmin">Super administrateur</option>
                  <option value="admin">Administrateur</option>
                  <option value="cashier">Caissier</option>
                </select>
              </div>
              </div>
              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sky-800 active:scale-95 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  {createUserMutation.isPending ? (
                    <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Création...</>
                  ) : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
