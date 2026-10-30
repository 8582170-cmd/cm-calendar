#!/bin/sh
# בנייה ל-Cloudflare Pages: מעתיק לתיקייה dist רק את מה שצריך להיות ציבורי (בלי קוד שרת, כלים ומקורות)
set -e
rm -rf dist && mkdir dist
tar --exclude=./dist --exclude=./api --exclude=./functions --exclude=./tools --exclude=./data-src --exclude=./node_modules \
    --exclude=./.git --exclude='./.vercel*' --exclude=./vercel.json --exclude=./wrangler.toml --exclude='*.py' --exclude=./README.md \
    -cf - . | tar -xf - -C dist
echo "built: $(find dist -type f | wc -l) files"
node tools/cf_clean_urls.mjs dist
