# MongoDB Setup Guide

## Option 1: Local MongoDB Installation (Recommended for Development)

### Install MongoDB on macOS:
```bash
# Install MongoDB Community Edition
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Verify MongoDB is running
brew services list | grep mongodb
```

### Test the connection:
```bash
# Test if MongoDB is accessible
mongosh
# or
mongo
```

## Option 2: MongoDB Atlas (Cloud - Free Tier)

### 1. Create MongoDB Atlas Account
- Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
- Sign up for a free account
- Create a new cluster (free tier)

### 2. Get Connection String
- Click "Connect" on your cluster
- Choose "Connect your application"
- Copy the connection string

### 3. Update Environment Variables
Edit your `.env` file:
```env
# Replace with your MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cre8hub?retryWrites=true&w=majority
```

## Test Database Connection

After setting up either option, test the connection:

```bash
# Test database connection
npm run test-db

# If successful, start the server
npm run dev
```

## Troubleshooting

### Local MongoDB Issues:
- Make sure MongoDB service is running: `brew services start mongodb-community`
- Check if port 27017 is available: `lsof -i :27017`
- Restart MongoDB: `brew services restart mongodb-community`

### MongoDB Atlas Issues:
- Check if your IP is whitelisted in Atlas
- Verify username and password in connection string
- Ensure cluster is running

### Connection String Format:
```
mongodb://localhost:27017/cre8hub          # Local MongoDB
mongodb+srv://user:pass@cluster.mongodb.net/cre8hub  # MongoDB Atlas
```
