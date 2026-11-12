// The text of TradeHub's legal pages. These are sensible starting templates, not
// legal advice: have a lawyer review them for your country before launch.

// Shown wherever people are told how to reach TradeHub. Set EXPO_PUBLIC_CONTACT_EMAIL for the real address.
export const CONTACT_EMAIL = process.env.EXPO_PUBLIC_CONTACT_EMAIL || 'support@tradehub.example';

export const LEGAL_UPDATED = '12 November 2026';

export type LegalDoc = { title: string; intro: string; sections: { heading: string; body: string[] }[] };

export const LEGAL_LINKS = [
  { href: '/legal/terms', label: 'Terms of Use' },
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/prohibited', label: 'Prohibited items' },
  { href: '/legal/safety', label: 'Trading safely' },
  { href: '/legal/copyright', label: 'Copyright and takedowns' },
];

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  terms: {
    title: 'Terms of Use',
    intro:
      'These terms are the agreement between you and TradeHub. By creating an account or using TradeHub you agree to them. If you do not agree, please do not use TradeHub.',
    sections: [
      {
        heading: '1. What TradeHub is',
        body: [
          'TradeHub is a place where people list items they own and arrange to swap them with other people, sometimes with one side adding cash to make the trade fair.',
          'TradeHub is only the venue. We are not a party to any trade, we never take possession of items, and we do not hold or transfer the cash that people exchange between themselves. Each trade is an agreement between the two people involved.',
        ],
      },
      {
        heading: '2. Who can use TradeHub',
        body: [
          'You must be at least 18 years old and legally able to enter into agreements. You must give accurate information when you sign up, keep your password secret, and you are responsible for everything done through your account.',
        ],
      },
      {
        heading: '3. Listing items',
        body: [
          'You may only list items that you own or have the right to trade. Your listing must describe the item honestly, including its condition, faults and a realistic value, and must use photos of the actual item.',
          'You may not list anything on our Prohibited items list, or anything that is illegal to own or trade where you live.',
          'We may edit, hide or remove any listing, and we may suspend or close accounts, when we believe these terms have been broken or to protect other people.',
        ],
      },
      {
        heading: '4. Trades between users',
        body: [
          'An accepted offer on TradeHub is an agreement in principle between two users. Inspecting the items, handing them over, paying any cash difference and transferring ownership (including any registration or paperwork for vehicles and phones) are the responsibility of the two users.',
          'The estimated values and the fair-trade indicator are guides based on what users enter. They are not valuations and we do not guarantee them.',
          'We do not verify users or items and we cannot guarantee the quality, safety, legality or ownership of anything listed. Please follow our Trading safely guide.',
        ],
      },
      {
        heading: '5. Paid features',
        body: [
          'Some features cost money, such as Premium membership and featuring an item. Prices are shown before you pay. Unless the law where you live says otherwise, payments for time-based features are not refundable once the feature has started.',
        ],
      },
      {
        heading: '6. Your content',
        body: [
          'You keep ownership of the photos and text you post. You give TradeHub a non-exclusive, worldwide, royalty-free licence to store, display and share that content in order to run and promote the service. You confirm that you have the right to post it and that it does not infringe anyone else’s rights.',
        ],
      },
      {
        heading: '7. Things you must not do',
        body: [
          'Do not post false, misleading or offensive content. Do not harass, threaten or defraud other people. Do not ask people to pay in advance or outside a face-to-face handover. Do not collect other users’ information, send spam, upload malware, or try to break, overload or get around the security of TradeHub.',
        ],
      },
      {
        heading: '8. Advertising',
        body: [
          'TradeHub shows advertising and sponsored placements. Adverts are the responsibility of the advertiser and showing one is not an endorsement by us.',
        ],
      },
      {
        heading: '9. No warranty and limit of liability',
        body: [
          'TradeHub is provided as it is. To the fullest extent the law allows, we give no warranties about the service or about the items and people on it, and we are not liable for losses that come from trades, from dealings between users, or from the service being unavailable. Nothing in these terms limits liability that cannot be limited by law.',
          'If you have a dispute with another user, you agree to resolve it with that user directly.',
        ],
      },
      {
        heading: '10. Closing your account',
        body: [
          'You can delete your account at any time from the Account screen. We may suspend or close accounts that break these terms.',
        ],
      },
      {
        heading: '11. Changes and contact',
        body: [
          'We may update these terms. If the changes are significant we will tell you in the app. Continuing to use TradeHub after a change means you accept the new terms.',
          `Questions about these terms can be sent to ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    intro: 'This policy explains what personal information TradeHub collects, why, and the choices you have.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Account details you give us: your name, email address, city, phone number and a password (stored only as a one-way hash that we cannot read).',
          'What you post: listings, photos, trade offers and the messages you exchange with other users about a trade.',
          'Technical information: your IP address and basic request logs, used to keep the service secure and prevent abuse. Records of purchases of paid features.',
        ],
      },
      {
        heading: 'How we use it',
        body: [
          'To run TradeHub: show your listings, deliver offers and messages, and let you sign in. To keep TradeHub safe: prevent fraud and abuse and act on reports. To provide paid features and show advertising. To meet legal obligations.',
        ],
      },
      {
        heading: 'What other people can see',
        body: [
          'Your name, city, the year you joined and your listings are public. Your email address and phone number are shown to another user only after you both accept a trade with each other, so that you can arrange the swap. They are never shown publicly.',
        ],
      },
      {
        heading: 'Who we share information with',
        body: [
          'We do not sell your personal information. We share it only with service providers that help us run TradeHub (such as hosting, payment and advertising providers), and with authorities when the law requires it.',
          'If third-party advertising such as Google AdSense or AdMob is switched on, those providers may use cookies or device identifiers to show and measure ads, under their own privacy policies. Where the law requires it, we will ask for your consent first.',
        ],
      },
      {
        heading: 'Storage on your device',
        body: [
          'TradeHub stores a sign-in token on your device so you stay signed in. It is necessary for the service to work and is removed when you sign out.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'We keep your information while your account is open. When you delete your account, your listings are removed and your name, email address, phone number and city are erased. Messages you sent in past trades remain visible to the other person but are no longer linked to your identity. Some records may be kept longer where the law requires it.',
        ],
      },
      {
        heading: 'Your choices and rights',
        body: [
          'You can view and correct your details, and delete your account, from the Account screen. Depending on where you live, you may also have the right to request a copy of your information or object to certain uses of it.',
          `To make a request or ask a question, contact ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: 'Children',
        body: ['TradeHub is for adults. It is not intended for anyone under 18 and we do not knowingly collect their information.'],
      },
      {
        heading: 'Security',
        body: [
          'We protect your information with measures such as encrypted connections, hashed passwords and rate limits. No system is perfectly secure, so please use a strong, unique password.',
        ],
      },
    ],
  },

  prohibited: {
    title: 'Prohibited items',
    intro:
      'To keep TradeHub legal and safe, the following may not be listed or traded. Listings that break these rules are removed and the account may be closed.',
    sections: [
      {
        heading: 'Never allowed',
        body: [
          'Stolen property, or anything you do not own or have the right to trade.',
          'Counterfeit, replica or pirated goods, including fake branded products and unlicensed copies of software, films, music or games.',
          'Weapons, ammunition, explosives and fireworks.',
          'Illegal drugs, prescription medicines, tobacco, vapes and alcohol.',
          'Phones or devices that are blocked, blacklisted, or locked to another person’s account, and items with removed or altered serial or IMEI numbers.',
          'Vehicles without valid ownership documents.',
          'Live animals, and products made from protected wildlife.',
          'Adult content and services.',
          'Identity documents, bank cards, accounts, SIM cards registered to someone else, and personal data.',
          'Hazardous materials and recalled or unsafe products.',
          'Anything else that is illegal to own or trade where you live.',
        ],
      },
      {
        heading: 'Listings must also',
        body: [
          'Use your own photos of the actual item, not pictures taken from other websites or sellers.',
          'Describe the real condition and any faults honestly.',
          'Offer a physical item. Services, jobs and money-making schemes are not allowed.',
        ],
      },
      {
        heading: 'See something that breaks the rules?',
        body: ['Open the item and choose Report this item. Our team reviews every report.'],
      },
    ],
  },

  safety: {
    title: 'Trading safely',
    intro: 'Most trades go smoothly. These habits protect you in the rare case that one does not.',
    sections: [
      {
        heading: 'Before you meet',
        body: [
          'Keep the conversation on TradeHub until you have both accepted the trade.',
          'Never pay a deposit or send money in advance, and never share passwords, verification codes or bank details.',
          'Be careful with offers that seem too good to be true or people who push you to hurry.',
        ],
      },
      {
        heading: 'When you meet',
        body: [
          'Meet in a busy public place in daylight, and take someone with you for high-value trades.',
          'Inspect the item properly. For phones, check that the IMEI is not blocked, that it is signed out of all accounts and that it works on your network. For vehicles, check the registration and ownership documents against the seller’s identity.',
          'Hand over any cash difference only in person, at the moment you swap. Count it together.',
        ],
      },
      {
        heading: 'After the trade',
        body: [
          'Complete any ownership transfer straight away, especially for vehicles.',
          'If something goes wrong or you suspect fraud, report the item on TradeHub and contact your local police.',
        ],
      },
    ],
  },

  copyright: {
    title: 'Copyright and takedowns',
    intro:
      'TradeHub respects intellectual property. Users may only post photos and text they have the right to use, and may not list counterfeit or pirated goods.',
    sections: [
      {
        heading: 'Reporting an infringement',
        body: [
          'If you believe a listing uses your copyrighted photos or text, or offers goods that infringe your trademark or copyright, you can report it from the listing itself by choosing Report this item and selecting Copyright or trademark.',
          `Rights owners can also send a notice to ${CONTACT_EMAIL} with: a description of the work or trademark, a link to the listing, your contact details, a statement that you believe in good faith the use is not authorised, and a statement that the information is accurate and that you are the owner or authorised to act for the owner.`,
        ],
      },
      {
        heading: 'What we do',
        body: [
          'We review notices promptly and remove listings that appear to infringe. Accounts that infringe repeatedly are closed.',
          'If your listing was removed and you believe that was a mistake, reply to us at the same address explaining why, and we will look at it again.',
        ],
      },
      {
        heading: 'TradeHub’s own content',
        body: [
          'The TradeHub name, logo and design belong to TradeHub. Product and brand names mentioned in listings belong to their respective owners and are used only to describe the items being traded.',
        ],
      },
    ],
  },
};
