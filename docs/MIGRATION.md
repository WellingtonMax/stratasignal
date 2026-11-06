# Standalone repository migration

Date: 6 November 2026. Canonical development repository: https://github.com/WellingtonMax/stratasignal

The product was extracted from `products/stratasignal/` in `WellingtonMax/freelance-solutions-portfolio`, using source commit `064586f4854f09ccc437418b0df1dcff9b06214e`. The 31 source files include implementation, tests, synthetic reports, market research and security documentation. Product-relative paths were preserved at this repository's root. The README setup path and GitHub Actions working directories were adapted for the standalone checkout.

The original commits remain in the portfolio repository's Git history. No source history was rewritten or force-pushed. This repository starts an independent history with an explicit migration reference; it does not claim to contain the original commit graph.

The portfolio becomes a showcase and retains a migration pointer and links to this repository. Its product-specific CI is retired after destination verification. Other portfolio projects and their workflows remain under their existing maintenance scope. Future StrataSignal development belongs here.

The product remains public, like its source repository. Moving it does not remove previously published code from Git history. Customer data, private reports and credentials must not be committed.

Source snapshot: https://github.com/WellingtonMax/freelance-solutions-portfolio/tree/064586f4854f09ccc437418b0df1dcff9b06214e/products/stratasignal
