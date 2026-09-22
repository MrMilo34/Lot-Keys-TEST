# LotKeys V0.9.5.0 — Hub V2 isolation checkpoint

This is a rebuild, not another patch on the V0.9.4.95–V0.9.4.99 Hub/navigation line.

## Foundation

- Base commit: V0.9.4.81, `13e50428fb13ef1c296d1bb79fccdb88c57e1cd2`.
- Inventory, Listings, Store/Drive synchronization, resumable uploads, Posting Buddy, Processor, Awards, Garage and Account remain on that baseline.
- Existing LotKeys Chat remains intact and separate from Device messages.

## New boundary

The Hub V2 shell is allowed to:

- display read-only summaries of existing LotKeys Chat conversations;
- open the existing LotKeys Chat surface;
- connect to the Phone Mirror relay after explicit Hub interaction;
- display live phone SMS/MMS threads in memory;
- send a reply through the phone and wait for phone acknowledgement.

The Hub V2 shell is not allowed to:

- call the Inventory or Listings object stores;
- start, pause or replace Store/Drive synchronization;
- change the active normal LotKeys route;
- archive Device message bodies in browser storage or Google Drive;
- continue showing a stale Device transcript after the phone becomes unavailable.

## Intentional first-checkpoint limits

Customer categories, notes, photos/documents, vehicle associations and appointments will be added only after this boundary passes a real-phone navigation test. Those records will live in their own module and cannot become prerequisites for opening Inventory, Listings or the Hub conversation list.

## Required phone test

1. Let Home finish loading from the existing phone cache.
2. Open Hub, switch All → LotKeys → Device, then return Home.
3. Navigate Inventory → Listings → Garage → Account → Home while Store sync is active.
4. Connect Phone Mirror and open a Device conversation.
5. Turn off Phone Mirror or the relay and confirm Device conversations become unavailable while normal LotKeys pages remain usable.
