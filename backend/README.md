# Pindrop Backend API Documentation

## Overview

This is the backend API server for the Pindrop Clone project. It provides RESTful APIs for managing templates, businesses, users, and authentication.

## Features

### Authentication
- User registration and login
- JWT token-based authentication
- Password hashing with bcrypt

### Templates
- Create, read, update, delete templates
- Template categorization and filtering
- Template usage tracking

### Businesses
- Business management
- User-business relationships
- Business search and filtering

### API Endpoints

#### Authentication

**POST /api/auth/register**
Create a new user account

Request Body:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

Response:
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**POST /api/auth/login**
Authenticate user

Request Body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**GET /api/auth/me**
Get current user information (header `Authorization: Bearer <token>`)

Response:
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Templates

**GET /api/templates**
Get all templates

Response:
```json
[
  {
    "id": 1,
    "name": "Blue Collar",
    "category": "Industrial",
    "description": "Industrial and construction templates",
    "thumbnail_url": "https://example.com/templates/blue-collar.jpg",
    "price": 0,
    "features": ["gallery", "hours", "pricing", "booking"],
    "languages": ["en", "es", "fr"],
    "created_at": "2023-01-01T00:00:00Z"
  }
]
```

**POST /api/templates**
Create new template

Request Body:
```json
{
  "name": "New Template",
  "category": "Category",
  "industry": "Industry",
  "description": "Template description",
  "thumbnail_url": "https://example.com/template.jpg",
  "price": 0,
  "features": ["feature1", "feature2"],
  "languages": ["en", "es"],
  "created_by": 1
}
```

**GET /api/templates/:id**
Get template by ID

Response:
```json
{
  "id": 1,
  "name": "Blue Collar",
  "category": "Industrial",
  "industry": "Construction",
  "description": "Industrial and construction templates",
  "thumbnail_url": "https://example.com/templates/blue-collar.jpg",
  "price": 0,
  "features": ["gallery", "hours", "pricing", "booking"],
  "languages": ["en", "es", "fr"],
  "created_at": "2023-01-01T00:00:00Z"
}
```

#### Access rules
- `/api/businesses/*` require a token; non-admins only see/create their own businesses (status is always `pending`).
- `GET /api/templates` is public; `POST /api/templates` is admin only.
- Socket.IO connections must pass `auth: { token }`.

#### Businesses

**GET /api/businesses**
Get all businesses

Response:
```json
[
  {
    "id": 1,
    "user_id": 1,
    "name": "Business Name",
    "industry": "Industry",
    "address": "123 Main St",
    "phone": "+1234567890",
    "email": "contact@business.com",
    "website_url": "https://business.com",
    "status": "active",
    "created_at": "2023-01-01T00:00:00Z"
  }
]
```

**POST /api/businesses**
Create new business

Request Body:
```json
{
  "user_id": 1,
  "name": "Business Name",
  "industry": "Industry",
  "address": "123 Main St",
  "phone": "+1234567890",
  "email": "contact@business.com",
  "website_url": "https://business.com",
  "status": "pending"
}
```

## Database Schema

The application uses PostgreSQL with the following tables:

### Users
- `id` (integer, primary key)
- `email` (string, unique)
- `password_hash` (string)
- `first_name` (string)
- `last_name` (string)
- `role` (enum: 'admin', 'customer', 'business')
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `last_login` (timestamp)

### Templates
- `id` (integer, primary key)
- `name` (string)
- `category` (string)
- `industry` (string)
- `description` (text)
- `thumbnail_url` (string)
- `price` (decimal)
- `features` (JSON array)
- `languages` (JSON array)
- `created_at` (timestamp)
- `created_by` (integer, foreign key to users)

### Businesses
- `id` (integer, primary key)
- `user_id` (integer, foreign key to users)
- `name` (string)
- `industry` (string)
- `address` (string)
- `phone` (string)
- `email` (string)
- `website_url` (string)
- `status` (enum: 'pending', 'active', 'inactive')
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run database migrations:
   ```bash
   cp .env.example .env   # puis renseigner DATABASE_URL et JWT_SECRET
   npx prisma migrate dev
   ```
5. Run the application:
   ```bash
   npm run dev
   ```

### Testing

Run tests with:
```bash
npm test
```

### Environment Variables

Create a `.env` file in the backend directory:

```bash
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://username:password@localhost:5432/pindrop
JWT_SECRET=<obligatoire, 16+ caracteres>
BCRYPT_ROUNDS=10
```

## License

This project is licensed under the MIT License.

---

## 6. Frontend Documentation

See the frontend documentation in the main project directory for frontend-specific instructions and development setup.