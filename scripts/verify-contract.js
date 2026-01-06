const hre = require("hardhat");

async function main() {
  console.log("Verifying contract deployment...");
  
  // Get the deployed contract
  const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const TicketSale = await hre.ethers.getContractFactory("TicketSale");
  const contract = TicketSale.attach(contractAddress);
  
  try {
    // Test basic contract functions
    console.log("Contract address:", contractAddress);
    
    // Check if contract is deployed
    const code = await hre.ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      console.log("❌ Contract not deployed at this address");
      return;
    }
    console.log("✅ Contract is deployed");
    
    // Test getAvailableTickets
    const availableTickets = await contract.getAvailableTickets();
    console.log("Available tickets:", availableTickets.length);
    
    if (availableTickets.length > 0) {
      console.log("Ticket IDs:", availableTickets.map(id => id.toString()));
      
      // Test getTicket for first ticket
      const ticketId = availableTickets[0];
      const ticket = await contract.getTicket(ticketId);
      console.log("First ticket details:");
      console.log("- Event:", ticket.eventName);
      console.log("- Available tickets:", ticket.availableTickets.toString());
      console.log("- Total tickets:", ticket.totalTickets.toString());
    } else {
      console.log("No tickets found. You need to create a ticket first.");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
