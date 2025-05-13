import React from 'react';
import { Upload, X } from 'lucide-react';
import { uploadProductImage, deleteProductImage } from '../../lib/storage';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  maxSize?: number; // en Mo
}

export function ImageUpload({
  value = [],
  onChange,
  maxFiles = 5,
  maxSize = 5, // 5 Mo par défaut
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Vérification du nombre de fichiers
    if (value.length + files.length > maxFiles) {
      toast.error(`Vous ne pouvez pas uploader plus de ${maxFiles} images`);
      return;
    }

    setIsUploading(true);

    try {
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const url = await uploadProductImage(file);
          return url;
        })
      );

      onChange([...value, ...uploadedUrls]);
      toast.success('Images uploadées avec succès');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'upload');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (urlToRemove: string) => {
    try {
      await deleteProductImage(urlToRemove);
      onChange(value.filter(url => url !== urlToRemove));
      toast.success('Image supprimée avec succès');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Une erreur est survenue lors de la suppression');
    }
  };

  return (
    <div className="space-y-4">
      {/* Zone de preview */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {value.map((url, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Zone d'upload */}
      <div className="flex flex-col items-center justify-center w-full">
        <label
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${
            isUploading
              ? 'border-gray-400 bg-gray-100'
              : 'border-gray-300 hover:border-primary-500 hover:bg-gray-50'
          } dark:border-gray-600 dark:hover:border-primary-500 dark:hover:bg-gray-700 transition-all`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className={`w-8 h-8 mb-4 ${
              isUploading ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              {isUploading ? (
                'Upload en cours...'
              ) : (
                <span>
                  <span className="font-semibold">Cliquez pour uploader</span> ou glissez-déposez
                </span>
              )}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            multiple={maxFiles > 1}
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Compteur d'images */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
        {value.length} / {maxFiles} images
      </p>
    </div>
  );
}