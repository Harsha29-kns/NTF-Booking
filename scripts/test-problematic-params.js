const hre = require("hardhat");

async function main() {
  console.log("Testing potentially problematic parameters...");
  
  // Get the deployed contract
  const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const TicketSale = await hre.ethers.getContractFactory("TicketSale");
  const contract = TicketSale.attach(contractAddress);
  
  // Get test accounts
  const [owner] = await hre.ethers.getSigners();
  
  console.log("Owner:", owner.address);
  
  try {
    // Test with potentially problematic parameters
    const testCases = [
      {
        name: "Long IPFS URLs",
        eventName: "longurltest",
        organizer: "testorg",
        eventDate: Math.floor(Date.now() / 1000) + 86400,
        saleEndDate: Math.floor(Date.now() / 1000) + 3600,
        price: hre.ethers.parseEther("88.998"),
        totalTickets: 10,
        posterCID: "QmVNDtMXp6S6jGzbGPT5AgALPYh36JYW6nPpHhQHYR6rYm",
        ticketCID: "QmPBdM3LWSihVV1okMB2VZFNgnsmbvWG9hyrZVHmedCsJC"
      },
      {
        name: "High price",
        eventName: "highpricetest",
        organizer: "testorg",
        eventDate: Math.floor(Date.now() / 1000) + 86400,
        saleEndDate: Math.floor(Date.now() / 1000) + 3600,
        price: hre.ethers.parseEther("1000"),
        totalTickets: 100,
        posterCID: "QmTest",
        ticketCID: "QmTest2"
      },
      {
        name: "Special characters in name",
        eventName: "test@#$%",
        organizer: "testorg",
        eventDate: Math.floor(Date.now() / 1000) + 86400,
        saleEndDate: Math.floor(Date.now() / 1000) + 3600,
        price: hre.ethers.parseEther("0.1"),
        totalTickets: 5,
        posterCID: "QmTest",
        ticketCID: "QmTest2"
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n=== Testing: ${testCase.name} ===`);
      
      try {
        // Check if event already exists
        const existingTicketId = await contract.eventToTicketId(testCase.eventName);
        if (existingTicketId.toString() !== "0") {
          console.log("Event already exists, skipping...");
          continue;
        }
        
        const tx = await contract.createSale(
          testCase.eventName,
          testCase.organizer,
          testCase.eventDate,
          testCase.saleEndDate,
          testCase.price,
          testCase.totalTickets,
          testCase.posterCID,
          testCase.ticketCID
        );
        
        console.log("✅ Success!");
        console.log("Transaction hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("Block number:", receipt.blockNumber);
        
      } catch (error) {
        console.log("❌ Failed:", error.message);
      }
    }
    
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





