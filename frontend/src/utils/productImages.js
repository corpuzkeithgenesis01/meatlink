// Real product photos bundled locally, with vector illustrations as a fallback.
// No external image host is needed, so they also work offline in the PWA.

const PHOTOS = {
  wholeChicken: '/images/whole-chicken.jpg',
  chickenBreast: '/images/chicken-breast.jpg',
  chickenWings: '/images/chicken-wings.jpg',
  porkBelly: '/images/pork-belly.jpg',
  porkChop: '/images/pork-chop.jpg',
  groundPork: '/images/ground-pork.jpg',
};

const ILLUSTRATIONS = {
  wholeChicken: '/images/whole-chicken.svg',
  chickenBreast: '/images/chicken-breast.svg',
  chickenWings: '/images/chicken-wings.svg',
  porkBelly: '/images/pork-belly.svg',
  porkChop: '/images/pork-chop.svg',
  groundPork: '/images/ground-pork.svg',
};

const MATCHERS = [
  { pattern: /whole|lechon|manok buo/i, key: 'wholeChicken' },
  { pattern: /breast|fillet|dibdib|pecho/i, key: 'chickenBreast' },
  { pattern: /wing|pakpak/i, key: 'chickenWings' },
  { pattern: /belly|liempo|samgyeopsal/i, key: 'porkBelly' },
  { pattern: /chop|cutlet|steak|babet/i, key: 'porkChop' },
  { pattern: /ground|mince|giniling/i, key: 'groundPork' },
];

function imageKey(product = {}) {
  if (product.image_url) return null;

  const name = String(product.name || product.product_name || '');
  const match = MATCHERS.find((m) => m.pattern.test(name));
  if (match) return match.key;

  const category = String(product.category || '').toLowerCase();
  if (category.includes('pork') || /pork|babo|liempo/i.test(name)) return 'porkBelly';
  return 'wholeChicken';
}

export function productImage(product = {}) {
  if (product.image_url) return product.image_url;
  return PHOTOS[imageKey(product)];
}

export function productImageFallback(product = {}) {
  if (product.image_url) return null;
  return ILLUSTRATIONS[imageKey(product)];
}

export function productEmoji(product = {}) {
  const category = String(product.category || '').toLowerCase();
  const name = String(product.name || product.product_name || '');
  if (category.includes('pork') || /pork|liempo|babo/i.test(name)) return '🥩';
  return '🍗';
}
