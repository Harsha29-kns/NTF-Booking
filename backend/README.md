# NFT Ticketing System - Backend API

A Node.js/Express backend API for the NFT Ticketing System with MongoDB integration and blockchain event indexing.

## Features

- **User Management**: Wallet-based authentication with JWT tokens
- **Event Management**: Enhanced event data with off-chain metadata
- **Purchase Tracking**: Complete purchase history and analytics
- **Blockchain Integration**: Real-time event indexing from smart contracts
- **Organizer Features**: Special privileges for event creators
- **Search & Filtering**: Advanced event discovery
- **Analytics**: User and event statistics

## Tech Stack

- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Ethers.js** for blockchain interaction
- **Helmet** for security
- **CORS** for cross-origin requests
- **Rate Limiting** for API protection

## Installation

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Environment Setup**:
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/nft-ticketing
   JWT_SECRET=your-super-secret-jwt-key-here
   CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
   RPC_URL=http://127.0.0.1:8545
   FRONTEND_URL=http://localhost:5173
   ```

3. **Start MongoDB**:
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or install MongoDB locally
   ```

4. **Run the server**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with wallet signature
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify` - Verify JWT token
- `POST /api/auth/refresh` - Refresh JWT token

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/:walletAddress` - Get user by wallet address
- `GET /api/users/:walletAddress/stats` - Get user statistics
- `GET /api/users/:walletAddress/events` - Get user's events
- `POST /api/users/become-organizer` - Become an organizer
- `GET /api/users/organizers/list` - Get list of organizers

### Events
- `GET /api/events` - Get all events with filtering
- `GET /api/events/available` - Get available events
- `GET /api/events/search` - Search events
- `GET /api/events/:ticketId` - Get event by ticket ID
- `POST /api/events` - Create new event (organizers only)
- `PUT /api/events/:ticketId` - Update event metadata
- `DELETE /api/events/:ticketId` - Delete event (soft delete)
- `GET /api/events/categories/list` - Get available categories
- `GET /api/events/featured/list` - Get featured events

### Purchases
- `GET /api/purchases` - Get user's purchases
- `GET /api/purchases/sales` - Get user's sales (organizers)
- `GET /api/purchases/:purchaseId` - Get specific purchase
- `POST /api/purchases` - Create purchase record
- `PUT /api/purchases/:purchaseId/download` - Update with download info
- `PUT /api/purchases/:purchaseId/refund` - Update with refund info
- `POST /api/purchases/:purchaseId/review` - Add review
- `GET /api/purchases/stats/summary` - Get purchase statistics

## Database Models

### User
- Wallet address, username, email
- Profile information and preferences
- Organizer status and verification
- Statistics (tickets purchased, events created, etc.)

### Event
- On-chain data (ticketId, price, dates, etc.)
- Enhanced metadata (description, venue, category)
- Status tracking and analytics
- Search and filtering capabilities

### Purchase
- Complete purchase lifecycle tracking
- Transaction hashes and gas data
- Review and rating system
- Statistics and analytics

## Event Indexer

The event indexer automatically syncs blockchain events with MongoDB:

- **TicketCreated**: Creates event records
- **TicketPurchased**: Updates event status and creates purchase records
- **TicketDownloaded**: Updates purchase status
- **TicketRefunded**: Handles refunds and cancellations

The indexer runs continuously and processes events in real-time.

## Authentication

The API uses wallet-based authentication:

1. User signs a message with their wallet
2. Frontend sends wallet address, signature, and message
3. Backend verifies signature and issues JWT token
4. JWT token is used for subsequent API calls

## Security Features

- **Helmet**: Security headers
- **Rate Limiting**: API request limiting
- **CORS**: Cross-origin request handling
- **Input Validation**: Request data validation
- **JWT**: Secure token-based authentication

## Development

### Project Structure
```
backend/
├── models/          # Mongoose models
├── routes/          # API route handlers
├── middleware/      # Custom middleware
├── services/        # Business logic services
├── server.js        # Main server file
└── package.json     # Dependencies
```

### Adding New Features

1. **Models**: Add new Mongoose schemas in `models/`
2. **Routes**: Create route handlers in `routes/`
3. **Middleware**: Add custom middleware in `middleware/`
4. **Services**: Implement business logic in `services/`

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Deployment

### Environment Variables
- `NODE_ENV=production`
- `MONGODB_URI=mongodb://your-production-db`
- `JWT_SECRET=your-production-secret`
- `CONTRACT_ADDRESS=your-deployed-contract`
- `RPC_URL=your-production-rpc`

### Docker Deployment
```bash
# Build image
docker build -t nft-ticketing-backend .

# Run container
docker run -p 5000:5000 --env-file .env nft-ticketing-backend
```

## Monitoring

The API includes health check endpoints and logging:

- `GET /health` - Health check endpoint
- Console logging for all operations
- Error tracking and reporting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.











