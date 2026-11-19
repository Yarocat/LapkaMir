import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, RotateCw, Lock, Check, Sparkles } from 'lucide-react';
import { drawAvatar, preloadDogSprites } from '../canvas/avatarRenderer';
import {
  PHENOTYPES_BY_RACE,
  RACE_LABELS,
  STARTER_PRESETS,
} from '../data/catalog';
import { CharacterConfig, Direction, Gender, Race } from '../types/game';

interface CharacterCreatorProps {
  initialCharacter?: CharacterConfig;
  isEditingExisting?: boolean;
  saving?: boolean;
  onSave: (config: CharacterConfig) => void;
  onCancel?: () => void;
}

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({
  initialCharacter,
  isEditingExisting = false,
  saving = false,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialCharacter?.name ?? '');
  const [gender] = useState<Gender>('male');
  const [race, setRace] = useState<Race>(initialCharacter?.race ?? 'dog');
  const [phenotype, setPhenotype] = useState<string>(
    initialCharacter?.phenotype ?? 'pheno0'
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>('casual');
  const [outfit, setOutfit] = useState(
    initialCharacter?.outfit ?? STARTER_PRESETS[1].outfit
  );
  const [previewDir, setPreviewDir] = useState<Direction>(1);
  const [isWalkingPreview, setIsWalkingPreview] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    preloadDogSprites();
  }, []);

  const handleRaceChange = (nextRace: Race) => {
    setRace(nextRace);
    const options = PHENOTYPES_BY_RACE[nextRace];
    setPhenotype(options[0].id);
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = STARTER_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setOutfit({ ...preset.outfit });
    }
  };

  useEffect(() => {
    let rafId = 0;
    const renderLoop = (now: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Studio pedestal background
          const grad = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height * 0.45,
            20,
            canvas.width / 2,
            canvas.height * 0.45,
            240
          );
          grad.addColorStop(0, '#fffbeb');
          grad.addColorStop(1, '#fde68a');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Studio platform disc
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(canvas.width / 2, canvas.height - 52, 95, 24, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          drawAvatar(ctx, {
            character: {
              name: name.trim() || 'Новичок',
              gender,
              race,
              phenotype,
              outfit,
            },
            x: canvas.width / 2,
            y: canvas.height - 55,
            scale: 0.56,
            direction: previewDir,
            isMoving: isWalkingPreview,
            nowMs: now,
            isLocalPlayer: false,
          });
        }
      }
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [name, gender, race, phenotype, outfit, previewDir, isWalkingPreview]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Введите отображаемое имя персонажа.');
      return;
    }
    if (trimmed.length > 24) {
      setNameError('Имя не должно превышать 24 символа.');
      return;
    }
    setNameError(null);
    onSave({
      name: trimmed,
      gender,
      race,
      phenotype,
      outfit,
    });
  };

  const phenotypes = PHENOTYPES_BY_RACE[race];

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-slate-900 overflow-y-auto">
      <div
        className="fixed inset-0 bg-cover bg-center opacity-35 blur-[4px]"
        style={{ backgroundImage: 'url(/assets/aistudio/________________92594eb2.jpg)' }}
      />

      <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl border-4 border-slate-900 shadow-2xl overflow-hidden my-4">
        <div className="bg-amber-400 px-6 py-4 border-b-4 border-slate-900 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {isEditingExisting ? 'Изменить внешность персонажа' : 'Конструктор персонажа'}
            </h2>
            <p className="text-sm font-bold text-amber-950">
              Настройте имя, расу, окрас и стартовый стиль перед выходом на улицу
            </p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-900 font-bold text-sm text-slate-900 cursor-pointer whitespace-nowrap"
            >
              Назад в игру
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12">
          {/* Left: Live Animated Preview */}
          <div className="md:col-span-5 bg-amber-50 p-6 border-b-4 md:border-b-0 md:border-r-4 border-slate-900 flex flex-col items-center justify-between">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                Живое превью (8 ракурсов)
              </span>
              <button
                type="button"
                onClick={() => setIsWalkingPreview((v) => !v)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border-2 border-slate-900 cursor-pointer transition-colors ${
                  isWalkingPreview ? 'bg-emerald-400 text-slate-950' : 'bg-white text-slate-800'
                }`}
              >
                {isWalkingPreview ? 'Ходьба: ВКЛ' : 'Покой'}
              </button>
            </div>

            <div className="w-full max-w-[300px] aspect-[3/4] rounded-2xl overflow-hidden border-3 border-slate-900 shadow-inner bg-amber-100">
              <canvas ref={canvasRef} width={320} height={410} className="w-full h-full" />
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => setPreviewDir((d) => (((d + 7) % 8) as Direction))}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-900 font-bold text-sm text-slate-900 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Повернуть
              </button>
              <button
                type="button"
                onClick={() => setPreviewDir((d) => (((d + 1) % 8) as Direction))}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-900 font-bold text-sm text-slate-900 cursor-pointer"
              >
                Повернуть
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="md:col-span-7 p-6 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-extrabold text-slate-900 mb-1.5">
                Имя персонажа *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например, Барсик или Спарки"
                maxLength={24}
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 focus:border-slate-900 focus:outline-none font-bold text-slate-900 bg-slate-50"
              />
              {nameError && <p className="text-xs font-bold text-rose-600 mt-1">{nameError}</p>}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-extrabold text-slate-900 mb-1.5">Пол</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  className="py-2.5 px-4 rounded-xl border-2 border-slate-900 bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  Мужской
                </button>
                <button
                  type="button"
                  disabled
                  title="Женский персонаж появится в ближайшем обновлении"
                  className="py-2.5 px-4 rounded-xl border-2 border-slate-200 bg-slate-100 text-slate-400 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Женский (Скоро)
                </button>
              </div>
            </div>

            {/* Race */}
            <div>
              <label className="block text-sm font-extrabold text-slate-900 mb-1.5">Раса</label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['dog', 'cat', 'rabbit'] as Race[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRaceChange(r)}
                    className={`py-2.5 px-3 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer ${
                      race === r
                        ? 'border-slate-900 bg-amber-300 text-slate-950 shadow-[0_2px_0_#0f172a]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {RACE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            {/* Phenotype */}
            <div>
              <label className="block text-sm font-extrabold text-slate-900 mb-1.5">
                Фенотип (окрас)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {phenotypes.map((ph) => (
                  <button
                    key={ph.id}
                    type="button"
                    onClick={() => setPhenotype(ph.id)}
                    className={`flex items-center gap-2.5 py-2 px-3 rounded-xl border-2 text-left text-xs font-bold transition-all cursor-pointer ${
                      phenotype === ph.id
                        ? 'border-slate-900 bg-amber-100 text-slate-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border-2 border-slate-900 shrink-0"
                      style={{ backgroundColor: ph.swatch }}
                    />
                    <span className="truncate">{ph.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Starter Outfit */}
            {!isEditingExisting && (
              <div>
                <label className="block text-sm font-extrabold text-slate-900 mb-1.5">
                  Стартовый комплект одежды
                </label>
                <div className="space-y-2">
                  {STARTER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetChange(preset.id)}
                      className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        selectedPresetId === preset.id
                          ? 'border-slate-900 bg-emerald-100 text-slate-950'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">{preset.label}</div>
                        <div className="text-xs text-slate-600">{preset.description}</div>
                      </div>
                      {selectedPresetId === preset.id && (
                        <Check className="w-5 h-5 text-emerald-700 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 px-6 bg-emerald-400 hover:bg-emerald-300 active:translate-y-0.5 disabled:opacity-60 text-slate-950 font-extrabold text-base rounded-2xl border-2 border-slate-900 shadow-[0_3px_0_#0f172a] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              {saving
                ? 'Сохраняем персонажа...'
                : isEditingExisting
                ? 'Сохранить изменения'
                : 'Сохранить и войти на Центральную улицу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
