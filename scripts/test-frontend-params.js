const hre = require("hardhat");

async function main() {
  console.log("Testing with frontend parameters...");
  
  // Get the deployed contract
  const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const TicketSale = await hre.ethers.getContractFactory("TicketSale");
  const contract = TicketSale.attach(contractAddress);
  
  // Get test accounts
  const [owner] = await hre.ethers.getSigners();
  
  console.log("Owner:", owner.address);
  
  try {
    // Use the exact parameters from the frontend logs
    const eventName = "hiiq";
    const organizer = "padhu";
    const eventTimestamp = 1761812940; // From frontend logs
    const saleEndTimestamp = 1761571740; // From frontend logs
    const price = hre.ethers.parseEther("88.998"); // 88998000000000000000n from logs
    const totalTickets = 10;
    const posterCID = "QmVNDtMXp6S6jGzbGPT5AgALPYh36JYW6nPpHhQHYR6rYm";
    const ticketCID = "QmPBdM3LWSihVV1okMB2VZFNgnsmbvWG9hyrZVHmedCsJC";
    
    console.log("Frontend parameters:");
    console.log("- Event:", eventName);
    console.log("- Organizer:", organizer);
    console.log("- Event Date:", new Date(eventTimestamp * 1000));
    console.log("- Sale End Date:", new Date(saleEndTimestamp * 1000));
    console.log("- Price:", hre.ethers.formatEther(price), "ETH");
    console.log("- Total Tickets:", totalTickets);
    console.log("- Poster CID:", posterCID);
    console.log("- Ticket CID:", ticketCID);
    
    // Check current time
    const currentTime = Math.floor(Date.now() / 1000);
    console.log("- Current Time:", new Date(currentTime * 1000));
    console.log("- Current Timestamp:", currentTime);
    
    // Check if event already exists
    const existingTicketId = await contract.eventToTicketId(eventName);
    console.log("- Existing ticket ID for this event:", existingTicketId.toString());
    
    if (existingTicketId.toString() !== "0") {
      console.log("❌ Event already exists! This is why the transaction is failing.");
      return;
    }
    
    // Validate dates
    if (eventTimestamp <= currentTime) {
      console.log("❌ Event date is not in the future!");
      return;
    }
    
    if (saleEndTimestamp <= currentTime) {
      console.log("❌ Sale end date is not in the future!");
      return;
    }
    
    if (saleEndTimestamp >= eventTimestamp) {
      console.log("❌ Sale end date must be before event date!");
      return;
    }
    
    console.log("✅ All validations passed");
    
    // Estimate gas
    console.log("\nEstimating gas...");
    const gasEstimate = await contract.createSale.estimateGas(
      eventName,
      organizer,
      eventTimestamp,
      saleEndTimestamp,
      price,
      totalTickets,
      posterCID,
      ticketCID
    );
    
    console.log("Gas estimate:", gasEstimate.toString());
    
    // Create sale
    console.log("\nCreating sale...");
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
        gasLimit: gasEstimate
      }
    );
    
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    console.log("\n✅ Test successful!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.message.includes("Event already exists")) {
      console.log("💡 Try using a different event name in the frontend");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });





