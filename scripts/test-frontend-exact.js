const { ethers } = require("hardhat");

async function main() {
  console.log("Testing with exact frontend parameters...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Get the contract
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const TicketSale = await ethers.getContractFactory("TicketSale");
  const contract = TicketSale.attach(contractAddress);
  
  // Test with the exact parameters from the error
  const eventName = "test32";
  const organizer = "testorg";
  const eventDate = 1761813420; // This is the timestamp from the error
  const saleEndDate = 1761640620; // This is the timestamp from the error
  const price = ethers.parseEther("0.01"); // 0.01 ETH
  const totalTickets = 1;
  const posterCID = "QmTest";
  const ticketCID = "QmTest2";
  
  console.log("Parameters:", {
    eventName,
    organizer,
    eventDate,
    saleEndDate,
    price: ethers.formatEther(price),
    totalTickets,
    posterCID,
    ticketCID
  });
  
  try {
    console.log("Attempting createSale with exact frontend parameters...");
    
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
    console.log("✅ Transaction submitted successfully");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    
  } catch (error) {
    console.error("❌ Transaction failed:", error.message);
    console.error("Full error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });





