<p><img src="branding/logo.png" alt="TradeHub" width="260"></p>

TradeHub is a marketplace for **trading** things rather than buying them. People list what
they have (phones, cars, TVs, earphones, anything), offer it in exchange for someone
else's item, and one side adds cash when the two items are not worth the same.

One codebase produces the website and the Android and iOS apps.

## What is in it

- **Listings** with photos, an estimated value and what the owner wants in return.
- **Trade offers**: offer one or more of your items for someone else's, with cash added by
  either side. A balance meter shows how fair the offer is and suggests the cash that evens it out.
- **Negotiation**: accept, decline, counter-offer, and chat inside each trade. Contact
  details are only shared once both people accept.
- **Ways to earn**: ad slots (sponsor placements you sell directly, or Google AdSense on the
  web), paid "Featured" listings that sort to the top, and a Premium membership (no ads,
  unlimited listings, badge).
- **Trust and legal**: Terms of Use, Privacy Policy, prohibited items, safety guide and a
  copyright takedown page; consent at sign-up; item reporting and admin takedowns; account deletion.

## Layout

| Folder | What it is |
| --- | --- |
| `app/` | The website and mobile app (Expo, React Native, TypeScript). Screens live in `app/src/app`. |
| `server/` | The API (Node.js, Express, SQLite). Also serves the built website in production. |
| `branding/` | Logo artwork. `npm run icons` regenerates the app icons from it. |
| `.github/` | CI: tests, website build, security scans, and a deployable Docker image. |

## Run it on your computer

You need [Node.js](https://nodejs.org) 22.13 or newer.

```bash
npm run setup     # first time only: installs everything
npm run dev       # starts the API (port 4000) and the website (port 8081)
```

Open http://localhost:8081. The first run fills the database with demo items. Demo
accounts: `ali@tradehub.test`, `sara@tradehub.test`, `bilal@tradehub.test`, password `tradehub123`.

To try the mobile app, run `npm run server` in one terminal and `npm run mobile` in
another, then scan the QR code with the Expo Go app (phone and computer on the same Wi-Fi).

```bash
npm test          # server tests and app typecheck
```

## Deploying

The `Dockerfile` builds one image that serves both the API and the website on port 4000.
CI publishes it to `ghcr.io/<owner>/tradehub` on every push to `main`.

1. Copy `.env.example` and fill it in. `JWT_SECRET` is required.
2. Run the image with a persistent disk mounted at `/data` (database and photos).
3. Point your domain at it over HTTPS.

Mobile apps are built with [EAS](https://docs.expo.dev/eas/): set `EXPO_PUBLIC_API_URL`
to your domain, then run `npx eas-cli@latest build` inside `app/`.

## Things to set up before launch

- **Payments** run in test mode (purchases apply without charging) until a payment
  provider is connected in `server/src/routes/monetization.js`.
- **Ads**: set `EXPO_PUBLIC_ADSENSE_CLIENT` and `EXPO_PUBLIC_ADSENSE_SLOT` to show AdSense
  on the web (and add Google's domains to the Content-Security-Policy in `server/src/app.js`).
  Until then the ad slots show the sponsor placements stored in the database.
- **Legal pages** in `app/src/lib/legal.ts` are templates. Have a lawyer review them and
  set `EXPO_PUBLIC_CONTACT_EMAIL`.
- **Currency** defaults to `Rs` (`CURRENCY` on the server, `EXPO_PUBLIC_CURRENCY_SYMBOL` in the app).

See [SECURITY.md](SECURITY.md) for what protects the site and the go-live checklist.
