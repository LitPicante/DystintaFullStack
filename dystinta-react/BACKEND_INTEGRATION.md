# DystintaBack API Map

Base URL: `http://localhost:8000/api`

## Auth

- `POST /auth/login/`
  - Body: `{ "username": string, "password": string }`
  - Response: `{ access, refresh, user }`
- `POST /auth/logout/`
  - Body: `{ "refresh": string }`
- `GET /auth/me/`
  - Requires JWT
  - Response: `{ id, username, role, name, is_active }`

## Users

- `GET /users/`
  - Admin only
- `POST /users/`
  - Admin only
  - Body: `{ username, password?, role, name?, is_active? }`
- `PATCH /users/:id/`
  - Admin only
  - Body: partial `{ password?, role?, name?, is_active? }`
- `DELETE /users/:id/`
  - Admin only
- `GET /users/designers/`
  - Admin only
  - Returns active designers

## Orders

- `POST /orders/`
  - Public
  - `multipart/form-data`
  - Fields:
    - `service`
    - `name`
    - `phone`
    - `email`
    - `quantity`
    - `details`
    - `file`
    - `extraData` JSON string
- `GET /orders/`
  - Admin or designer
  - Filters:
    - `status`
    - `service`
    - `assigned_to`
    - `search`
    - `mine=true`
- `GET /orders/stats/`
  - Admin or designer
- `PATCH /orders/:id/`
  - Admin or designer
  - Body: `{ status?, assignedTo?, notes? }`

## Site Content

- `GET /site/public/`
  - Public
  - Returns:
    - `general`
    - `home`
    - `about`
    - `services`
    - `designs`
    - `calc`
    - `contact`
- `GET/PATCH /site/general/`
- `GET/PATCH /site/home/`
- `GET/PATCH /site/about/`
- `GET/PATCH /site/services/`
- `GET/PATCH /site/designs/`
- `GET/PATCH /site/calc/`
- `GET/PATCH /site/contact/`
  - `PATCH` is admin only

## Media

- `GET /media/home-carousel/`
  - Public
  - Returns slots `1..3`
- `POST /media/home-carousel/:slot/`
  - Admin only
  - `multipart/form-data` with `file`
- `DELETE /media/home-carousel/:slot/`
  - Admin only

## Admin Tools

- `GET /admin/export/`
  - Admin only
  - Returns `{ site, users, orders }`
- `POST /admin/import/`
  - Admin only
  - Accepts JSON body or `multipart/form-data` with `file`
- `POST /admin/reset/`
  - Admin only

## Important Notes

- Frontend must send `Authorization: Bearer <access>` for protected endpoints.
- Designers cannot call `/users/designers/`; that endpoint is admin-only.
- Orders use camelCase in the API response for several fields:
  - `fileName`
  - `assignedTo`
  - `extraData`
  - `createdAt`
  - `updatedAt`
- Public site pages should prefer `GET /site/public/` instead of hardcoded content.
