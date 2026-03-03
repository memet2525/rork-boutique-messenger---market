const DOMAIN = "butikbiz.com";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getStoreLink(storeName: string): string {
  const slug = slugify(storeName);
  return `https://${DOMAIN}/store/${slug}`;
}

export function getAddressFormLink(storeName: string): string {
  const slug = slugify(storeName);
  return `https://${DOMAIN}/store/${slug}/form`;
}

export function getProductLink(productName: string, storeName?: string): string {
  const productSlug = slugify(productName);
  if (storeName) {
    const storeSlug = slugify(storeName);
    return `https://${DOMAIN}/store/${storeSlug}/${productSlug}`;
  }
  return `https://${DOMAIN}/store/${productSlug}`;
}
