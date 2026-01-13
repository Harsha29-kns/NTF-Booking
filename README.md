# NFT Ticketing System – Complete Setup Guide

A complete **NFT-based ticketing system** built with **React, Node.js, MongoDB, and Ethereum smart contracts**.  
This system allows event organizers to create and sell NFT tickets, while users can purchase, download, transfer (once), and verify tickets on the blockchain.

---

## 🌟 New Features & Policies

We have implemented strict enforcement policies to ensure fair usage and prevent scalping:

- 🚫 **One-Time Transfer Policy**  
  Tickets can be transferred **only once**. After the first transfer, the ticket becomes permanently locked to the new owner’s wallet and is marked as **Second Hand**.

- 👤 **1 Ticket Per Wallet (Per Event)**  
  A single wallet address can hold **only one active ticket per event**.

- 🔄 **Transparent Transfer History**  
  Transferred tickets display the **“Transferred From”** wallet address.

- 🔗 **On-Chain Enforcement**  
  All rules (transfer limits, purchase caps) are enforced **directly in the smart contract**, making them tamper-proof.

- ⚡ **Auto-Sync Ownership**  
  Backend automatically verifies real-time blockchain ownership and updates the database even if transfers occur outside the app.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)  
- **MongoDB** (v4.4 or higher – local or Docker)  
- **Git**  
- **MetaMask** browser extension  

---

## 1️⃣ Clone & Install

```bash
git clone <your-repository-url>
cd nft-ticketing-system

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..


### 2. Environment Setup

#### Root Environment (.env)
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Private key of the account to deploy from (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Sepolia RPC URL (Infura or Alchemy)
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# OR
# SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Gas reporting (optional)
REPORT_GAS=true

# IPFS Configuration
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
# OR use NFT.Storage
NFT_STORAGE_TOKEN=your_nft_storage_token_here
```

#### Backend Environment
```bash
cd backend
cp env.example .env
```

Edit `backend/.env`:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/nft-ticketing
MONGODB_TEST_URI=mongodb://localhost:27017/nft-ticketing-test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Blockchain Configuration
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337

# IPFS Configuration
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

#### Frontend Environment
```bash
cd frontend
cp env.example .env
```

Edit `frontend/.env`:
```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# IPFS Configuration
VITE_IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# App Configuration
VITE_APP_NAME=NFT Ticketing System
VITE_APP_VERSION=1.0.0
```

### 3. Start MongoDB

#### Option A: Using Docker (Recommended)
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### Option B: Local Installation
1. Download MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Install and start MongoDB service
3. Ensure it's running on `mongodb://localhost:27017`

### 4. Quick Start (All-in-One)

#### Windows (PowerShell)
```powershell
# Start all services at once
.\scripts\start-dev.ps1

# Check status
.\scripts\check-status.ps1

# Stop all services
.\scripts\stop-dev.ps1
```

#### Manual Start (All Platforms)
```bash
# Terminal 1: Start local blockchain
npx hardhat node

# Terminal 2: Deploy contract
npx hardhat run scripts/deploy.js --network localhost

# Terminal 3: Start backend
cd backend
npm run dev

# Terminal 4: Start frontend
cd frontend
npm run dev
```

## 🦊 MetaMask Setup

### 1. Install MetaMask
1. Go to [metamask.io](https://metamask.io/)
2. Click "Download" and install the browser extension
3. Create a new wallet or import existing wallet

### 2. Add Local Network (for Development)
1. Open MetaMask extension
2. Click on network dropdown (top of MetaMask)
3. Click "Add network" → "Add network manually"
4. Fill in the details:
   ```
   Network Name: Hardhat Local
   RPC URL: http://127.0.0.1:8545
   Chain ID: 31337
   Currency Symbol: ETH
   Block Explorer URL: (leave empty)
   ```
5. Click "Save"

### 3. Import Test Account (for Development)
When you run `npx hardhat node`, you'll see test accounts with private keys. Import one:

1. In MetaMask, click account icon → "Import Account"
2. Select "Private Key"
3. Paste the private key from Hardhat output (without 0x prefix)
4. Click "Import"

**Example test account from Hardhat:**
```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 4. Get Test ETH (for Sepolia Testnet)
If deploying to Sepolia testnet:

1. Switch MetaMask to Sepolia network
2. Get test ETH from faucets:
   - [Sepolia Faucet](https://sepoliafaucet.com/)
   - [Alchemy Faucet](https://sepoliafaucet.com/)
   - [Chainlink Faucet](https://faucets.chain.link/sepolia)

## 🌐 API Keys Setup

### 1. Infura/Alchemy (RPC Provider)
1. Sign up at [Infura](https://infura.io/) or [Alchemy](https://alchemy.com/)
2. Create a new project
3. Copy the API key
4. Add to `.env`:
   ```env
   SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   ```

### 2. Etherscan (Contract Verification)
1. Sign up at [Etherscan](https://etherscan.io/)
2. Go to API Keys section
3. Create a new API key
4. Add to `.env`:
   ```env
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

### 3. Pinata (IPFS Storage)
1. Sign up at [Pinata](https://pinata.cloud/)
2. Go to API Keys in dashboard
3. Create new API key and secret
4. Add to `.env`:
   ```env
   PINATA_API_KEY=your_pinata_api_key
   PINATA_SECRET_KEY=your_pinata_secret_key
   ```

## 🚀 Deployment Options

### Local Development (Recommended for Testing)
```bash
# Start local blockchain
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Start backend and frontend
cd backend && npm run dev
cd frontend && npm run dev
```

### Sepolia Testnet (Public Testing)
```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Update contract address in backend/.env
# Update frontend to use Sepolia network
```

### Mainnet (Production)
```bash
# Deploy to mainnet
npx hardhat run scripts/deploy.js --network mainnet

# Update all configurations for production
```

## 📱 Application URLs

After starting all services:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Blockchain**: http://localhost:8545
- **MongoDB**: mongodb://localhost:27017/nft-ticketing

## 🎯 How to Use

### For Event Organizers
1. **Connect Wallet**: Connect your MetaMask wallet
2. **Become Organizer**: Apply to become an organizer
3. **Create Event**: Set up your event with details and media
4. **Manage Sales**: Monitor ticket sales and revenue

### For Users
1. **Connect Wallet**: Connect your MetaMask wallet
2. **Browse Events**: Explore available events
3. **Purchase Tickets**: Buy tickets with ETH
4. **Download NFTs**: Download your NFT tickets
5. **Verify Tickets**: Verify ticket authenticity

## 🔧 Troubleshooting

### Common Issues

#### 1. "Insufficient funds" Error
- **Local**: Use test accounts from Hardhat (they have unlimited ETH)
- **Sepolia**: Get test ETH from faucets
- **Mainnet**: Ensure you have enough ETH for gas fees

#### 2. "Transaction failed" Error
- Check gas limit and gas price
- Verify contract is not paused
- Ensure you're on the correct network

#### 3. "Contract not found" Error
- Verify contract deployment was successful
- Check contract address in backend/.env
- Ensure correct network in MetaMask

#### 4. MongoDB Connection Issues
- Ensure MongoDB is running: `docker ps` (if using Docker)
- Check MongoDB URI in backend/.env
- Verify MongoDB service is started

#### 5. Frontend Not Loading
- Check if backend is running on port 5000
- Verify VITE_API_URL in frontend/.env
- Check browser console for errors

### Reset Everything
```bash
# Stop all services
.\scripts\stop-dev.ps1  # Windows
# or manually close all terminal windows

# Reset MongoDB
docker stop mongodb && docker rm mongodb
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Clear node_modules and reinstall
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Restart everything
.\scripts\start-dev.ps1  # Windows
```

## 🧪 Testing

### Smart Contract Tests
```bash
npx hardhat test
```

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📊 Project Structure

```
nft-ticketing-system/
├── contracts/           # Smart contracts
│   └── TicketSale.sol
├── backend/            # Backend API
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   └── middleware/     # Custom middleware
├── frontend/           # React frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   ├── contexts/   # React contexts
│   │   ├── services/   # API services
│   │   └── utils/      # Utility functions
│   └── public/
├── scripts/            # Deployment scripts
└── test/              # Test files
```

## 🔒 Security Notes

- **Never commit private keys** to version control
- **Use environment variables** for sensitive data
- **Test thoroughly** on testnets before mainnet
- **Keep dependencies updated** for security patches
- **Use hardware wallets** for production deployments

## 🆘 Support

If you encounter issues:

1. **Check the troubleshooting section** above
2. **Review logs** in terminal windows
3. **Check browser console** for frontend errors
4. **Verify all services** are running correctly
5. **Create an issue** on GitHub with detailed information

## 📈 Features

### For Event Organizers
- **Create Events**: Set up events with custom details, pricing, and media
- **Manage Sales**: Track ticket sales and revenue
- **Organizer Profiles**: Professional profiles with verification status
- **Analytics**: Detailed statistics on events and sales

### For Users
- **Browse Events**: Discover and search for events
- **Purchase Tickets**: Buy tickets with cryptocurrency
- **NFT Tickets**: Receive unique NFT tickets as proof of purchase
- **Verify Tickets**: Verify ticket authenticity and ownership
- **User Profiles**: Personal profiles with purchase history

### Technical Features
- **Blockchain Integration**: Smart contracts for ticket creation and sales
- **IPFS Storage**: Decentralized storage for event media
- **Real-time Sync**: Automatic synchronization between blockchain and database
- **Wallet Authentication**: Secure wallet-based authentication
- **Responsive Design**: Mobile-friendly interface

---

**Built with ❤️ for the decentralized future of event ticketing**

## 🎉 You're Ready!

Once everything is set up, you can:
1. Open http://localhost:5173 in your browser
2. Connect your MetaMask wallet
3. Create events or purchase tickets
4. Experience the full NFT ticketing system!

Happy coding! 🚀