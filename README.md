# AutoClickerMouse Advanced

Preserves the existing Admin, My Orders, tracking, reviews, feedback/warranty, FAQ, Razorpay and GitHub JSON-storage functions. Adds product detail pages, cart, wishlist, related products, analytics, product management, coupons, consent-based customer activity, premium review alignment and tracking history.

## Run
1. Copy `.env.example` to `.env`.
2. Fill secrets. Never commit `.env`.
3. `npm install`
4. `npm start`

## GitHub files
Upload `data/products.json`, `data/orders.json`, `data/coupons.json`, and `data/events.json` to the paths configured in `.env`. Fine-grained token needs repository Contents read/write.

## Failed payments
Configure Razorpay webhook URL as `/webhooks/razorpay`, set `RAZORPAY_WEBHOOK_SECRET`, and subscribe to `payment.failed`. Server verifies webhook signatures.

## Privacy
The admin Customer Activity tab shows name/mobile only where the customer voluntarily supplied them during consented checkout. Wishlist/cart events before that remain anonymous.
## Final v3 fixes
Professional My Orders information architecture, persistent feedback confirmation, coupon entry in every checkout flow, server-authoritative Razorpay discount, fixed wishlist, no native add-to-cart alert, upgraded mobile CTAs/header/footer/dropdowns, preselected consent, total quantity, and AutoClickerMouse branding.
## Final requested fixes
Clickable checkout/cart products, coupon expiry management and server validation, mobile icon-only wishlist control, product-detail wishlist heart, conditional related-products section, and responsive success/error coupon animations.
