import React from 'react';
import { Plus, Trash2, X, UserPlus, RefreshCw } from 'lucide-react';
import { validateInput, validatePassword } from '../../lib/security';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createUser, deleteUser, getUsers } from '../../services/users';
import { getCurrentUser } from '../../services/auth';
import { LoadingSpinner } from '../../components/LoadingSpinner';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'cashier';
}

interface UserFormData {
  email: string;
  password: string;
  role: 'admin' | 'cashier';
}

const initialFormData: UserFormData = {
  email: '',
  password: '',
  role: 'cashier',
};

export function Users() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<UserFormData>(initialFormData);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const user = getCurrentUser();

  // Fetch users using the service with refetch on focus and mount
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 10000 // 10 secondes
  });

  // Effet pour forcer le rechargement à chaque montage du composant
  React.useEffect(() => {
    console.log('Users component mounted, refreshing data');
    refetch();
  }, [refetch]);

  // Fonction pour rafraîchir manuellement les données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Liste des utilisateurs mise à jour');
    } catch (error) {
      toast.error('Erreur lors du rafraîchissement des données');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Create user mutation using the service
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setFormData(initialFormData);
      toast.success('Utilisateur créé avec succès. Un email de confirmation a été envoyé.');
    },
    onError: (error: any) => {
      console.error('Error creating user:', error);
      let errorMessage = 'Erreur inconnue lors de la création de l\'utilisateur';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error_description) {
        errorMessage = error.error_description;
      } else if (error.details) {
        errorMessage = error.details;
      }
      
      toast.error(`Erreur: ${errorMessage}`);
    }
  });

  // Delete user mutation using the service
  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting user:', error);
      toast.error(`Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate inputs
      if (!validateInput(formData.email, 'email')) {
        toast.error('Email invalide');
        return;
      }

      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        toast.error(passwordValidation.message);
        return;
      }

      // Check if email exists - cette vérification sera aussi faite dans le service
      if (users?.some(user => user.email === formData.email)) {
        toast.error('Cet email est déjà utilisé');
        return;
      }

      await createUserMutation.mutateAsync(formData);
    } catch (error: any) {
      console.error('Error in form submission:', error);
      // L'erreur sera gérée par onError du createUser
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      await deleteUserMutation.mutateAsync(userId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner variant="logo" size="lg" text="Chargement des utilisateurs..." />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mr-4">
            Gestion des utilisateurs
          </h1>
          <button
            onClick={handleRefresh}
            className="flex items-center px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
        <button
          onClick={() => {
            setFormData(initialFormData);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Nouvel utilisateur
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users && users.length > 0 ? (
                users.map((user, idx) => (
                  <tr key={user.id || idx}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400'
                      }`}>
                        {user.role === 'admin' ? 'Administrateur' : 'Caissier'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Nouvel utilisateur
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rôle
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      role: e.target.value as 'admin' | 'cashier',
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="admin">Administrateur</option>
                  <option value="cashier">Caissier</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Création...
                    </span>
                  ) : (
                    'Créer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}