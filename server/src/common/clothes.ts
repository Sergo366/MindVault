export const SEASONS = [
  'Winter',
  'Spring',
  'Summer',
  'Autumn',
  'All seasons',
] as const;
export type Season = (typeof SEASONS)[number];

export const CATEGORY_TYPES = {
  Tops: 'Tops',
  Bottoms: 'Bottoms',
  Dresses: 'Dresses',
  Outerwear: 'Outerwear',
  Footwear: 'Footwear',
  Accessories: 'Accessories',
  FullBody: 'Full Body',
  Other: 'Other',
} as const;

export type Category = (typeof CATEGORY_TYPES)[keyof typeof CATEGORY_TYPES];

export const CATEGORIES = Object.values(CATEGORY_TYPES) as Category[];

export const TYPES = {
  [CATEGORY_TYPES.Tops]: [
    'T-Shirt',
    'Polo',
    'Shirt',
    'Blouse',
    'Sweater',
    'Hoodie',
    'Top',
    'Other',
  ],
  [CATEGORY_TYPES.Bottoms]: [
    'Pants',
    'Jeans',
    'Shorts',
    'Skirt',
    'Leggings',
    'Other',
  ],
  [CATEGORY_TYPES.Outerwear]: [
    'Jacket',
    'Coat',
    'Trench',
    'Vest',
    'Down Jacket',
    'Other',
  ],
  [CATEGORY_TYPES.Footwear]: [
    'Sneakers',
    'Boots',
    'Shoes',
    'Sandals',
    'Heels',
    'Slippers',
    'Other',
  ],
  [CATEGORY_TYPES.Dresses]: ['Dress', 'Jumpsuit', 'Romper', 'Gown', 'Other'],
  [CATEGORY_TYPES.Accessories]: [
    'Hat',
    'Scarf',
    'Gloves',
    'Bag',
    'Belt',
    'Jewelry',
    'Glasses',
    'Other',
  ],
  [CATEGORY_TYPES.FullBody]: ['Suit', 'Tracksuit', 'Other'],
  [CATEGORY_TYPES.Other]: ['Underwear', 'Socks', 'Swimwear', 'Other'],
} as const;

export type ClothingType<C extends Category> = (typeof TYPES)[C][number];

export const defaultFormValues = {
  title: '',
  userTitle: '',
  category: '' as Category | '',
  type: '',
  seasons: [] as string[],
};
