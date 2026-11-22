// Local illustrations used for product cards, cart items and order history.
// No external image host is needed, so they also work offline in the PWA.

const IMAGES = {
  wholeChicken: '/images/whole-chicken.svg',
  chickenBreast: '/images/chicken-breast.svg',
  chickenWings: '/images/chicken-wings.svg',
  porkBelly: '/images/pork-belly.svg',
  porkChop: '/images/pork-chop.svg',
  groundPork: '/images/ground-pork.svg',
};

const MATCHERS = [
  { pattern: /whole|buwisit|lechon|manok buo/i, src: IMAGES.wholeChicken },
  { pattern: /breast|fillet|dibdib|pecho/i, src: IMAGES.chickenBreast },
  { pattern: /wing|pakpak/i, src: IMAGES.chickenWings },
  { pattern: /belly|liempo|samgyeopsal/i, src: IMAGES.porkBelly },
  { pattern: /chop|cutlet|steak|babet/i, src: IMAGES.porkChop },
  { pattern: /ground|mince|giniling|pork kasim/i, src: IMAGES.groundPork },
];

const CHICKEN_FALLBACK = IMAGES.wholeChicken;
const PORK_FALLBACK = IMAGES.porkBelly;

export function productImage(product = {}) {
  if (product.image_url) return product.image_url;

  const name = String(product.name || product.product_name || '');
  const match = MATCHERS.find((m) => m.pattern.test(name));
  if (match) return match.src;

  const category = String(product.category || '').toLowerCase();
  if (category.includes('pork') || /pork|babo|liempo/i.test(name)) {
    return PORK_FALLBACK;
  }
  return CHICKEN_FALLBACK;
}

export function productEmoji(product = {}) {
  const category = String(product.category || '').toLowerCase();
  const name = String(product.name || product.product_name || '');
  if (category.includes('pork') || /pork|liempo|babo/i.test(name)) return '🥩';
  return '🍗';
}
