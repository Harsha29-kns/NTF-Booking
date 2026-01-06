const hre = require("hardhat");

async function main() {
  console.log("Simulating MetaMask transaction...");
  
  // Get the deployed contract
  const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const TicketSale = await hre.ethers.getContractFactory("TicketSale");
  const contract = TicketSale.attach(contractAddress);
  
  // Get test accounts
  const [owner] = await hre.ethers.getSigners();
  
  console.log("Owner:", owner.address);
  
  try {
    // Use the exact parameters from the latest frontend attempt
    const eventName = "hiiqq"; // From the transaction data
    const organizer = "padhu";
    const eventTimestamp = 1761813240; // From transaction data
    const saleEndTimestamp = 1761573240; // From transaction data
    const price = hre.ethers.parseEther("88.998");
    const totalTickets = 10;
    const posterCID = "QmZ8eriU1fGjp4fKxM7Gskj8h4dubXtxmMxmjWJq6yGHLBM";
    const ticketCID = "QmZDrAvYxR3YvaLBvn9xHcBuqNNtEbHYfQMKBRCpjY2R4";
    
    console.log("Transaction parameters:");
    console.log("- Event:", eventName);
    console.log("- Organizer:", organizer);
    console.log("- Event Date:", new Date(eventTimestamp * 1000));
    console.log("- Sale End Date:", new Date(saleEndTimestamp * 1000));
    console.log("- Price:", hre.ethers.formatEther(price), "ETH");
    console.log("- Total Tickets:", totalTickets);
    console.log("- Poster CID:", posterCID);
    console.log("- Ticket CID:", ticketCID);
    
    // Check if event already exists
    const existingTicketId = await contract.eventToTicketId(eventName);
    console.log("- Existing ticket ID:", existingTicketId.toString());
    
    if (existingTicketId.toString() !== "0") {
      console.log("❌ Event already exists! This is the problem.");
      return;
    }
    
    // Try different gas limits
    const gasLimits = [400000, 500000, 600000];
    
    for (const gasLimit of gasLimits) {
      try {
        console.log(`\nTrying with gas limit: ${gasLimit}`);
        
        const tx = await contract.createSale(
          eventName,
          organizer,
          eventTimestamp,
          saleEndTimestamp,
          price,
          totalTickets,
          posterCID,
          ticketCID,
          {
            gasLimit: gasLimit
          }
        );
        
        console.log("Transaction hash:", tx.hash);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("✅ Success with gas limit:", gasLimit);
        console.log("Block number:", receipt.blockNumber);
        
        return; // Exit on success
        
      } catch (error) {
        console.log(`❌ Failed with gas limit ${gasLimit}:`, error.message);
      }
    }
    
    console.log("\n❌ All gas limit attempts failed");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });





