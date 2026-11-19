import { Outfit, OutfitSlot, Race } from '../types/game';

export interface PhenotypeOption {
  id: string;
  label: string;
  swatch: string;
  secondarySwatch?: string;
}

export const RACE_LABELS: Record<Race, string> = {
  dog: 'Собака',
  cat: 'Кот',
  rabbit: 'Кролик',
};

export const PHENOTYPES_BY_RACE: Record<Race, PhenotypeOption[]> = {
  dog: [
    { id: 'pheno0', label: 'Фенотип 0 (Рыже-белый)', swatch: '#df9d66', secondarySwatch: '#574a44' },
    { id: 'spotted', label: 'Пятнистый', swatch: '#f3ede4', secondarySwatch: '#3b3330' },
    { id: 'chocolate', label: 'Шоколадный', swatch: '#6d4534', secondarySwatch: '#3a2219' },
    { id: 'white', label: 'Белый', swatch: '#f6f5f2', secondarySwatch: '#c4b8ad' },
  ],
  cat: [
    { id: 'gray', label: 'Серый', swatch: '#8b95a5', secondarySwatch: '#475569' },
    { id: 'ginger', label: 'Рыжий', swatch: '#e58e49', secondarySwatch: '#b45309' },
    { id: 'black', label: 'Черный', swatch: '#2b2d36', secondarySwatch: '#181920' },
    { id: 'white', label: 'Белый', swatch: '#f8fafc', secondarySwatch: '#cbd5e1' },
  ],
  rabbit: [
    { id: 'gray', label: 'Серый', swatch: '#9ca3af', secondarySwatch: '#6b7280' },
    { id: 'ginger', label: 'Рыжий', swatch: '#e2955a', secondarySwatch: '#c26d35' },
    { id: 'black', label: 'Черный', swatch: '#313038', secondarySwatch: '#1f1e24' },
    { id: 'white', label: 'Белый', swatch: '#ffffff', secondarySwatch: '#fbcfe8' },
  ],
};

export interface ClothingItem {
  id: string;
  slot: OutfitSlot;
  label: string;
  color: string;
  accentColor: string;
  description: string;
}

export const SLOT_LABELS: Record<OutfitSlot, string> = {
  hat: 'Шапки',
  top: 'Верх',
  bottom: 'Штаны/Юбки',
  shoes: 'Обувь',
  accessory: 'Аксессуары',
};

export const CLOTHING_CATALOG: ClothingItem[] = [
  // Обувь (shoes)
  { id: 'none', slot: 'shoes', label: 'Босиком', color: 'transparent', accentColor: '#94a3b8', description: 'Естественные лапки без обуви' },
  { id: 'sneakers_red', slot: 'shoes', label: 'Кеды', color: '#dc2626', accentColor: '#f8fafc', description: 'Классические красные кеды с белым мыском' },
  { id: 'runners_blue', slot: 'shoes', label: 'Кроссовки', color: '#2563eb', accentColor: '#38bdf8', description: 'Спортивные кроссовки для прогулок по улице' },
  { id: 'boots_brown', slot: 'shoes', label: 'Сапоги', color: '#78350f', accentColor: '#d97706', description: 'Высокие стильные сапоги с отворотом' },
  { id: 'oxfords_black', slot: 'shoes', label: 'Ботинки', color: '#1e293b', accentColor: '#64748b', description: 'Крепкие городские ботинки на шнуровке' },

  // Низ (bottom)
  { id: 'none', slot: 'bottom', label: 'Без низа', color: 'transparent', accentColor: '#94a3b8', description: 'Без штанов и юбки' },
  { id: 'pants_gray', slot: 'bottom', label: 'Штаны', color: '#475569', accentColor: '#334155', description: 'Удобные повседневные штаны' },
  { id: 'jeans_blue', slot: 'bottom', label: 'Джинсы', color: '#2b5b84', accentColor: '#f59e0b', description: 'Плотные голубые джинсы с контрастной строчкой' },
  { id: 'shorts_khaki', slot: 'bottom', label: 'Шорты', color: '#b48a5a', accentColor: '#785630', description: 'Летние свободные шорты' },
  { id: 'skirt_fluffy', slot: 'bottom', label: 'Пышная юбка', color: '#ec4899', accentColor: '#fbcfe8', description: 'Пышная яркая юбка со складками' },
  { id: 'skirt_straight', slot: 'bottom', label: 'Прямая юбка', color: '#312e81', accentColor: '#818cf8', description: 'Элегантная прямая юбка' },

  // Верх (top)
  { id: 'none', slot: 'top', label: 'Без верха', color: 'transparent', accentColor: '#94a3b8', description: 'Без верхней одежды' },
  { id: 'tshirt_teal', slot: 'top', label: 'Футболка', color: '#0d9488', accentColor: '#fde047', description: 'Яркая бирюзовая футболка со звездой' },
  { id: 'hoodie_purple', slot: 'top', label: 'Худи', color: '#7c3aed', accentColor: '#ddd6fe', description: 'Мягкое худи с капюшоном и карманом' },
  { id: 'jacket_denim', slot: 'top', label: 'Куртка', color: '#b91c1c', accentColor: '#f8fafc', description: 'Стильная университетская куртка' },
  { id: 'blazer_navy', slot: 'top', label: 'Пиджак', color: '#1e3a8a', accentColor: '#fbbf24', description: 'Классический приталенный пиджак' },
  { id: 'sweater_cream', slot: 'top', label: 'Свитер', color: '#ea580c', accentColor: '#fef3c7', description: 'Уютный вязаный полосатый свитер' },

  // Головные уборы (hat)
  { id: 'none', slot: 'hat', label: 'Без шапки', color: 'transparent', accentColor: '#94a3b8', description: 'Без головного убора' },
  { id: 'cap_red', slot: 'hat', label: 'Кепка', color: '#ef4444', accentColor: '#ffffff', description: 'Спортивная кепка с козырьком' },
  { id: 'crown_gold', slot: 'hat', label: 'Корона', color: '#f59e0b', accentColor: '#ef4444', description: 'Золотая корона с самоцветами' },
  { id: 'ushanka_brown', slot: 'hat', label: 'Ушанка', color: '#854d0e', accentColor: '#fef08a', description: 'Тёплая меховая шапка-ушанка' },
  { id: 'glasses_cool', slot: 'hat', label: 'Очки', color: '#111827', accentColor: '#38bdf8', description: 'Модные тёмные очки' },

  // Аксессуары (accessory)
  { id: 'none', slot: 'accessory', label: 'Без аксессуара', color: 'transparent', accentColor: '#94a3b8', description: 'Без аксессуаров' },
  { id: 'scarf_red', slot: 'accessory', label: 'Шарф', color: '#e11d48', accentColor: '#ffe4e6', description: 'Вязаный уютный шарф' },
  { id: 'collar_bone', slot: 'accessory', label: 'Ошейник с золотой косточкой', color: '#0284c7', accentColor: '#fbbf24', description: 'Фирменный ошейник бутика Dog Style' },
  { id: 'backpack_green', slot: 'accessory', label: 'Рюкзак', color: '#15803d', accentColor: '#bbf7d0', description: 'Городской рюкзак путешественника' },
];

export function getItemsBySlot(slot: OutfitSlot): ClothingItem[] {
  return CLOTHING_CATALOG.filter((item) => item.slot === slot);
}

export function getItemLabel(slot: OutfitSlot, id: string): string {
  return CLOTHING_CATALOG.find((i) => i.slot === slot && i.id === id)?.label ?? 'Нет';
}

export function getOutfitLabels(outfit: Outfit) {
  return {
    hat: getItemLabel('hat', outfit.hat),
    top: getItemLabel('top', outfit.top),
    bottom: getItemLabel('bottom', outfit.bottom),
    shoes: getItemLabel('shoes', outfit.shoes),
    accessory: getItemLabel('accessory', outfit.accessory),
  };
}

export interface StarterPreset {
  id: string;
  label: string;
  description: string;
  outfit: Outfit;
}

export const STARTER_PRESETS: StarterPreset[] = [
  {
    id: 'naked',
    label: 'Без одежды',
    description: 'Начать налегке и подобрать наряд позже',
    outfit: { hat: 'none', top: 'none', bottom: 'none', shoes: 'none', accessory: 'none' },
  },
  {
    id: 'casual',
    label: 'Футболка, джинсы и кеды',
    description: 'Классический городской образ для прогулок',
    outfit: { hat: 'none', top: 'tshirt_teal', bottom: 'jeans_blue', shoes: 'sneakers_red', accessory: 'none' },
  },
  {
    id: 'sport',
    label: 'Худи, шорты и кроссовки',
    description: 'Свободный спортивный стиль с кепкой',
    outfit: { hat: 'cap_red', top: 'hoodie_purple', bottom: 'shorts_khaki', shoes: 'runners_blue', accessory: 'none' },
  },
];

export const QUICK_EMOTES = [
  { id: 'wave', emoji: '👋', label: 'Привет' },
  { id: 'heart', emoji: '❤️', label: 'Сердечко' },
  { id: 'laugh', emoji: '😂', label: 'Смех' },
  { id: 'dance', emoji: '💃', label: 'Танец' },
] as const;

export const NPC_STYLIST = {
  uid: 'npc_stylist_archie',
  name: 'Пёс-стилист Арчи',
  x: 842,
  y: 446,
  direction: 1 as const,
  race: 'dog' as const,
  phenotype: 'pheno0',
  outfit: {
    hat: 'cap_red',
    top: 'jacket_denim',
    bottom: 'jeans_blue',
    shoes: 'runners_blue',
    accessory: 'scarf_red',
  },
};
