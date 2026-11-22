import React, { useState } from 'react';
import { FolderOpen, LogIn, Sparkles, Trash2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { MAKEUP_PRODUCTS, MODELS } from '../data/makeupCatalog';
import { MakeupZoneId, SavedFigureRecord } from '../types';

interface Props {
  user: User | null;
  authLoading: boolean;
  savedFigures: SavedFigureRecord[];
  onSignIn: () => void;
  onLoadFigure: (figure: SavedFigureRecord) => void;
  onDeleteFigure: (figureId: string) => Promise<void>;
  onGoToStudio: () => void;
}

export const SavedFiguresView: React.FC<Props> = ({
  user,
  authLoading,
  savedFigures,
  onSignIn,
  onLoadFigure,
  onDeleteFigure,
  onGoToStudio,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="rounded-xl border border-[#E7E1DA] bg-white p-10 text-center text-sm text-[#57534E]">
        Loading your saved looks...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-[#E7E1DA] bg-white p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#9D174D]/10 text-[#9D174D]">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
          Save Your Model Looks with Google
        </h2>
        <p className="text-sm text-[#57534E] leading-relaxed">
          Sign in with your Google account to save your custom painted model figures, reload them
          anytime to keep editing, and keep all of your unlocked brushes, shades, and Algebra 1 OST
          stars synced across devices.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center gap-2 rounded-lg bg-[#9D174D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#831843] transition-colors cursor-pointer"
          >
            <LogIn className="h-4 w-4" />
            <span>Sign in with Google</span>
          </button>
          <button
            type="button"
            onClick={onGoToStudio}
            className="rounded-lg border border-[#D6CFC7] bg-white px-4 py-2.5 text-sm font-medium text-[#44403C] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
          >
            Back to Studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E1DA] pb-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#1C1917]">
            Saved Looks Gallery
          </h1>
          <p className="text-xs text-[#57534E] mt-0.5">
            Signed in as {user.displayName || 'Student'} · {savedFigures.length}{' '}
            {savedFigures.length === 1 ? 'saved figure' : 'saved figures'}
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToStudio}
          className="rounded-lg bg-[#9D174D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#831843] transition-colors cursor-pointer"
        >
          Create New Look
        </button>
      </div>

      {savedFigures.length === 0 ? (
        <div className="rounded-xl border border-[#E7E1DA] bg-white p-10 text-center space-y-3">
          <h2 className="text-base font-semibold text-[#1C1917]">No Saved Figures Yet</h2>
          <p className="text-sm text-[#57534E] max-w-md mx-auto">
            Paint makeup onto any model in the Makeup Studio, then click{' '}
            <strong className="text-[#1C1917]">Save Look</strong> at the top of the mirror to store
            your creation here.
          </p>
          <button
            type="button"
            onClick={onGoToStudio}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#9D174D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#831843] transition-colors cursor-pointer"
          >
            Go to Makeup Studio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedFigures.map((fig) => {
            const model = MODELS.find((m) => m.id === fig.modelId) || MODELS[0];
            const appliedZones = Object.keys(fig.makeupState || {}) as MakeupZoneId[];
            const zoneLabels = appliedZones
              .map((z) => MAKEUP_PRODUCTS.find((p) => p.zone === z)?.shortName || z)
              .slice(0, 4);
            const isConfirming = confirmDeleteId === fig.id;
            const isDeleting = deletingId === fig.id;

            return (
              <div
                key={fig.id}
                className="flex flex-col rounded-xl border border-[#E7E1DA] bg-white overflow-hidden"
              >
                <div className="aspect-[225/266] bg-[#F3EDE6] overflow-hidden border-b border-[#E7E1DA]">
                  <img
                    src={fig.thumbnailDataUrl}
                    alt={fig.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1C1917] truncate">{fig.title}</h3>
                    <p className="text-xs text-[#57534E] mt-0.5">
                      {model.name}
                    </p>
                    <p className="text-[11px] text-[#78716C] mt-1.5">
                      {appliedZones.length === 0
                        ? 'Bare canvas'
                        : `${appliedZones.length} ${
                            appliedZones.length === 1 ? 'zone' : 'zones'
                          }: ${zoneLabels.join(', ')}${appliedZones.length > 4 ? '...' : ''}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onLoadFigure(fig)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#9D174D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#831843] transition-colors cursor-pointer"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      <span>Open in Studio</span>
                    </button>

                    {isConfirming ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={async () => {
                            setDeletingId(fig.id);
                            try {
                              await onDeleteFigure(fig.id);
                            } finally {
                              setDeletingId(null);
                              setConfirmDeleteId(null);
                            }
                          }}
                          className="rounded-lg bg-[#991B1B] px-2.5 py-2 text-xs font-semibold text-white hover:bg-[#7F1D1D] transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {isDeleting ? '...' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-[#D6CFC7] bg-white px-2 py-2 text-xs font-medium text-[#44403C] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(fig.id)}
                        aria-label={`Delete ${fig.title}`}
                        className="inline-flex items-center justify-center rounded-lg border border-[#D6CFC7] bg-white p-2 text-[#57534E] hover:bg-[#F3EFEA] hover:text-[#991B1B] transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
