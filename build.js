// build.js
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.dirname(__filename);
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const chromeDir = path.join(distDir, 'chrome');
const firefoxDir = path.join(distDir, 'firefox');
const galleryDir = path.join(distDir, 'gallery');
const packagesDir = path.join(distDir, 'packages');

const VERSION = '2.0.0';

// Git Short SHA and Build Time Stamp
let gitSha = 'unknown';
try {
  gitSha = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
} catch {}

const buildTime = new Date().toISOString();
const buildStamp = `${VERSION} (${gitSha})`;

const define = {
  '__BUILD_VERSION__': JSON.stringify(VERSION),
  '__BUILD_GIT_SHA__': JSON.stringify(gitSha),
  '__BUILD_TIME__': JSON.stringify(buildTime),
  '__BUILD_STAMP__': JSON.stringify(buildStamp)
};

async function compileTailwind(tempCssPath) {
  const postcss = (await import('postcss')).default;
  const tailwindcss = (await import('tailwindcss')).default;
  const autoprefixer = (await import('autoprefixer')).default;

  const globalsCssPath = path.join(srcDir, 'ui', 'globals.css');
  const rawCss = fs.readFileSync(globalsCssPath, 'utf8');
  const postCssResult = await postcss([tailwindcss, autoprefixer]).process(rawCss, {
    from: globalsCssPath
  });

  fs.writeFileSync(tempCssPath, postCssResult.css);
  return tempCssPath;
}

// -----------------------------------------------------------------------------
// Gallery Build (Dev-only standalone page in dist/gallery/)
// -----------------------------------------------------------------------------
export async function buildGallery() {
  fs.mkdirSync(galleryDir, { recursive: true });

  console.log(`[Build] Building Standalone Gallery (${buildStamp}) with React, Tailwind, and local fonts...`);

  const tempCssPath = path.join(galleryDir, '_temp_gallery.css');
  await compileTailwind(tempCssPath);

  // 2. Bundle gallery script and CSS with esbuild (classic IIFE bundle, relative fonts)
  esbuild.buildSync({
    entryPoints: {
      'gallery': path.join(srcDir, 'ui', 'gallery', 'gallery.jsx'),
      'gallery-styles': tempCssPath
    },
    bundle: true,
    outdir: galleryDir,
    target: 'es2022',
    format: 'iife',
    jsx: 'automatic',
    sourcemap: false,
    define: {
      ...define,
      'process.env.NODE_ENV': JSON.stringify('production')
    },
    loader: {
      '.woff2': 'file',
      '.woff': 'file'
    },
    assetNames: 'fonts/[name]-[hash]'
  });

  // Rename gallery-styles.css to gallery.css
  const stylesOut = path.join(galleryDir, 'gallery-styles.css');
  const finalCss = path.join(galleryDir, 'gallery.css');
  if (fs.existsSync(stylesOut)) {
    if (fs.existsSync(finalCss)) fs.unlinkSync(finalCss);
    fs.renameSync(stylesOut, finalCss);
  }
  if (fs.existsSync(tempCssPath)) {
    fs.unlinkSync(tempCssPath);
  }

  // 3. Write index.html with relative paths (opens via double click file://)
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Canji — UI Foundation Gallery</title>
  <link rel="stylesheet" href="./gallery.css">
</head>
<body class="bg-background text-foreground antialiased min-h-screen">
  <div id="root"></div>
  <script src="./gallery.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(galleryDir, 'index.html'), htmlContent);
  console.log('[Build] Gallery successfully built in dist/gallery/ (standalone dev surface; not packaged into extension zips).');
}

// -----------------------------------------------------------------------------
// Extension Build (Chrome & Firefox MV3 bundles)
// -----------------------------------------------------------------------------
export async function buildExtension() {
  [
    distDir,
    chromeDir,
    firefoxDir,
    packagesDir,
    path.join(chromeDir, 'icons'),
    path.join(firefoxDir, 'icons'),
    path.join(chromeDir, 'popup'),
    path.join(firefoxDir, 'popup'),
    path.join(chromeDir, 'options'),
    path.join(firefoxDir, 'options')
  ].forEach(dir => fs.mkdirSync(dir, { recursive: true }));

  console.log(`[Build] Bundling Canji v${VERSION} (${gitSha}) with esbuild...`);

  // 1. Bundle vanilla scripts with esbuild for Chrome and Firefox
  const vanillaEntryPoints = {
    'background': path.join(srcDir, 'background.js'),
    'content': path.join(srcDir, 'content', 'content.js')
  };

  // Bundle for Chrome
  esbuild.buildSync({
    entryPoints: vanillaEntryPoints,
    bundle: true,
    outdir: chromeDir,
    target: 'es2022',
    format: 'iife',
    loader: { '.css': 'text' },
    sourcemap: false,
    define
  });

  // Bundle for Firefox
  esbuild.buildSync({
    entryPoints: vanillaEntryPoints,
    bundle: true,
    outdir: firefoxDir,
    target: 'es2022',
    format: 'iife',
    loader: { '.css': 'text' },
    sourcemap: false,
    define
  });

  // 2. Process Tailwind CSS for Options and Popup pages
  const tempTailwindCssPath = path.join(distDir, '_temp_tailwind.css');
  await compileTailwind(tempTailwindCssPath);

  // 3. Bundle Options & Popup React scripts and CSS for Chrome and Firefox
  const optionsEntryPoints = {
    'options/options': path.join(srcDir, 'options', 'options.jsx'),
    'options/options-styles': tempTailwindCssPath
  };

  const optionsBuildOptions = {
    entryPoints: optionsEntryPoints,
    bundle: true,
    minify: true,
    target: 'es2022',
    format: 'iife',
    jsx: 'automatic',
    sourcemap: false,
    define: {
      ...define,
      'process.env.NODE_ENV': JSON.stringify('production')
    },
    loader: {
      '.woff2': 'file',
      '.woff': 'file'
    },
    assetNames: 'options/fonts/[name]-[hash]'
  };

  esbuild.buildSync({
    ...optionsBuildOptions,
    outdir: chromeDir
  });

  esbuild.buildSync({
    ...optionsBuildOptions,
    outdir: firefoxDir
  });

  const popupEntryPoints = {
    'popup/popup': path.join(srcDir, 'popup', 'popup.jsx'),
    'popup/popup-styles': tempTailwindCssPath
  };

  const popupBuildOptions = {
    entryPoints: popupEntryPoints,
    bundle: true,
    minify: true,
    target: 'es2022',
    format: 'iife',
    jsx: 'automatic',
    sourcemap: false,
    define: {
      ...define,
      'process.env.NODE_ENV': JSON.stringify('production')
    },
    loader: {
      '.woff2': 'file',
      '.woff': 'file'
    },
    assetNames: 'popup/fonts/[name]-[hash]'
  };

  esbuild.buildSync({
    ...popupBuildOptions,
    outdir: chromeDir
  });

  esbuild.buildSync({
    ...popupBuildOptions,
    outdir: firefoxDir
  });

  // Rename styles.css in both targets
  [chromeDir, firefoxDir].forEach(targetDir => {
    const optStylesOut = path.join(targetDir, 'options', 'options-styles.css');
    const optFinalCss = path.join(targetDir, 'options', 'options.css');
    if (fs.existsSync(optStylesOut)) {
      if (fs.existsSync(optFinalCss)) fs.unlinkSync(optFinalCss);
      fs.renameSync(optStylesOut, optFinalCss);
    }

    const popupStylesOut = path.join(targetDir, 'popup', 'popup-styles.css');
    const popupFinalCss = path.join(targetDir, 'popup', 'popup.css');
    if (fs.existsSync(popupStylesOut)) {
      if (fs.existsSync(popupFinalCss)) fs.unlinkSync(popupFinalCss);
      fs.renameSync(popupStylesOut, popupFinalCss);
    }
  });

  if (fs.existsSync(tempTailwindCssPath)) {
    fs.unlinkSync(tempTailwindCssPath);
  }

  console.log('[Build] esbuild bundling completed successfully.');

  // 4. Copy static files (HTML, CSS, Icons)
  function copyStaticFiles(targetDir) {
    const iconSizes = [16, 32, 48, 128];
    iconSizes.forEach(size => {
      const src = path.join(srcDir, 'icons', `icon${size}.png`);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(targetDir, 'icons', `icon${size}.png`));
      }
    });

    // Popup HTML & theme bootloader
    fs.copyFileSync(path.join(srcDir, 'popup', 'popup.html'), path.join(targetDir, 'popup', 'popup.html'));
    if (fs.existsSync(path.join(srcDir, 'popup', 'theme-boot.js'))) {
      fs.copyFileSync(path.join(srcDir, 'popup', 'theme-boot.js'), path.join(targetDir, 'popup', 'theme-boot.js'));
    }

    // Options HTML & theme bootloader
    fs.copyFileSync(path.join(srcDir, 'options', 'options.html'), path.join(targetDir, 'options', 'options.html'));
    if (fs.existsSync(path.join(srcDir, 'options', 'theme-boot.js'))) {
      fs.copyFileSync(path.join(srcDir, 'options', 'theme-boot.js'), path.join(targetDir, 'options', 'theme-boot.js'));
    }
  }

  copyStaticFiles(chromeDir);
  copyStaticFiles(firefoxDir);

  // 3. Manifest for Chrome (Manifest V3 with service_worker)
  const commonManifest = {
    manifest_version: 3,
    name: "Canji",
    short_name: "Canji",
    version: VERSION,
    description: "Prices, in your currency. Convert prices on any page with live exchange rates.",
    permissions: [
      "contextMenus",
      "notifications",
      "storage",
      "activeTab",
      "scripting",
      "tabs"
    ],
    host_permissions: [
      "<all_urls>"
    ],
    icons: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",

      "128": "icons/icon128.png"
    },
    action: {
      default_title: "Canji — Prices, in your currency",
      default_popup: "popup/popup.html",
      default_icon: {
        "16": "icons/icon16.png",
      "32": "icons/icon32.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      }
    },
    options_ui: {
      page: "options/options.html",
      open_in_tab: true
    },
    content_scripts: [
      {
        matches: ["http://*/*", "https://*/*"],
        js: ["content.js"],
        run_at: "document_idle",
        all_frames: false
      }
    ]
  };

  const chromeManifest = {
    ...commonManifest,
    background: {
      service_worker: "background.js"
    }
  };
  fs.writeFileSync(path.join(chromeDir, 'manifest.json'), JSON.stringify(chromeManifest, null, 2));

  // 4. Manifest for Firefox (Manifest V3 with background.scripts & Gecko settings)
  const firefoxManifest = {
    ...commonManifest,
    browser_specific_settings: {
      gecko: {
        id: "canji@richmond.addons",
        strict_min_version: "140.0",
        data_collection_permissions: {
          required: ["none"]
        }
      },
      gecko_android: {
        strict_min_version: "142.0"
      }
    },
    background: {
      scripts: ["background.js"]
    }
  };
  fs.writeFileSync(path.join(firefoxDir, 'manifest.json'), JSON.stringify(firefoxManifest, null, 2));

  console.log('[Build] Manifests generated for Chrome and Firefox.');

  // 5. Package ZIP archives for Chrome Web Store and Firefox Add-ons
  function createZip(sourceDir, zipPath) {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    const items = fs.readdirSync(sourceDir);
    execSync(`tar -a -c -f "${zipPath}" -C "${sourceDir}" ${items.join(' ')}`);
    console.log(`[Build] Created package: ${zipPath}`);
  }

  const chromeZip = path.join(packagesDir, `canji-chrome-v${VERSION}.zip`);
  const firefoxZip = path.join(packagesDir, `canji-firefox-v${VERSION}.zip`);

  try {
    createZip(chromeDir, chromeZip);
    createZip(firefoxDir, firefoxZip);
    console.log(`[Build] Build completed successfully for v${VERSION} (${gitSha}).`);
  } catch (err) {
    console.error('[Build] ZIP packaging error:', err.message);
  }
}

// -----------------------------------------------------------------------------
// CLI Runner
// -----------------------------------------------------------------------------
const isGalleryOnly = process.argv.includes('--gallery');
const isAll = process.argv.includes('--all');

if (isGalleryOnly) {
  buildGallery().catch(err => {
    console.error('[Build Gallery Error]:', err);
    process.exit(1);
  });
} else if (isAll) {
  buildExtension()
    .then(() => buildGallery())
    .catch(err => {
      console.error('[Build Error]:', err);
      process.exit(1);
    });
} else {
  buildExtension().catch(err => {
    console.error('[Build Error]:', err);
    process.exit(1);
  });
}
