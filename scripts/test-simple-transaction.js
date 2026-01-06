const hre = require("hardhat");

async function main() {
  console.log("Testing simple transaction approach...");
  
  // Get the deployed contract
  const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const TicketSale = await hre.ethers.getContractFactory("TicketSale");
  const contract = TicketSale.attach(contractAddress);
  
  // Get test accounts
  const [owner] = await hre.ethers.getSigners();
  
  console.log("Owner:", owner.address);
  
  try {
    // Use very simple parameters
    const eventName = "simpletest";
    const organizer = "testorg";
    const eventDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
    const saleEndDate = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const price = hre.ethers.parseEther("0.01"); // Very small amount
    const totalTickets = 1; // Just 1 ticket
    const posterCID = "QmTest";
    const ticketCID = "QmTest2";
    
    console.log("Simple test parameters:");
    console.log("- Event:", eventName);
    console.log("- Organizer:", organizer);
    console.log("- Event Date:", new Date(eventDate * 1000));
    console.log("- Sale End Date:", new Date(saleEndDate * 1000));
    console.log("- Price:", hre.ethers.formatEther(price), "ETH");
    console.log("- Total Tickets:", totalTickets);
    console.log("- Poster CID:", posterCID);
    console.log("- Ticket CID:", ticketCID);
    
    // Check if event already exists
    const existingTicketId = await contract.eventToTicketId(eventName);
    console.log("- Existing ticket ID:", existingTicketId.toString());
    
    if (existingTicketId.toString() !== "0") {
      console.log("❌ Event already exists! Trying with different name...");
      const newEventName = "simpletest" + Math.floor(Math.random() * 1000);
      console.log("New event name:", newEventName);
      
      const tx = await contract.createSale(
        newEventName,
        organizer,
        eventDate,
        saleEndDate,
        price,
        totalTickets,
        posterCID,
        ticketCID
      );
      
      console.log("Transaction hash:", tx.hash);
      const receipt = await tx.wait();
      console.log("✅ Success with new event name!");
      console.log("Block number:", receipt.blockNumber);
    } else {
      const tx = await contract.createSale(
        eventName,
        organizer,
        eventDate,
        saleEndDate,
        price,
        totalTickets,
        posterCID,
        ticketCID
      );
      
      console.log("Transaction hash:", tx.hash);
      const receipt = await tx.wait();
      console.log("✅ Success!");
      console.log("Block number:", receipt.blockNumber);
    }
    
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





