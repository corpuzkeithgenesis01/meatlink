// Real product photos bundled locally, with vector illustrations as a fallback.
// No external image host is needed, so they also work offline in the PWA.

const IMAGES = {
  wholeChicken: { photo: '/images/whole-chicken.jpg', art: '/images/whole-chicken.svg' },
  chickenBreast: { photo: '/images/chicken-breast.jpg', art: '/images/chicken-breast.svg' },
  chickenWings: { photo: '/images/chicken-wings.jpg', art: '/images/chicken-wings.svg' },
  chickenSkin: { photo: '/images/chicken-skin.jpg', art: '/images/chicken-breast.svg' },
  chickenFeet: { photo: '/images/chicken-feet.jpg', art: '/images/whole-chicken.svg' },
  porkBelly: { photo: '/images/pork-belly.jpg', art: '/images/pork-belly.svg' },
  porkChop: { photo: '/images/pork-chop.jpg', art: '/images/pork-chop.svg' },
  groundPork: { photo: '/images/ground-pork.jpg', art: '/images/ground-pork.svg' },
  porkCuts: { photo: '/images/pork-cuts.jpg', art: '/images/pork-belly.svg' },
};

const MATCHERS = [
  { pattern: /whole|lechon|manok buo/i, key: 'wholeChicken' },
  { pattern: /skin|kawa/i, key: 'chickenSkin' },
  { pattern: /feet|paws|paa/i, key: 'chickenFeet' },
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
  if (category.includes('pork') || /pork|babo|liempo/i.test(name)) return 'porkCuts';
  return 'wholeChicken';
}

export function productImage(product = {}) {
  if (product.image_url) return product.image_url;
  return IMAGES[imageKey(product)].photo;
}

// Used if a photo file is missing (e.g. an incomplete deploy).
export function productImageFallback(product = {}) {
  if (product.image_url) return null;
  return IMAGES[imageKey(product)].art;
}

export function productEmoji(product = {}) {
  const category = String(product.category || '').toLowerCase();
  const name = String(product.name || product.product_name || '');
  if (category.includes('pork') || /pork|liempo|babo/i.test(name)) return '🥩';
  return '🍗';
}
