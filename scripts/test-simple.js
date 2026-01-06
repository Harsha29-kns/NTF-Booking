const { ethers } = require("hardhat");

async function main() {
  console.log("Testing simple transaction...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Get the contract
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const TicketSale = await ethers.getContractFactory("TicketSale");
  const contract = TicketSale.attach(contractAddress);
  
  console.log("Contract address:", contractAddress);
  
  // Test a simple call first
  try {
    console.log("Testing getAvailableTickets...");
    const availableTickets = await contract.getAvailableTickets();
    console.log("Available tickets:", availableTickets.length);
    console.log("✅ Contract is accessible");
  } catch (error) {
    console.error("❌ Contract call failed:", error.message);
    return;
  }
  
  // Test creating a simple sale
  try {
    console.log("Testing createSale with minimal parameters...");
    
    const tx = await contract.createSale(
      "Test Event",
      "Test Organizer", 
      Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      Math.floor(Date.now() / 1000) + 1800, // 30 minutes from now
      ethers.parseEther("0.01"), // 0.01 ETH
      1, // 1 ticket
      "QmTestPoster",
      "QmTestTicket"
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





