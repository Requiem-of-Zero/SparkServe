# Restaurant POS Platform Plan

This document captures the current product direction for the POS app. The goal is to build a single-restaurant deployment that each restaurant can run on its own host, domain, database, and theme.

## Product Model

Each restaurant deployment is self-contained:

```text
restaurant domain
  |
  v
NGINX
  |
  v
Next.js POS app
  |
  v
local PostgreSQL database
```

The same app code can be deployed to many restaurants, but each restaurant owns its own data and configuration.

## Competitive Context

SparkServe is being shaped as a lightweight, self-hostable restaurant ordering and POS platform for small restaurants that want modern QR ordering, takeout ordering, staff tools, and payments without adopting a large all-in-one vendor stack on day one.

Compared with a mature platform like Chowbus, SparkServe already has the beginning of the same core product pillars:

- restaurant storefront and takeout entry point
- QR/table session ordering
- shared table cart with realtime updates
- customer/member login for loyalty
- employee and owner authentication
- table owner approval for shared ordering
- Stripe checkout for dine-in and takeout flows
- restaurant-controlled menu data, categories, images, and translations
- self-hosted deployment model with local Postgres

The gap is not the basic ordering idea anymore. The remaining gap is restaurant operations depth. Chowbus-like systems become valuable because staff can run the restaurant from them all day: kitchen display, order status, waitlist, table management, menu editing, reporting, refunds, hardware payments, and customer marketing.

For a first restaurant sales pitch, SparkServe should aim to prove:

```text
customer orders -> kitchen sees it -> staff manages it -> customer pays -> owner can review sales
```

## Users And Sessions

Use clear business language:

- `Employee`: staff member who logs into the POS.
- `Customer`: optional permanent customer/member account.
- `CustomerSession`: temporary QR/table session for guests.
- `DiningTable`: physical table with its own QR code.
- `Order`: active or completed order for a table session.

Do not require QR customers to be permanent users at first. They are temporary table sessions by default.

Later, customers can optionally sign up or log in through the customer portal to become members. A member account should be separate from staff authorization:

- customer/member accounts can view order history and loyalty points
- employee accounts can access POS and owner/staff tools through `EmployeeProfile`
- customers should never get an `EmployeeProfile`

Employee login is also the foundation for accountability. Any sensitive staff action should eventually be tied to an employee account, especially when cash handling is added.

Examples:

```text
cash drawer opened
cash payment received
discount applied
order voided
refund issued
menu price changed
employee created
table checked out
```

This prevents ambiguous situations where multiple employees could be blamed for the same register or order action.

## Recommended App Stack

Use libraries for the repetitive foundation:

- `Prisma`: database schema, migrations, and typed queries.
- `Better Auth`: employee login, sessions, email/password auth, and auth routes.
- `PostgreSQL`: restaurant-local data store.
- `Next.js App Router`: pages, server actions, API routes.

LDAP is not needed for the first version. It can be added later through an identity provider if restaurants need central identity.

## Database Shape

Because each restaurant has its own database, most tables do not need a `restaurantId`.

Initial models:

```text
RestaurantSettings
EmployeeProfile
CustomerProfile
AuditEvent
MenuItem
MenuItemTranslation
DiningTable
CustomerSession
Order
OrderItem
Payment
LoyaltyProgram
LoyaltyLedger
LoyaltyReward
```

Better Auth will manage its own auth tables for users and sessions. The app should add employee-specific business data through `EmployeeProfile`.

`EmployeeProfile` should store POS-specific employee data:

```text
auth user id
role
active status
createdAt
updatedAt
```

`AuditEvent` stores sensitive staff activity:

```text
employeeProfileId
action
entityType
entityId
metadata
createdAt
```

Example actions:

```text
CASH_DRAWER_OPENED
ORDER_VOIDED
REFUND_CREATED
EMPLOYEE_CREATED
MENU_PRICE_CHANGED
TABLE_CHECKED_OUT
```

`CustomerProfile` should store customer/member-specific business data:

```text
auth user id
displayName
phone
marketingOptIn
loyaltyPointsBalance
createdAt
updatedAt
```

`LoyaltyProgram` should store restaurant-controlled earning rules:

```text
enabled
pointsPerDollar
minimumSpendCents
roundingMode
createdAt
updatedAt
```

`LoyaltyLedger` should store every points movement instead of only overwriting a balance:

```text
customerProfileId
orderId
points
reason
metadata
createdAt
```

Example reasons:

```text
ORDER_EARNED
REWARD_REDEEMED
OWNER_ADJUSTMENT
POINTS_EXPIRED
```

`LoyaltyReward` should store menu rewards controlled by the owner or manager:

```text
menuItemId
pointsCost
active
startsAt
endsAt
redemptionLimit
createdAt
updatedAt
```

## Theming

Restaurant branding should be data-driven, not hardcoded.

`RestaurantSettings` should eventually include:

```text
name
publicUrl
logoUrl
primaryColor
accentColor
backgroundColor
textColor
receiptFooter
taxRate
currency
timezone
```

The app should expose these as CSS variables:

```css
--brand-primary
--brand-accent
--brand-background
--brand-text
```

This lets each restaurant personalize the UI without forking the app.

## Multilanguage Support

Customer-facing pages should support multiple languages because QR ordering may be used by guests with different language preferences.

Start with a simple model:

```text
RestaurantSettings
  defaultLocale
  supportedLocales

MenuItem
  base price and operational fields

MenuItemTranslation
  locale
  name
  description
```

The POS and owner/staff interfaces can start in English only. The customer QR ordering flow should eventually allow language switching.

Example customer URLs:

```text
/table/abc123?lang=en
/table/abc123?lang=es
/table/abc123?lang=zh
```

Keep translation data in the restaurant database so each restaurant can customize menu names and descriptions.

Do not use machine translation as the source of truth. It can be a future helper, but owners should be able to review/edit customer-visible text.

## Customer Membership And Loyalty

Customer accounts should be optional. A guest should still be able to scan a QR code and order without creating an account, but a customer who signs in can become a member.

Member features:

- sign up and log in through the customer portal
- view loyalty points balance
- view available rewards
- optionally view order history
- attach a table order to their member account before checkout

Owner/manager controls:

- enable or disable the loyalty program
- set points earned per dollar spent
- set minimum spend rules
- choose whether points round down, round nearest, or use exact cents
- choose which menu items can be redeemed as rewards
- set points cost per reward item
- manually adjust customer points when needed

The app should use a ledger model for points. Do not only store a mutable balance with no history. The balance is useful for display, but the ledger explains why it changed.

Example flow:

```text
customer signs in
customer places order
order is paid
system calculates points from LoyaltyProgram
LoyaltyLedger records ORDER_EARNED
CustomerProfile balance updates
customer later redeems reward item
LoyaltyLedger records REWARD_REDEEMED
```

Reward redemption should be validated server-side. A customer should not be able to unlock a reward item just by changing client-side code.

## Build Order

Build the restaurant operations loop before adding more polish. The early steps establish identity, menu data, QR sessions, realtime ordering, and checkout. After that, the sequence shifts into Chowbus-like restaurant operations: kitchen queue, staff dashboard, waitlist, floor view, owner controls, and reporting.

Status key:

- ✅ Done
- 🟡 In progress
- ⬜ Not started
- 🔮 Later

### ✅ 1. Prisma Foundation

Install Prisma and create the initial schema.

Focus:

- Connect Prisma to the existing Postgres `DATABASE_URL`.
- Create migrations.
- Define `RestaurantSettings`, `EmployeeProfile`, `MenuItem`, `MenuItemTranslation`, `DiningTable`, `CustomerSession`, `Order`, and `OrderItem`.

Done when:

- `prisma migrate` creates tables.
- The app can query the database through Prisma.

Status: ✅ Done

- Built.
- Schema has been split into domain files under `prisma/schema`.
- Local and Docker database workflows are understood.

### ✅ 2. Multilanguage Menu Foundation

Add the first customer-facing translation layer.

Focus:

- Store default locale in `RestaurantSettings`.
- Store supported locales as restaurant config.
- Store menu item display text in `MenuItemTranslation`.
- Keep price/category/availability on `MenuItem`.

Done when:

- A menu item can have English and one additional language translation.
- The app can query menu items for a requested locale.

Status: ✅ Done

- Built as a foundation.
- Menu items have descriptions, categories, ingredients, images, and translation support.
- Full app translation is still future work.

### ✅ 3. Employee Authentication

Add Better Auth.

Focus:

- Email/password or username/password login for employees.
- Session cookie support.
- Sign in and sign out routes.
- Protect POS, staff, and owner pages.
- Tie Better Auth users to `EmployeeProfile`.
- Use employee roles for access control.

Done when:

- Employees can log in.
- Anonymous users cannot access staff pages.
- Staff identity is available to server actions that change orders, payments, menu items, or employees.

Status: ✅ Done

- Built.
- Owner login uses email/password.
- Employee login uses private 6-digit login codes.
- Employee profiles store hire/resign dates and role data.

### ✅ 4. Employee Management

Build the first owner workflow.

Focus:

- Owner can create employees.
- Owner can assign roles: `owner`, `manager`, `cashier`.
- Owner can deactivate employees.
- Owner can set a temporary password for a new employee.
- Employee can later change their password.

Done when:

- Store owner can manage staff without touching the database manually.

Future improvement:

- Replace temporary passwords with setup links or invite emails.
- Add required password reset after first login.
- Record employee management changes in `AuditEvent`.

Status: ✅ Done

- Built as a basic owner workflow.
- Owner can create employees and regenerate employee login codes.
- Basic audit logging exists for employee creation/code rotation and owner menu changes.
- Owner can review recent staff-sensitive actions at `/owner/audit`.
- Generic account redirects send employees to `/staff` and customers to `/customer/account`.
- More polished employee management and broader audit coverage are still future work.

### 🟡 5. Menu Management

Build restaurant menu data.

Focus:

- Create/edit menu items.
- Enable/disable items.
- Set prices.
- Group items by category.

Done when:

- POS menu comes from Postgres instead of hardcoded arrays.

Status: 🟡 In progress

- Partly built.
- Seeded menu data is in Postgres.
- Customer-facing menu and takeout pages use database menu items.
- Owner menu editing has started at `/owner/menu`.
- Reusable ingredients can be attached to menu items for allergy visibility and future inventory.
- Menu item image upload is backed by Cloudflare R2 when storage env vars are configured.
- Category keys are derived from owner-friendly category labels.
- More polished translations, modifier swaps, and bulk editing are still needed.

### 🟡 6. Customer Membership And Loyalty Foundation

Build optional customer accounts and member identity.

Focus:

- Customer can sign up and log in through the customer portal.
- Customer can use Google OAuth.
- Customer account can be separate from employee authorization.
- Homepage changes based on logged-in vs logged-out customer state.
- Logged-in customers can see rewards/member entry points.

Done when:

- A customer can become a member without becoming an employee.
- A logged-in customer can be recognized across storefront and ordering flows.

Status: 🟡 In progress

- Built as a foundation.
- Google OAuth works locally when the origin matches OAuth settings.
- Loyalty point earning and reward redemption still need the ledger/rules engine.

### ✅ 7. Table And QR Flow

Create customer entry points.

Focus:

- Admin can create dining tables.
- Each table has a unique QR token.
- QR URL opens `/table/[code]`.
- Opening QR creates or joins an active `TableSession`.
- Device-specific participants can join the same table session.
- First guest can become the table session owner.

Done when:

- A table can scan a QR code and see its current session.

Status: ✅ Done

- Built.
- QR table sessions exist.
- Table participants and ownership exist.
- Owner setup stores attendee count and owner phone verification state.

### 🟡 8. Realtime Table Ordering Flow

Build customer and staff order flow.

Focus:

- Customer can add items to a table order.
- Customers at the same table see shared cart updates in realtime.
- Table owner can require or disable 6-digit approval for each kitchen submission.
- Table owner receives verification code prompts when order approval is required.
- Submitted carts become accumulated orders for the final table receipt.

Done when:

- A table order can be created, updated, submitted, and seen by every connected table participant without manual refresh.

Status: 🟡 In progress

- Mostly built.
- Socket.IO table rooms work locally.
- Shared cart add/remove/increment flows are built.
- Kitchen submission exists.
- Owner security toggle exists.
- Kitchen-facing order queue exists and is being wired into realtime updates.

### 🟡 9. Takeout Ordering Flow

Build non-table ordering for customers who want pickup.

Focus:

- Homepage starts a takeout order through `/takeout`.
- Takeout cart is separate from table sessions.
- Customer can add multiple quantities.
- Takeout checkout uses the same Stripe foundation.
- Takeout orders can later feed into the kitchen queue.

Done when:

- A customer can start a takeout cart, checkout, and create a kitchen-visible order.

Status: 🟡 In progress

- Partly built.
- Takeout page and Stripe checkout route exist.
- Takeout checkout now persists submitted takeout sessions and items.
- Takeout sessions can feed the kitchen queue.
- Takeout customer status and receipt polish still need completion.

### 🟡 10. Checkout And Payments

Close the table lifecycle.

Focus:

- Customer can checkout with Stripe for dine-in.
- Customer can checkout with Stripe for takeout.
- Stripe webhook marks payments as paid.
- Payments record whether the transaction is dine-in or takeout.
- Platform fee support works for connected restaurant accounts.
- Staff can eventually checkout a table with a reader/iPad.

Done when:

- A full table visit can start, order, submit to kitchen, checkout, and close.
- A takeout order can start, checkout, submit to kitchen, and close.

Status: 🟡 In progress

- Partly built.
- Stripe checkout is connected for dine-in and takeout.
- Webhook handling exists.
- Stripe Terminal/staff card reader flow is future work.
- Final order closing and receipt/reporting polish are still needed.

### 🟡 11. Kitchen Queue

Build the first restaurant operations screen.

Suggested routes:

```text
/kitchen
/staff/kitchen
```

Focus:

- Show newly submitted dine-in and takeout orders in a live queue.
- Show table label or takeout customer name.
- Show order number, submitted time, items, quantities, and notes.
- Let kitchen mark orders as `IN_PROGRESS`, `READY`, and `COMPLETED`.
- Broadcast order status changes back to table/takeout clients.

Done when:

- Sending a table cart to kitchen makes the order appear without refresh.
- Takeout orders can appear in the same kitchen flow.
- Customers and staff can see order status updates.

Status: 🟡 In progress

- Staff kitchen route exists at `/staff/kitchen`.
- Dine-in and takeout order cards display submitted items, quantities, and context.
- Staff can mark dine-in and takeout orders ready.
- Realtime refresh wiring exists for kitchen queue invalidation events.
- Remaining work: add richer status stages, better visual grouping, kitchen sounds/alerts, and customer-facing order status updates.

### 🟡 12. Customer Menu Item Customization

Make menu item selection feel like a polished ordering app instead of a raw add button.

Suggested surfaces:

```text
/
/menu
/takeout
/table/[token]
```

Focus:

- Clicking a menu item opens an animated item detail modal.
- Modal shows item photo, description, price, quantity controls, ingredients, and common allergy warnings.
- Allergy-prone ingredients should be highlighted clearly before the item is added.
- Closed menu cards should still show a small allergy/customization indicator when relevant.
- Customer can remove optional ingredients.
- Customer can choose allowed swaps or replacements when the owner marks ingredients as swappable.
- Selected removals/swaps/notes should be stored with the cart item and carried into kitchen orders.

Done when:

- A customer can inspect ingredients before adding an item.
- Allergy indicators are visible both on the card and inside the modal.
- Kitchen order cards show customer modifications clearly.

Status: 🟡 In progress

- Animated item detail modals exist for homepage/menu preview, takeout, and table ordering.
- Modal shows ingredients, allergy flags, allergen-only removal options, quantity, and structured spice levels for spicy items.
- Table and takeout cart lines store structured kitchen instructions and removed allergen names for kitchen display.
- Remaining work: ingredient swaps, richer modifier groups, and tighter mobile UI polish.

### ⬜ 13. Staff Orders Dashboard

Build the staff operations hub.

Suggested route:

```text
/staff/orders
```

Focus:

- Show active table sessions.
- Show submitted kitchen orders.
- Show takeout orders.
- Show payment status.
- Let staff help checkout, close, or later void/refund orders.

Done when:

- A server or cashier can understand the current restaurant state without opening the database.

Status: ⬜ Not started

- Build after the kitchen queue creates visible order operations.

### ⬜ 14. Waitlist

Build a host/waitlist flow based on table capacity.

Suggested routes:

```text
/waitlist
/staff/waitlist
/display/waitlist
```

Focus:

- Customer or host can add a party to the waitlist.
- Staff can see party name, phone, party size, wait time, and status.
- Staff can match parties to tables using `DiningTable.tableSize`.
- Staff can notify a party when their table is ready.
- Display page can show public queue updates in the restaurant.

Done when:

- Staff can seat a waitlist party at a suitable table.
- The public display updates when a party is called.

Status: ⬜ Not started

- Build after staff orders and waitlist so the floor view can summarize real operational state.

### ⬜ 15. Table Floor View

Build a table status board for employees.

Suggested route:

```text
/staff/tables
```

Focus:

- Show every table and its current status.
- Status examples: `AVAILABLE`, `OCCUPIED`, `ORDERING`, `IN_KITCHEN`, `READY`, `WAITING_FOR_PAYMENT`.
- Link each occupied table to its active table session and orders.
- Link waitlist seating to table availability.

Done when:

- Staff can glance at one screen and understand the dining room.

Status: ⬜ Not started

- Depends on active table, order, and waitlist data being stable enough to configure.

### 🟡 16. Owner Menu And Restaurant Settings

Make the restaurant self-service for owners.

Suggested routes:

```text
/owner/menu
/owner/settings
/owner/payments
/owner/loyalty
```

Focus:

- Edit menu items, categories, prices, photos, and availability.
- Upload menu item photos without requiring owners to paste image URLs.
- Configure table layout and table capacity.
- Configure Stripe connected account.
- Configure restaurant theme, logo, and menu PDF.
- Configure whether light/dark mode can be toggled by customers.

Done when:

- A restaurant owner can set up and modify the business basics from the UI.

Status: 🟡 In progress

- Owner menu management exists at `/owner/menu`.
- Owners can create/edit menu items and attach ingredients.
- Restaurant theme/logo/menu PDF/settings still need fuller owner-facing controls.
- Build after basic staff operations so rewards can connect to real paid orders.

### ⬜ 17. Loyalty Rules And Rewards

Build the full rewards system on top of customer membership.

Focus:

- Owner/manager can configure points earned per dollar spent.
- Owner/manager can mark selected menu items as loyalty rewards.
- Customer can view points balance and available rewards.
- Paid orders can earn points.
- Reward redemptions subtract points through a ledger entry.

Done when:

- A customer can earn points from a paid order.
- A customer can redeem points for an owner-selected reward item.
- Owner/manager can alter the loyalty conversion rule without code changes.

Status: ⬜ Not started

- Build after checkout, kitchen, and order completion flows are stable.

### ⬜ 18. Reports And CSV Exports

Create simple business reporting before advanced analytics.

Suggested route:

```text
/owner/reports
```

Focus:

- Daily and monthly sales totals.
- Dine-in vs takeout sales.
- Platform fees and payment fees.
- Top menu items.
- CSV exports by month and year.

Done when:

- A restaurant owner can review sales without using Stripe or the database directly.

Status: ⬜ Not started

- Needs finalized production database workflow.

### 🔮 19. Backups

Protect restaurant data.

Focus:

- PostgreSQL dump script.
- Restore script.
- Scheduled backup.
- Optional offsite copy.

Done when:

- A restaurant database can be backed up and restored safely.

Status: 🔮 Later

- Important before real customer production usage.

### 🔮 20. Monitoring And Hardening

Improve operations after core app works.

Focus:

- Keep Prometheus/Grafana monitoring.
- Keep email alerts.
- Harden firewall rules.
- Move from LAN scraping to push-based metrics or VPN when needed.

Done when:

- App health, host health, and backup health are observable.

Status: 🔮 Later

- Keep this after the core restaurant operations loop is usable.

## Learning Rule

Build one vertical slice at a time:

```text
schema -> page/API -> test locally -> deploy with Terraform -> verify on restaurant host
```

Avoid building the whole schema or auth system in one jump. Keep every step small enough to understand, deploy, and debug.
