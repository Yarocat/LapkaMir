import React, { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, RotateCw, Check, Sparkles, ShoppingBag, Shirt } from 'lucide-react';
import { drawAvatar } from '../canvas/avatarRenderer';
import { getItemsBySlot, SLOT_LABELS } from '../data/catalog';
import { CharacterConfig, Direction, Outfit, OutfitSlot } from '../types/game';

interface WardrobeModalProps {
  mode: 'wardrobe' | 'shop';
  character: CharacterConfig;
  saving?: boolean;
  onClose: () => void;
  onSaveOutfit: (outfit: Outfit) => void;
}

const SLOTS_ORDER: OutfitSlot[] = ['hat', 'top', 'bottom', 'shoes', 'accessory'];

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  mode,
  character,
  saving = false,
  onClose,
  onSaveOutfit,
}) => {
  const [activeSlot, setActiveSlot] = useState<OutfitSlot>(mode === 'shop' ? 'top' : 'hat');
  const [draftOutfit, setDraftOutfit] = useState<Outfit>({ ...character.outfit });
  const [previewDir, setPreviewDir] = useState<Direction>(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    const draw = (now: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const bg = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height * 0.45,
            20,
            canvas.width / 2,
            canvas.height * 0.45,
            220
          );
          if (mode === 'shop') {
            bg.addColorStop(0, '#eef2ff');
            bg.addColorStop(1, '#c7d2fe');
          } else {
            bg.addColorStop(0, '#fffbeb');
            bg.addColorStop(1, '#fde68a');
          }
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = mode === 'shop' ? '#4f46e5' : '#d97706';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(canvas.width / 2, canvas.height - 46, 86, 22, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          drawAvatar(ctx, {
            character: {
              ...character,
              outfit: draftOutfit,
            },
            x: canvas.width / 2,
            y: canvas.height - 48,
            scale: 0.54,
            direction: previewDir,
            isMoving: false,
            nowMs: now,
          });
        }
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [character, draftOutfit, previewDir, mode]);

  const slotItems = getItemsBySlot(activeSlot);

  const handleSelectItem = (itemId: string) => {
    setDraftOutfit((prev) => ({
      ...prev,
      [activeSlot]: itemId,
    }));
  };

  const handleClearAll = () => {
    setDraftOutfit({
      hat: 'none',
      top: 'none',
      bottom: 'none',
      shoes: 'none',
      accessory: 'none',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white rounded-3xl border-4 border-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b-4 border-slate-900 flex items-center justify-between gap-4 ${
            mode === 'shop' ? 'bg-indigo-600 text-white' : 'bg-amber-400 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {mode === 'shop' ? (
              <ShoppingBag className="w-6 h-6 text-amber-300 shrink-0" />
            ) : (
              <Shirt className="w-6 h-6 text-slate-900 shrink-0" />
            )}
            <div>
              <h2 className="text-xl font-extrabold leading-tight">
                {mode === 'shop' ? 'Каталог одежды «Dog Style»' : 'Мой гардероб'}
              </h2>
              <p
                className={`text-xs font-bold ${
                  mode === 'shop' ? 'text-indigo-100' : 'text-amber-950'
                }`}
              >
                {mode === 'shop'
                  ? 'Примеряйте любую одежду и обувь, соберите полный образ и сохраните его!'
                  : 'Переодевайтесь в любой момент — все игроки увидят изменения сразу'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left: Live 8-way Preview */}
          <div className="md:col-span-5 bg-slate-50 p-5 border-b-4 md:border-b-0 md:border-r-4 border-slate-900 flex flex-col items-center justify-between">
            <div className="w-full max-w-[270px] aspect-[3/4] rounded-2xl overflow-hidden border-3 border-slate-900 shadow-inner">
              <canvas ref={canvasRef} width={280} height={370} className="w-full h-full" />
            </div>

            <div className="w-full flex items-center justify-between gap-2 mt-4">
              <button
                type="button"
                onClick={() => setPreviewDir((d) => (((d + 7) % 8) as Direction))}
                className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-900 font-bold text-xs text-slate-900 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Влево
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 border-2 border-slate-900 font-bold text-xs text-slate-900 cursor-pointer whitespace-nowrap"
              >
                Снять всё
              </button>
              <button
                type="button"
                onClick={() => setPreviewDir((d) => (((d + 1) % 8) as Direction))}
                className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-900 font-bold text-xs text-slate-900 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Вправо
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Category Tabs & Items */}
          <div className="md:col-span-7 flex flex-col overflow-hidden">
            {/* Slot Tabs */}
            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-100 border-b-2 border-slate-200">
              {SLOTS_ORDER.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setActiveSlot(slot)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeSlot === slot
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
                  }`}
                >
                  {SLOT_LABELS[slot]}
                </button>
              ))}
            </div>

            {/* Items Grid */}
            <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
              {slotItems.map((item) => {
                const isSelected = draftOutfit[activeSlot] === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item.id)}
                    className={`flex items-center justify-between gap-3 p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 bg-amber-100 shadow-[0_2px_0_#0f172a]'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-9 h-9 rounded-xl border-2 border-slate-900 shrink-0 flex items-center justify-center text-xs font-extrabold"
                        style={{
                          backgroundColor:
                            item.color === 'transparent' ? '#f1f5f9' : item.color,
                          color: item.color === 'transparent' ? '#64748b' : '#ffffff',
                        }}
                      >
                        {item.id === 'none' ? '∅' : ''}
                      </span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 truncate">
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-600 line-clamp-1">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-6 h-6 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-slate-950" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Save Bar */}
            <div className="p-4 bg-slate-50 border-t-2 border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 font-bold text-sm text-slate-700 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => onSaveOutfit(draftOutfit)}
                className="px-6 py-2.5 rounded-xl border-2 border-slate-900 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 font-extrabold text-sm text-slate-950 shadow-[0_3px_0_#0f172a] flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {saving
                  ? 'Сохраняем...'
                  : mode === 'shop'
                  ? 'Сохранить образ из Dog Style'
                  : 'Надеть и сохранить'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
