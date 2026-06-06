import { WasteType } from '@prisma/client';

export const POINTS_PER_KG: Record<WasteType, number> = {
  [WasteType.PLASTIC]: 10,
  [WasteType.PAPER]: 5,
  [WasteType.CARDBOARD]: 8,
  [WasteType.METAL]: 20,
  [WasteType.BATTERY]: 50,
  [WasteType.CLOTHES]: 15,
  [WasteType.SHOES]: 25,
};
