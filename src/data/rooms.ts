import { RoomConfig, RoomId } from '../types/game';

export const WORLD_WIDTH = 1348;
export const WORLD_HEIGHT = 784;

export const ROOMS: Record<RoomId, RoomConfig> = {
  central: {
    id: 'central',
    name: 'Центральная улица',
    subtitle: 'Главная площадь города: Кафе, бутик Dog Style и Пёс-стилист Арчи',
    bgImage: '/assets/aistudio/________________92594eb2.jpg',
    walkablePolygon: [
      { x: 402, y: 325 },
      { x: 458, y: 325 },
      { x: 495, y: 382 },
      { x: 605, y: 405 },
      { x: 835, y: 408 },
      { x: 975, y: 412 },
      { x: 916, y: 495 },
      { x: 964, y: 576 },
      { x: 1136, y: 608 },
      { x: 1192, y: 564 },
      { x: 1326, y: 584 },
      { x: 1326, y: 752 },
      { x: 1090, y: 768 },
      { x: 210, y: 768 },
      { x: 24, y: 748 },
      { x: 24, y: 565 },
      { x: 164, y: 554 },
      { x: 416, y: 494 },
      { x: 494, y: 452 },
      { x: 428, y: 386 },
    ],
    entrances: [
      {
        id: 'enter_cafe',
        label: 'Войти в Кафе',
        targetRoom: 'cafe',
        rect: { x: 12, y: 272, w: 116, h: 192 },
        walkTarget: { x: 112, y: 565 },
        spawnPoint: { x: 1085, y: 615 },
      },
      {
        id: 'enter_shop',
        label: 'Магазин «Dog Style»',
        targetRoom: 'shop',
        rect: { x: 646, y: 274, w: 126, h: 124 },
        walkTarget: { x: 710, y: 412 },
        spawnPoint: { x: 674, y: 668 },
      },
      {
        id: 'enter_next_street',
        label: 'Следующая улица',
        targetRoom: 'next_street',
        rect: { x: 1185, y: 575, w: 105, h: 90 },
        walkTarget: { x: 1236, y: 622 },
        spawnPoint: { x: 170, y: 600 },
        shape: 'circle',
      },
    ],
    defaultSpawn: { x: 565, y: 605 },
    scaleRange: { minY: 325, maxY: 765, minScale: 0.24, maxScale: 0.45 },
  },

  cafe: {
    id: 'cafe',
    name: 'Кафе «Тёплая лапка»',
    subtitle: 'Уютная кофейня с ароматом круассанов и живыми разговорами',
    walkablePolygon: [
      { x: 370, y: 465 },
      { x: 1040, y: 465 },
      { x: 1220, y: 560 },
      { x: 1220, y: 740 },
      { x: 130, y: 740 },
      { x: 130, y: 575 },
      { x: 320, y: 530 },
    ],
    entrances: [
      {
        id: 'exit_cafe_to_central',
        label: 'Выйти на Центральную улицу',
        targetRoom: 'central',
        rect: { x: 1125, y: 315, w: 140, h: 255 },
        walkTarget: { x: 1175, y: 595 },
        spawnPoint: { x: 145, y: 585 },
      },
    ],
    defaultSpawn: { x: 720, y: 610 },
    scaleRange: { minY: 465, maxY: 740, minScale: 0.34, maxScale: 0.48 },
  },

  shop: {
    id: 'shop',
    name: 'Магазин «Dog Style»',
    subtitle: 'Модный бутик одежды, обуви и аксессуаров',
    walkablePolygon: [
      { x: 220, y: 465 },
      { x: 1128, y: 465 },
      { x: 1225, y: 590 },
      { x: 1225, y: 740 },
      { x: 125, y: 740 },
      { x: 125, y: 590 },
    ],
    entrances: [
      {
        id: 'exit_shop_to_central',
        label: 'Выйти на Центральную улицу',
        targetRoom: 'central',
        rect: { x: 594, y: 675, w: 160, h: 90 },
        walkTarget: { x: 674, y: 710 },
        spawnPoint: { x: 710, y: 448 },
      },
    ],
    defaultSpawn: { x: 674, y: 635 },
    scaleRange: { minY: 465, maxY: 740, minScale: 0.35, maxScale: 0.48 },
  },

  next_street: {
    id: 'next_street',
    name: 'Солнечный бульвар',
    subtitle: 'Тихий сквер с фонтаном и цветущими деревьями',
    walkablePolygon: [
      { x: 95, y: 430 },
      { x: 520, y: 420 },
      { x: 520, y: 525 },
      { x: 830, y: 525 },
      { x: 830, y: 420 },
      { x: 1255, y: 430 },
      { x: 1295, y: 748 },
      { x: 55, y: 748 },
    ],
    entrances: [
      {
        id: 'back_to_central',
        label: 'Вернуться на Центральную улицу',
        targetRoom: 'central',
        rect: { x: 45, y: 540, w: 115, h: 95 },
        walkTarget: { x: 112, y: 590 },
        spawnPoint: { x: 1165, y: 635 },
        shape: 'circle',
      },
    ],
    defaultSpawn: { x: 240, y: 615 },
    scaleRange: { minY: 420, maxY: 748, minScale: 0.29, maxScale: 0.47 },
  },
};

export const DOG_STYLE_STAND_RECT = { x: 554, y: 240, w: 240, h: 215 };
