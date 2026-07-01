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

## Users And Sessions

Use clear business language:

- `Employee`: staff member who logs into the POS.
- `CustomerSession`: temporary QR/table session for guests.
- `DiningTable`: physical table with its own QR code.
- `Order`: active or completed order for a table session.

Do not treat QR customers as permanent users at first. They are temporary table sessions.

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
AuditEvent
MenuItem
MenuItemTranslation
DiningTable
CustomerSession
Order
OrderItem
Payment
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

`AuditEvent` should later store sensitive staff activity:

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

The POS/admin interface can start in English only. The customer QR ordering flow should eventually allow language switching.

Example customer URLs:

```text
/table/abc123?lang=en
/table/abc123?lang=es
/table/abc123?lang=zh
```

Keep translation data in the restaurant database so each restaurant can customize menu names and descriptions.

Do not use machine translation as the source of truth. It can be a future helper, but owners should be able to review/edit customer-visible text.

## Build Order

### 1. Prisma Foundation

Install Prisma and create the initial schema.

Focus:

- Connect Prisma to the existing Postgres `DATABASE_URL`.
- Create migrations.
- Define `RestaurantSettings`, `EmployeeProfile`, `MenuItem`, `MenuItemTranslation`, `DiningTable`, `CustomerSession`, `Order`, and `OrderItem`.

Done when:

- `prisma migrate` creates tables.
- The app can query the database through Prisma.

### 1.5 Multilanguage Menu Foundation

Add the first customer-facing translation layer.

Focus:

- Store default locale in `RestaurantSettings`.
- Store supported locales as restaurant config.
- Store menu item display text in `MenuItemTranslation`.
- Keep price/category/availability on `MenuItem`.

Done when:

- A menu item can have English and one additional language translation.
- The app can query menu items for a requested locale.

### 2. Employee Authentication

Add Better Auth.

Focus:

- Email/password or username/password login for employees.
- Session cookie support.
- Sign in and sign out routes.
- Protect POS and admin pages.
- Tie Better Auth users to `EmployeeProfile`.
- Use employee roles for access control.

Done when:

- Employees can log in.
- Anonymous users cannot access staff pages.
- Staff identity is available to server actions that change orders, payments, menu items, or employees.

### 3. Employee Admin

Build the first owner/admin workflow.

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

### 4. Menu Management

Build restaurant menu data.

Focus:

- Create/edit menu items.
- Enable/disable items.
- Set prices.
- Group items by category.

Done when:

- POS menu comes from Postgres instead of hardcoded arrays.

### 5. Table And QR Flow

Create customer entry points.

Focus:

- Admin can create dining tables.
- Each table has a unique QR token.
- QR URL opens `/table/[code]`.
- Opening QR creates or joins an active `CustomerSession`.

Done when:

- A table can scan a QR code and see its current session.

### 6. Ordering Flow

Build customer and staff order flow.

Focus:

- Customer can add items to a table order.
- Staff can see active table orders.
- Staff can add/remove items.
- Staff can mark order states.

Done when:

- A table order can be created, updated, and viewed by staff.

### 7. Checkout

Close the table lifecycle.

Focus:

- Staff can checkout a table.
- Table session closes.
- Order becomes historical.
- QR link starts fresh session next time.

Done when:

- A full table visit can start, order, and close.

### 8. Backups

Protect restaurant data.

Focus:

- PostgreSQL dump script.
- Restore script.
- Scheduled backup.
- Optional offsite copy.

Done when:

- A restaurant database can be backed up and restored safely.

### 9. Monitoring And Hardening

Improve operations after core app works.

Focus:

- Keep Prometheus/Grafana monitoring.
- Keep email alerts.
- Harden firewall rules.
- Move from LAN scraping to push-based metrics or VPN when needed.

Done when:

- App health, host health, and backup health are observable.

## Learning Rule

Build one vertical slice at a time:

```text
schema -> page/API -> test locally -> deploy with Terraform -> verify on restaurant host
```

Avoid building the whole schema or auth system in one jump. Keep every step small enough to understand, deploy, and debug.
