const { ethers } = require('ethers');
const Event = require('../models/Event');
const Purchase = require('../models/Purchase');
const User = require('../models/User');

class EventIndexer {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.isRunning = false;
    this.lastProcessedBlock = 0;
    this.pollingInterval = 10000; // 10 seconds
  }

  async initialize() {
    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
      
      // Test connection
      try {
        await this.provider.getBlockNumber();
        console.log('✅ Blockchain connection established');
      } catch (error) {
        console.log('⚠️ Blockchain not available, will retry when connection is established');
        // Don't fail initialization, just log the warning
      }
      
      // Contract ABI (simplified for events we need)
      const contractABI = [
        "event TicketCreated(uint256 indexed ticketId, string eventName, address indexed seller, uint256 price, uint256 eventDate)",
        "event TicketPurchased(uint256 indexed ticketId, address indexed buyer, uint256 price)",
        "event TicketDownloaded(uint256 indexed ticketId, address indexed buyer)",
        "event TicketRefunded(uint256 indexed ticketId, address indexed buyer, uint256 refundAmount)",
        "function getTicket(uint256 ticketId) view returns (tuple(uint256 ticketId, string eventName, string organizer, uint256 eventDate, uint256 saleEndDate, uint256 price, string posterUrl, string ticketImageUrl, address seller, address buyer, bool isSold, bool isDownloaded, bool isRefunded))"
      ];
      
      const contractAddress = process.env.CONTRACT_ADDRESS;
      this.contract = new ethers.Contract(contractAddress, contractABI, this.provider);
      
      console.log('✅ Event indexer initialized');
      console.log(`📋 Contract: ${contractAddress}`);
      console.log(`🔗 RPC: ${process.env.RPC_URL || 'http://127.0.0.1:8545'}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize event indexer:', error);
      return false;
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Event indexer is already running');
      return;
    }

    const initialized = await this.initialize();
    if (!initialized) {
      console.error('❌ Cannot start event indexer - initialization failed');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting event indexer...');
    
    // Get the latest block to start from
    try {
      this.lastProcessedBlock = await this.provider.getBlockNumber();
      console.log(`📦 Starting from block: ${this.lastProcessedBlock}`);
    } catch (error) {
      console.error('❌ Failed to get latest block:', error.message);
      console.log('⏳ Waiting for blockchain connection...');
      this.lastProcessedBlock = 0;
    }

    // Start polling
    this.pollForEvents();
  }

  async pollForEvents() {
    if (!this.isRunning) return;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      if (currentBlock > this.lastProcessedBlock) {
        console.log(`🔍 Processing blocks ${this.lastProcessedBlock + 1} to ${currentBlock}`);
        
        // Process events in batches
        const batchSize = 1000; // Process 1000 blocks at a time
        let fromBlock = this.lastProcessedBlock + 1;
        
        while (fromBlock <= currentBlock) {
          const toBlock = Math.min(fromBlock + batchSize - 1, currentBlock);
          await this.processBlockRange(fromBlock, toBlock);
          fromBlock = toBlock + 1;
        }
        
        this.lastProcessedBlock = currentBlock;
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
        console.log('⏳ Blockchain not available, retrying in 10 seconds...');
      } else {
        console.error('❌ Error polling for events:', error.message);
      }
    }

    // Schedule next poll
    setTimeout(() => this.pollForEvents(), this.pollingInterval);
  }

  async processBlockRange(fromBlock, toBlock) {
    try {
      // Get all events in the block range
      const [ticketCreatedEvents, ticketPurchasedEvents, ticketDownloadedEvents, ticketRefundedEvents] = await Promise.all([
        this.contract.queryFilter('TicketCreated', fromBlock, toBlock),
        this.contract.queryFilter('TicketPurchased', fromBlock, toBlock),
        this.contract.queryFilter('TicketDownloaded', fromBlock, toBlock),
        this.contract.queryFilter('TicketRefunded', fromBlock, toBlock)
      ]);

      // Process each event type
      await Promise.all([
        this.processTicketCreatedEvents(ticketCreatedEvents),
        this.processTicketPurchasedEvents(ticketPurchasedEvents),
        this.processTicketDownloadedEvents(ticketDownloadedEvents),
        this.processTicketRefundedEvents(ticketRefundedEvents)
      ]);

    } catch (error) {
      console.error(`❌ Error processing blocks ${fromBlock}-${toBlock}:`, error);
    }
  }

  async processTicketCreatedEvents(events) {
    for (const event of events) {
      try {
        const { ticketId, eventName, seller, price, eventDate } = event.args;
        
        // Check if event already exists
        const existingEvent = await Event.findOne({ ticketId: ticketId.toString() });
        if (existingEvent) {
          continue;
        }

        // Get full ticket data from contract
        const ticketData = await this.contract.getTicket(ticketId);
        
        // Create or update user
        await User.findOrCreate(seller, { isOrganizer: true });
        
        // Create event record
        const eventRecord = new Event({
          ticketId: ticketId.toString(),
          contractAddress: this.contract.target,
          seller: seller.toLowerCase(),
          eventName: ticketData.eventName,
          organizer: ticketData.organizer,
          eventDate: new Date(Number(ticketData.eventDate) * 1000),
          saleEndDate: new Date(Number(ticketData.saleEndDate) * 1000),
          price: ticketData.price.toString(),
          posterUrl: ticketData.posterUrl,
          ticketImageUrl: ticketData.ticketImageUrl,
          totalTickets: Number(ticketData.totalTickets),
          availableTickets: Number(ticketData.availableTickets),
          isSold: ticketData.isSold,
          isDownloaded: ticketData.isDownloaded,
          isRefunded: ticketData.isRefunded,
          buyer: ticketData.buyer !== ethers.ZeroAddress ? ticketData.buyer : null
        });

        await eventRecord.save();
        console.log(`✅ Indexed TicketCreated event: ${ticketId} - ${eventName}`);

      } catch (error) {
        console.error(`❌ Error processing TicketCreated event:`, error);
      }
    }
  }

  // ==========================================
  //  UPDATED FUNCTION TO FIX ID MISMATCHES
  // ==========================================
  async processTicketPurchasedEvents(events) {
    for (const event of events) {
      try {
        const { ticketId, buyer, price } = event.args;
        const txHash = event.transactionHash.toLowerCase();
        const eventTicketId = parseInt(ticketId); // The REAL ID from Blockchain

        console.log(`🔍 Processing TicketPurchased: ID ${eventTicketId} | Tx: ${txHash}`);
        
        // 1. Update Event Record (Availability)
        await Event.findOneAndUpdate(
          { ticketId: ticketId.toString() },
          { 
            isSold: true, 
            buyer: buyer.toLowerCase() 
          }
        );

        // 2. Find Purchase Record by TX HASH (The source of truth)
        // This finds the record even if the frontend saved the wrong ID (e.g., 6 vs 7)
        let purchase = await Purchase.findOne({ purchaseTxHash: txHash });

        // Fallback: If not found by hash, try ticketId (legacy support)
        if (!purchase) {
             purchase = await Purchase.findOne({ 
                 $or: [
                     { ticketId: eventTicketId },
                     { ticketId: eventTicketId.toString() }
                 ]
             });
        }

        // 3. Auto-Correct DB if Mismatch Found
        if (purchase) {
             if (parseInt(purchase.ticketId) !== eventTicketId) {
                 console.warn(`⚠️ FIXING MISMATCH: Updating DB Ticket ID from ${purchase.ticketId} to ${eventTicketId}`);
                 purchase.ticketId = eventTicketId; // Sync DB with Blockchain
             }

             // Confirm Status
             purchase.status = 'purchased';
             if (!purchase.blockNumber) purchase.blockNumber = {};
             purchase.blockNumber.purchase = event.blockNumber;
             
             await purchase.save();
             console.log(`✅ Synced Purchase Record for Ticket #${eventTicketId}`);
        } else {
             console.warn(`⚠️ Purchase DB record not found for Ticket #${eventTicketId} (Tx: ${txHash})`);
        }
        
        // 4. Update user stats if user exists
        const buyerUser = await User.findOne({ walletAddress: buyer.toLowerCase() });
        if (buyerUser) {
          await buyerUser.updateStats('ticket_purchased', parseFloat(price.toString()));
        }

        console.log(`✅ Indexed TicketPurchased event: ${ticketId} - ${buyer}`);

      } catch (error) {
        console.error(`❌ Error processing TicketPurchased event:`, error);
      }
    }
  }

  async processTicketDownloadedEvents(events) {
    for (const event of events) {
      try {
        const { ticketId, buyer } = event.args;
        
        // Update event record
        await Event.findOneAndUpdate(
          { ticketId: ticketId.toString() },
          { isDownloaded: true }
        );

        // Update purchase record
        const purchase = await Purchase.findOne({
          ticketId: ticketId.toString(),
          buyer: buyer.toLowerCase()
        });

        if (purchase) {
          await purchase.updateStatus('downloaded', event.transactionHash, {
            blockNumber: event.blockNumber
          });
        }

        console.log(`✅ Indexed TicketDownloaded event: ${ticketId} - ${buyer}`);

      } catch (error) {
        console.error(`❌ Error processing TicketDownloaded event:`, error);
      }
    }
  }

  async processTicketRefundedEvents(events) {
    for (const event of events) {
      try {
        const { ticketId, buyer, refundAmount } = event.args;
        
        // Update event record
        await Event.findOneAndUpdate(
          { ticketId: ticketId.toString() },
          { 
            isRefunded: true, 
            status: 'cancelled' 
          }
        );

        // Update purchase record
        const purchase = await Purchase.findOne({
          ticketId: ticketId.toString(),
          buyer: buyer.toLowerCase()
        });

        if (purchase) {
          await purchase.updateStatus('refunded', event.transactionHash, {
            amount: refundAmount.toString(),
            blockNumber: event.blockNumber
          });
        }

        console.log(`✅ Indexed TicketRefunded event: ${ticketId} - ${buyer}`);

      } catch (error) {
        console.error(`❌ Error processing TicketRefunded event:`, error);
      }
    }
  }

  stop() {
    this.isRunning = false;
    console.log('🛑 Event indexer stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastProcessedBlock: this.lastProcessedBlock,
      contractAddress: this.contract?.target,
      rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545'
    };
  }
}

// Create singleton instance
const eventIndexer = new EventIndexer();

// Export functions
const startEventIndexer = () => {
  eventIndexer.start();
};

const stopEventIndexer = () => {
  eventIndexer.stop();
};

const getIndexerStatus = () => {
  return eventIndexer.getStatus();
};

module.exports = {
  startEventIndexer,
  stopEventIndexer,
  getIndexerStatus,
  eventIndexer
};