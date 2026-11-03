# A note to the judges — TRUE IP → DPP AI

> ## Your patents, in your hand.
>
> Most companies don't actually know how many patents they hold, or when
> each one expires — and 10 or 20 years later, that knowledge is gone.
> TRUE IP puts every registered patent in the owner's hand as a verifiable
> QR passport, so nothing gets forgotten.

Hello, and thank you for looking at this project.

## The idea in one paragraph

Products should carry a passport you can verify: what a product is, what it is
made of, and whether its approved record has been changed since it was
approved. TRUE IP → DPP AI makes that passport in English and Japanese, hashes
it, and anchors only the digest on TRUE Layer 1. Anyone can scan its QR, watch
the browser recompute the hash, and see MATCH or MISMATCH. The chain proves
the digest has not changed. It does not prove ownership, a licence, or that a
patent is valid — and this demo never claims otherwise.

## Please try this first (2 minutes)

1. https://passport.truel1.com — open TRUE-SJ-001.
2. Scan its QR on your phone, on mobile data if you can. You should see MATCH.
3. Click its Blockscout anchor link: chain 77777, block 1133287.
4. Click "Tamper demo" — MISMATCH. Click "Restore" — MATCH again.
5. Go to https://passport.truel1.com/search, search US12050123, and click
   "Add to Passport" on the Bizerba card. It opens a new page in your browser.

## What is honest about this demo — please read this before judging the new features

- The 10 Smart Jacket passports are **DEMO samples**, clearly labelled. They
  are not real products and not real USPTO patents.
- The 10 digests **really are anchored** on TRUE Layer 1, blocks 1133287–1133306.
  The search results **really are live** from USPTO ODP through our server proxy.
- **Add to Passport and Patent Expire On, as filmed, are browser-only.**
  The added passport you just created lives only in your browser, is labelled
  "USER-ADDED — NOT ANCHORED, NOT VERIFIED", and has no server QR image.
  A browser click cannot safely anchor a passport, because the issuer key must
  stay on the server. That is why the video does not show it as anchored.
- **Patent Expire On is not a legal expiry.** For the Bizerba grant it shows
  07/12/2041, estimated as filing + 20 years, with that disclaimer on screen.
  Update changes the date in your browser. Re-register saves a local v2 for
  review. Neither is a legal renewal, and neither re-anchors on chain.
- The parallel **real, server-side Passport API is already in this repo**
  (`passport-api/`), with edit-token auth and REAL- ids, but it is **not yet
  deployed or switched on**. We kept the video version browser-only on purpose,
  so a new server service could not break the demo before the deadline.
  Deploying it, switching the search button to it, and anchoring REAL passports
  with a separate server-only script is the work right after Nov 4.

## What was built during the event, and what was not

Built Oct 26 – Nov 4: the DPP site and DEMO passports, QR verify, the
PassportAnchor contract and its 10 anchors, the live USPTO search page and
proxy, the browser Add to Passport + Patent Expire On, and the parallel real
Passport API code.

Pre-existing, and not claimed as hackathon work: TRUE Layer 1 (Besu +
Blockscout), the server and nginx, and USPTO ODP as an external source.

Not in the live build, and not claimed: the original spec's Spark draft →
Wonder audit → SAM → Muse Image pipeline, and full independent browser
`getAnchor` verification. This demo was built with Muse (Muse Spark 1.3) as
the coding/build assistant during the event; the DPP samples shown are DEMO
samples, not live Spark-generated drafts.

Thank you for your time. The live site, the code, and the anchor transactions
are all public, so you can check every claim above yourself.

— George, TRUE IP / FME, Inc.
Live: https://passport.truel1.com
Repo: https://github.com/aungbu/Digital-IP-Passport
