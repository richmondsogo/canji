# File & Directory Structure Conventions

This document defines the production directory layout of the **Canji** repository.

```text
canji/
├── .agents/                    # Project-scoped agent workflows & verification skills
├── .gitignore                  # Git ignore definitions (dist/, node_modules/)
├── AGENTS.md                   # Repository agent rules, zero-innerHTML policy, commands
├── BUILD_PROTOCOL.md           # Step planning, branching, verification, and merge protocol
├── CHANGELOG.md                # Release history
├── CHROMEWEBSTORE.md           # Chrome Web Store & Firefox AMO store listing copy
├── CONTEXT.md                  # Architectural overview and runtime data flow
├── DESIGN.md                   # Paper & Pine design system specification
├── LICENSE                     # License (All rights reserved)
├── PRIVACY_POLICY.md           # User privacy policy and zero-telemetry disclosures
├── README.md                   # Public repository documentation and quickstart guide
├── build.js                    # esbuild bundler for Chrome & Firefox MV3 bundles
├── components.json             # shadcn/ui configuration
├── jsconfig.json               # Path alias configuration (@/* -> ./src/*)
├── package.json                # Project metadata, scripts, and dependencies
├── postcss.config.js           # PostCSS & Tailwind pipeline config
├── tailwind.config.js          # Paper & Pine theme tokens & Tailwind configuration
│
├── canji-kit/                  # Official Canji brand icons, lockups, and SVG symbols
├── screenshots/                # Official store & README screenshots (1280x800 & 440x280)
│
├── docs/                       # Architecture & engineering documentation
│   ├── DECISIONS.md            # Index of Architecture Decision Records
│   ├── adr/                    # Sequentially numbered ADRs (0000–0015)
│   ├── agents/                 # Repository structure and engineering conventions
│   ├── steps/                  # Step behavior specs and verification logs (01–19)
│   └── store/                  # Reviewer notes for Firefox AMO submission
│
├── scripts/                    # Build, test harness, and screenshot automation scripts
│   ├── capture-production-screenshots.js
│   ├── demo-store.html
│   ├── generate-currencies.js
│   └── launch-browser.js
│
├── src/                        # Extension source code
│   ├── background.js           # MV3 background service worker
│   ├── content/                # Vanilla JS in-page conversion engine (zero framework overhead)
│   │   ├── content.js          # Lifecycle orchestrator, auto-convert, and Ask observer
│   │   ├── scanner.js          # Two-phase DOM walker, split-price assembly, revert WeakMap
│   │   ├── ui.js               # Shadow DOM on-page toolbar & hover tooltip
│   │   └── ui.css              # Paper & Pine Shadow DOM styles
│   ├── icons/                  # Extension PNG icons (16, 32, 48, 128)
│   ├── options/                # Settings dashboard (React 18 + Tailwind + shadcn/ui)
│   │   ├── options.html
│   │   ├── options.jsx         # Settings2 Card + Sidebar dashboard
│   │   └── theme-boot.js       # Pre-paint theme initializer
│   ├── popup/                  # Toolbar popup (React 18 + Tailwind + shadcn/ui)
│   │   ├── popup.html
│   │   ├── popup.jsx           # Explicit From -> To converter & site rules
│   │   ├── popup-errors.js     # Error classification helper
│   │   ├── popup.js            # Re-exports for unit tests
│   │   └── theme-boot.js       # Pre-paint theme initializer
│   ├── shared/                 # Cross-context shared modules
│   │   ├── audio.js            # Web Audio tactile click synthesis
│   │   ├── browser.js          # Cross-browser chrome/browser API wrapper
│   │   ├── currencies-data.js  # Static metadata for 170+ fiat & crypto currencies
│   │   ├── currencies.js       # Currency lookup, TLD, and symbol resolution
│   │   ├── format.js           # Localized Intl.NumberFormat price formatter
│   │   ├── messaging.js        # Typed runtime message constants
│   │   ├── parser.js           # Multi-currency price regex parser & DOM inference
│   │   ├── rates.js            # 3-tier rate engine, caching, and cross-rate math
│   │   ├── settings.js         # Settings v3 schema, migrations, and site rule helpers
│   │   └── theme.js            # Theme resolution and media-query subscription
│   └── ui/                     # Shared React UI components, hooks, and styles
│       ├── components/         # Domain components & shadcn/ui primitives
│       ├── gallery/            # Standalone dev component gallery
│       ├── hooks/              # Responsive hooks (use-mobile)
│       ├── lib/                # Site rule validation & class utilities
│       └── globals.css         # Local WOFF2 @font-face & Paper & Pine CSS variables
│
└── tests/                      # Automated test suites
    ├── *.test.js               # Unit, DOM, parser, contrast, security & Firefox smoke tests
    ├── fixtures/               # HTML fixtures for unit and E2E tests
    └── e2e/                    # Playwright real-browser E2E tests
```
