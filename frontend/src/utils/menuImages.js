/**
 * Frontend image mapping for menu items.
 * Purely frontend - zero backend changes.
 */

const FOOD_IMAGES = {
  'vada pav': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&auto=format&fit=crop&q=80',
  'gulab jamun': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
  'chicken manchuria': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80',
  'chicken manchurian': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80',
  'french fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
  'fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
  'veg manchuria': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
  'veg manchurian': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
  'assorted cooldrinks': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
  'cool drinks': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
  'cooldrinks': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
  'butter milk': 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80',
  'buttermilk': 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80',
  'regular tea': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
  'tea': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
  'choco chip cookies': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80',
  'chocolate chip cookies': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80',
  'chocolate brownie': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
  'brownie': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
  'chocolate ice cream': 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&auto=format&fit=crop&q=80',
  'ice cream': 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&auto=format&fit=crop&q=80'
};

export const getMenuItemImage = (itemName) => {
  if (!itemName) return null;
  const cleanName = itemName.toLowerCase().trim();
  
  if (FOOD_IMAGES[cleanName]) {
    return FOOD_IMAGES[cleanName];
  }
  
  for (const [key, url] of Object.entries(FOOD_IMAGES)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return url;
    }
  }
  
  return null;
};
