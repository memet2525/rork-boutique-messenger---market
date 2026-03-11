const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp();
const db = admin.firestore();

const BOT_UA_REGEX = /facebookexternalhit|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Googlebot|bingbot|Discordbot|Baiduspider|YandexBot|Pinterestbot|redditbot|Applebot|Embedly|Quora Link Preview|Showyoubot|outbrain|vkShare|W3C_Validator|kakaotalk-scrap|developers\.google\.com\/\+\/web\/snippet/i;

const https = require("https");

let cachedIndexHtml = null;
const FIREBASE_APP_DOMAIN = "butikbiz-66195.web.app";

function fetchFromUrl(url) {
  return new Promise((resolve, reject) => {
    const makeRequest = (reqUrl, redirectCount) => {
      if (redirectCount > 3) {
        reject(new Error("Too many redirects"));
        return;
      }
      const reqModule = reqUrl.startsWith("https") ? https : require("http");
      reqModule.get(reqUrl, { timeout: 5000 }, (resp) => {
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          makeRequest(resp.headers.location, redirectCount + 1);
          return;
        }
        if (resp.statusCode !== 200) {
          reject(new Error(`Status ${resp.statusCode}`));
          return;
        }
        let data = "";
        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () => resolve(data));
      }).on("error", reject).on("timeout", () => reject(new Error("Timeout")));
    };
    makeRequest(url, 0);
  });
}

async function getIndexHtml() {
  if (cachedIndexHtml) return cachedIndexHtml;
  
  const localPaths = [
    path.join(__dirname, "..", "dist", "index.html"),
    path.join(__dirname, "index.html"),
    path.join(__dirname, "..", "web-build", "index.html"),
  ];
  
  for (const p of localPaths) {
    try {
      cachedIndexHtml = fs.readFileSync(p, "utf8");
      console.log("Found index.html at:", p);
      return cachedIndexHtml;
    } catch (e) { } // eslint-disable-line no-unused-vars
  }
  
  const urls = [
    `https://${FIREBASE_APP_DOMAIN}/index.html`,
    `https://${DOMAIN}/index.html`,
  ];
  
  for (const url of urls) {
    try {
      cachedIndexHtml = await fetchFromUrl(url);
      console.log("Fetched index.html from:", url);
      return cachedIndexHtml;
    } catch (e) {
      console.log("Failed to fetch from:", url, e.message);
    }
  }
  
  cachedIndexHtml = null;
  return cachedIndexHtml;
}

function isBot(userAgent) {
  return BOT_UA_REGEX.test(userAgent || "");
}

function buildRedirectHtml(targetPath) {
  const safePath = escapeHtml(targetPath);
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${SITE_NAME}</title>
  <meta property="og:title" content="${SITE_NAME}" />
  <meta property="og:image" content="${DEFAULT_IMAGE}" />
  <meta property="og:url" content="https://${DOMAIN}${safePath}" />
  <style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:-apple-system,sans-serif;background:#f5f5f5}p{color:#666;font-size:16px}</style>
  <script>
    (function(){
      var path = decodeURIComponent("${encodeURIComponent(targetPath)}");
      if (window.location.pathname !== '/' || !window.location.search.includes('_path=')) {
        window.location.replace('/?_path=' + encodeURIComponent(path));
      }
    })();
  </script>
  <noscript><meta http-equiv="refresh" content="0;url=/?_path=${encodeURIComponent(targetPath)}" /></noscript>
</head>
<body><p>Yönlendiriliyor...</p></body>
</html>`;
}

async function serveIndexOrRedirect(req, res) {
  const originalPath = req.originalUrl || req.url || '/';
  const html = await getIndexHtml();
  if (html) {
    res.set("Cache-Control", "public, max-age=600, s-maxage=600");
    res.status(200).send(html);
  } else {
    console.log("Could not get index.html, serving redirect HTML for:", originalPath);
    const redirectHtml = buildRedirectHtml(originalPath);
    res.set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.status(200).send(redirectHtml);
  }
}

const DOMAIN = "butikbiz.com";
const SITE_NAME = "ButikBiz";
const DEFAULT_IMAGE = `https://${DOMAIN}/icon-512.png`;
const DEFAULT_DESCRIPTION = "ButikBiz - Online mağazalar ve ürünler. Butik alışverişin yeni adresi.";

function slugify(text) {
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

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidHttpUrl(val) {
  return val && typeof val === "string" && val.trim().length > 5 && (val.trim().startsWith("http://") || val.trim().startsWith("https://"));
}

function getValidImageUrl(product, store) {
  if (product) {
    if (Array.isArray(product.images)) {
      for (const img of product.images) {
        if (isValidHttpUrl(img)) {
          return img.trim();
        }
      }
    }
    if (isValidHttpUrl(product.image)) {
      return product.image.trim();
    }
    if (isValidHttpUrl(product.imageUrl)) {
      return product.imageUrl.trim();
    }
    if (isValidHttpUrl(product.thumbnail)) {
      return product.thumbnail.trim();
    }
  }
  if (store) {
    if (Array.isArray(store.products)) {
      for (const p of store.products) {
        if (product && p.id === product.id) continue;
        if (isValidHttpUrl(p.image)) return p.image.trim();
        if (Array.isArray(p.images)) {
          for (const img of p.images) {
            if (isValidHttpUrl(img)) return img.trim();
          }
        }
        break;
      }
    }
    if (isValidHttpUrl(store.avatar)) {
      return store.avatar.trim();
    }
    if (isValidHttpUrl(store.coverImage)) {
      return store.coverImage.trim();
    }
  }
  return DEFAULT_IMAGE;
}

function getStoreProfileImageUrl(store) {
  if (store) {
    if (isValidHttpUrl(store.avatar)) {
      return store.avatar.trim();
    }
    if (isValidHttpUrl(store.coverImage)) {
      return store.coverImage.trim();
    }
  }
  return DEFAULT_IMAGE;
}

function buildOgHtml(params) {
  const { title, description, image, url, type = "website" } = params;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(url);

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />

  <!-- Open Graph -->
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="600" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:locale" content="tr_TR" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />

  <meta name="theme-color" content="#1a6b3c" />
  <link rel="icon" type="image/png" href="/icon-512.png" />

  <script>
    var ua = navigator.userAgent || '';
    var isBot = /facebookexternalhit|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Googlebot|bingbot|Discordbot/i.test(ua);
    if (!isBot) {
      window.location.replace("${safeUrl}");
    }
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=${safeUrl}" />
  </noscript>
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>${safeDesc}</p>
  <img src="${safeImage}" alt="${safeTitle}" style="max-width:600px" />
  <p><a href="${safeUrl}">${SITE_NAME} üzerinde görüntüle</a></p>
</body>
</html>`;
}

exports.ogStorePreview = functions.https.onRequest(async (req, res) => {
  try {
    const ua = req.headers["user-agent"] || "";
    if (!isBot(ua)) {
      await serveIndexOrRedirect(req, res);
      return;
    }

    const reqPath = req.path;
    const parts = reqPath.split("/").filter(Boolean);

    if (parts.length < 2) {
      res.redirect(`https://${DOMAIN}/`);
      return;
    }

    const storeSlug = parts[1];
    const productSlug = parts.length >= 3 ? parts[2] : null;

    if (storeSlug === "form" || storeSlug === "_layout") {
      res.redirect(`https://${DOMAIN}${reqPath}`);
      return;
    }

    let storeData = null;

    const storeSnapshot = await db
      .collection("stores")
      .where("slug", "==", storeSlug)
      .limit(1)
      .get();

    if (!storeSnapshot.empty) {
      const doc = storeSnapshot.docs[0];
      storeData = doc.data();
    } else {
      const storeDoc = await db.collection("stores").doc(storeSlug).get();
      if (storeDoc.exists) {
        storeData = storeDoc.data();
      }
    }

    if (!storeData) {
      res.redirect(`https://${DOMAIN}/`);
      return;
    }

    if (productSlug && productSlug !== "form") {
      const products = storeData.products || [];
      const normalizedSlug = productSlug.toLowerCase();
      let product = products.find((p) => {
        const pSlug = slugify(p.name || "");
        return pSlug === normalizedSlug;
      });

      if (!product) {
        product = products.find((p) => {
          const pSlug = slugify(p.name || "");
          return pSlug.includes(normalizedSlug) || normalizedSlug.includes(pSlug);
        });
      }

      if (product) {
        const productImage = getValidImageUrl(product, storeData);
        console.log("OG product found:", product.name, "image:", productImage, "slug:", normalizedSlug);

        const html = buildOgHtml({
          title: `${product.name} - ${storeData.name}`,
          description: product.description || `${product.name} - ${product.price} | ${storeData.name}`,
          image: productImage,
          url: `https://${DOMAIN}/store/${storeSlug}/${productSlug}`,
          type: "product",
        });
        res.set("Cache-Control", "public, max-age=300, s-maxage=300");
        res.status(200).send(html);
        return;
      } else {
        console.log("OG product NOT found for slug:", normalizedSlug, "in store:", storeSlug, "products count:", products.length, "product slugs:", products.map(p => slugify(p.name || "")).join(", "));
      }
    }

    const storeProfileImage = getStoreProfileImageUrl(storeData);
    console.log("OG store profile:", storeData.name, "avatar:", storeProfileImage);

    const html = buildOgHtml({
      title: `${storeData.name} - ${SITE_NAME}`,
      description: `${storeData.name} mağazamı inceleyin! | ${SITE_NAME}`,
      image: storeProfileImage,
      url: `https://${DOMAIN}/store/${storeSlug}`,
      type: "profile",
    });
    res.set("Cache-Control", "public, max-age=300, s-maxage=300");
    res.status(200).send(html);
  } catch (error) {
    console.error("OG preview error:", error);
    const fallbackHtml = buildOgHtml({
      title: `${SITE_NAME} - Online Butik Alışveriş`,
      description: DEFAULT_DESCRIPTION,
      image: DEFAULT_IMAGE,
      url: `https://${DOMAIN}/`,
      type: "website",
    });
    res.status(200).send(fallbackHtml);
  }
});

exports.ogProductPreview = functions.https.onRequest(async (req, res) => {
  try {
    const ua = req.headers["user-agent"] || "";
    if (!isBot(ua)) {
      await serveIndexOrRedirect(req, res);
      return;
    }

    const reqPath = req.path;
    const parts = reqPath.split("/").filter(Boolean);

    if (parts.length < 2) {
      res.redirect(`https://${DOMAIN}/`);
      return;
    }

    const productId = parts[1];

    const storesSnapshot = await db.collection("stores").get();
    let foundProduct = null;
    let foundStore = null;

    for (const storeDoc of storesSnapshot.docs) {
      const storeData = storeDoc.data();
      const products = storeData.products || [];
      const product = products.find((p) => p.id === productId);
      if (product) {
        foundProduct = product;
        foundStore = { id: storeDoc.id, ...storeData };
        break;
      }
    }

    if (!foundProduct || !foundStore) {
      res.redirect(`https://${DOMAIN}/`);
      return;
    }

    const productImage = getValidImageUrl(foundProduct, foundStore);

    const storeSlug = foundStore.slug || slugify(foundStore.name || "");
    const productSlug = slugify(foundProduct.name || "");

    const html = buildOgHtml({
      title: `${foundProduct.name} - ${foundStore.name}`,
      description: foundProduct.description || `${foundProduct.name} - ${foundProduct.price} | ${foundStore.name}`,
      image: productImage,
      url: `https://${DOMAIN}/store/${storeSlug}/${productSlug}`,
      type: "product",
    });
    res.set("Cache-Control", "public, max-age=300, s-maxage=300");
    res.status(200).send(html);
  } catch (error) {
    console.error("OG product preview error:", error);
    const fallbackHtml = buildOgHtml({
      title: `${SITE_NAME} - Online Butik Alışveriş`,
      description: DEFAULT_DESCRIPTION,
      image: DEFAULT_IMAGE,
      url: `https://${DOMAIN}/`,
      type: "website",
    });
    res.status(200).send(fallbackHtml);
  }
});
