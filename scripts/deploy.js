const hre = require("hardhat");

async function main() {
  console.log("Deploying TicketSale contract...");

  const TicketSale = await hre.ethers.getContractFactory("TicketSale");
  const ticketSale = await TicketSale.deploy();

  await ticketSale.waitForDeployment();

  const contractAddress = await ticketSale.getAddress();
  
  console.log("TicketSale deployed to:", contractAddress);
  console.log("Contract address:", contractAddress);
  
  // Save contract address and ABI for frontend
  const fs = require("fs");
  const path = require("path");
  
  // Get ABI from Hardhat artifacts to avoid format ambiguities
  const artifact = await hre.artifacts.readArtifact("TicketSale");

  const contractInfo = {
    address: contractAddress,
    abi: artifact.abi,
    network: hre.network.name,
    deployedAt: new Date().toISOString()
  };
  
  // Create contracts directory in frontend if it doesn't exist
  const frontendContractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }
  
  // Write contract info to frontend
  fs.writeFileSync(
    path.join(frontendContractsDir, "TicketSale.json"),
    JSON.stringify(contractInfo, null, 2)
  );
  
  console.log("Contract info saved to frontend/src/contracts/TicketSale.json");
  
  // Also save to scripts directory
  const scriptsContractsDir = path.join(__dirname, "frontend", "src", "contracts");
  if (!fs.existsSync(scriptsContractsDir)) {
    fs.mkdirSync(scriptsContractsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(scriptsContractsDir, "TicketSale.json"),
    JSON.stringify(contractInfo, null, 2)
  );
  
  console.log("Contract info also saved to scripts/frontend/src/contracts/TicketSale.json");
  
  // Verify contract on Etherscan if on Sepolia
  if (hre.network.name === "sepolia") {
    console.log("Waiting for block confirmations...");
    await ticketSale.deploymentTransaction().wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

