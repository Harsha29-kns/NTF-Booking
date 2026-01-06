const hre = require("hardhat");

async function main() {
  console.log("Testing createSale function directly...");
  
  // Get the deployed contract
  const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const TicketSale = await hre.ethers.getContractFactory("TicketSale");
  const contract = TicketSale.attach(contractAddress);
  
  // Get test accounts
  const [owner] = await hre.ethers.getSigners();
  
  console.log("Owner:", owner.address);
  
  try {
    // Test data
    const eventName = "Test Event";
    const organizer = "Test Organizer";
    const eventDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
    const saleEndDate = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const price = hre.ethers.parseEther("0.1"); // 0.1 ETH
    const totalTickets = 10;
    const posterCID = "QmTestPoster";
    const ticketCID = "QmTestTicket";
    
    console.log("Test parameters:");
    console.log("- Event:", eventName);
    console.log("- Organizer:", organizer);
    console.log("- Event Date:", new Date(eventDate * 1000));
    console.log("- Sale End Date:", new Date(saleEndDate * 1000));
    console.log("- Price:", hre.ethers.formatEther(price), "ETH");
    console.log("- Total Tickets:", totalTickets);
    console.log("- Poster CID:", posterCID);
    console.log("- Ticket CID:", ticketCID);
    
    // Estimate gas
    console.log("\nEstimating gas...");
    const gasEstimate = await contract.createSale.estimateGas(
      eventName,
      organizer,
      eventDate,
      saleEndDate,
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
      eventDate,
      saleEndDate,
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
    
    // Check if ticket was created
    const availableTickets = await contract.getAvailableTickets();
    console.log("Available tickets after creation:", availableTickets.length);
    
    if (availableTickets.length > 0) {
      const ticketId = availableTickets[0];
      const ticket = await contract.getTicket(ticketId);
      console.log("Created ticket details:");
      console.log("- ID:", ticketId.toString());
      console.log("- Event:", ticket.eventName);
      console.log("- Available tickets:", ticket.availableTickets.toString());
      console.log("- Total tickets:", ticket.totalTickets.toString());
    }
    
    console.log("\n✅ Test successful!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Full error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });





