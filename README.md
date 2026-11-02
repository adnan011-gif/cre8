# Cre8Hub Backend

A comprehensive backend API for the Cre8Hub application built with Node.js, Express, and MongoDB.

## 🚀 Features

- **User Authentication**: JWT-based authentication with sign-in/sign-up
- **Unified User Model**: Single MongoDB model with embedded profile data
- **Role-Based Profiles**: Support for content creators, entrepreneurs, and social media managers
- **Security**: Rate limiting, CORS, helmet security headers
- **Modular Architecture**: Clean separation of routes, controllers, services, and models

## 📁 Project Structure

```
Cre8Hub/
├── Backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js              # MongoDB connection
│   │   ├── models/
│   │   │   └── userModel.js             # Unified User model
│   │   ├── middleware/
│   │   │   ├── auth.js                  # JWT authentication
│   │   │   ├── errorHandler.js          # Global error handling
│   │   │   └── validation.js            # Request validation
│   │   ├── routes/
│   │   │   └── userRoutes.js            # User & auth routes
│   │   ├── controllers/
│   │   │   └── userController.js        # User business logic
│   │   ├── services/
│   │   │   └── userService.js           # User service layer
│   │   ├── utils/
│   │   │   └── jwt.js                   # JWT utilities
│   │   ├── database/
│   │   │   └── seed.js                  # Sample data seeding
│   │   └── server.js                    # Main server
│   ├── package.json
│   ├── env.example
│   └── README.md
└── Frontend/
    └── ... (React frontend)
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Cre8Hub/Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/cre8hub
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB** (if using local MongoDB)
   ```bash
   # Start MongoDB service
   mongod
   ```

5. **Seed the database** (optional)
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔐 API Endpoints

### Authentication
- `POST /api/users/signin` - User sign in
- `POST /api/users/signup` - User sign up
- `POST /api/users/refresh-token` - Refresh JWT token
- `POST /api/users/logout` - User logout

### User Profile
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update basic user info
- `PUT /api/users/profile/role-specific` - Update role-specific profile
- `DELETE /api/users/account` - Delete user account

### Persona & Outputs
- `PUT /api/users/persona` - Update persona data
- `POST /api/users/past-outputs` - Add past output

### Admin
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:userId` - Get user by ID (admin only)

## 🧪 Sample Data

After running `npm run seed`, you can test with these credentials:

- **Content Creator**: `john.doe@example.com` / `Password123!`
- **Entrepreneur**: `jane.smith@example.com` / `Password123!`
- **Social Media Manager**: `mike.johnson@example.com` / `Password123!`
- **Admin**: `admin@cre8hub.com` / `Admin123!`

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configurable cross-origin requests
- **Helmet Security**: Security headers
- **Input Validation**: Request data validation

## 🗄️ Database Schema

The application uses a unified User model with embedded profile data:

- **Basic User Info**: email, password, fullName, userRole
- **Content Creator Profile**: contentGenre, bio, socialMediaLinks, contentStats
- **Entrepreneur Profile**: businessCategory, businessDescription, targetMarket
- **Social Media Manager Profile**: clientType, services, experience
- **Persona Data**: personalityTraits, communicationStyle, contentPreferences
- **Past Outputs**: Array of generated content and videos

## 🚀 Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data
- `npm test` - Run tests (when implemented)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/cre8hub` |
| `JWT_SECRET` | JWT signing secret | Required |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue in the GitHub repository or contact the development team. # Cre8hub
