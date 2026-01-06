const { ethers } = require("hardhat");

async function main() {
  console.log("Testing getMyTickets function...");
  
  const [deployer, user1] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("User1 address:", user1.address);
  
  // Get the contract
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const TicketSale = await ethers.getContractFactory("TicketSale");
  const contract = TicketSale.attach(contractAddress);
  
  console.log("Contract address:", contractAddress);
  
  // Test getMyTickets for deployer
  try {
    console.log("Testing getMyTickets for deployer...");
    const deployerTickets = await contract.getMyTickets();
    console.log("Deployer tickets:", deployerTickets);
    console.log("Deployer tickets length:", deployerTickets.length);
  } catch (error) {
    console.error("Error getting deployer tickets:", error.message);
  }
  
  // Test getMyTickets for user1
  try {
    console.log("Testing getMyTickets for user1...");
    const user1Tickets = await contract.getMyTickets({ from: user1.address });
    console.log("User1 tickets:", user1Tickets);
    console.log("User1 tickets length:", user1Tickets.length);
  } catch (error) {
    console.error("Error getting user1 tickets:", error.message);
  }
  
  // Test with different account
  try {
    console.log("Testing getMyTickets with different signer...");
    const contractWithUser1 = contract.connect(user1);
    const user1Tickets2 = await contractWithUser1.getMyTickets();
    console.log("User1 tickets (with connect):", user1Tickets2);
    console.log("User1 tickets length (with connect):", user1Tickets2.length);
  } catch (error) {
    console.error("Error getting user1 tickets with connect:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });





