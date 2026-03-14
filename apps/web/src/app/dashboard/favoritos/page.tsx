'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Trash2, FileText, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, formatDate } from '@/lib/utils';

export default function FavoritosPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => apiClient.getFavorites(),
  });

  const removeMutation = useMutation({
    mutationFn: (documentId: string) => apiClient.removeFavorite(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-ids'] });
      toast.success('Removido dos favoritos');
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const grouped: Record<string, any[]> = data?.grouped || {};
  const totalCount = data?.favorites?.length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-400 fill-current" />
          Favoritos
        </h1>
        <p className="text-slate-500 text-sm mt-1">{totalCount} documento{totalCount !== 1 ? 's' : ''} favoritado{totalCount !== 1 ? 's' : ''}</p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl shimmer" />
          ))}
        </div>
      )}

      {!isLoading && totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[#141414] border border-white/[0.07] rounded-xl">
          <Heart className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">Nenhum favorito ainda</p>
          <p className="text-slate-500 text-sm mt-1">
            Clique no ícone de coração nas jurisprudências para favoritar
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([collection, items]) => (
        <div key={collection} className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
            <FolderOpen className="w-4 h-4 text-brand-400" />
            <h2 className="text-sm font-semibold text-slate-300">{collection}</h2>
            <span className="text-xs text-slate-500 ml-auto">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {items.map((fav: any) => (
              <div key={fav.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">{fav.document?.title || 'Documento'}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {fav.document?.tribunal && <span>{fav.document.tribunal} • </span>}
                    {fav.document?.judgmentDate && formatDate(fav.document.judgmentDate)}
                  </p>
                  {fav.note && <p className="text-slate-400 text-xs mt-1 italic">"{fav.note}"</p>}
                </div>
                <button
                  onClick={() => removeMutation.mutate(fav.document.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded shrink-0"
                  title="Remover dos favoritos"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
