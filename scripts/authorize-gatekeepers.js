// Script to authorize gatekeeper addresses
const hre = require("hardhat");

async function main() {
    console.log("Authorizing gatekeepers...");

    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = await hre.ethers.getContractAt("TicketSale", contractAddress);

    // Get all signers (test accounts)
    const signers = await hre.ethers.getSigners();

    console.log(`\nFound ${signers.length} accounts`);

    // Authorize first 5 accounts as gatekeepers
    for (let i = 0; i < Math.min(5, signers.length); i++) {
        const address = signers[i].address;
        console.log(`\nAuthorizing ${address}...`);

        const tx = await contract.setGatekeeper(address, true);
        await tx.wait();

        const isGatekeeper = await contract.isGatekeeper(address);
        console.log(`✅ ${address} is now gatekeeper: ${isGatekeeper}`);
    }

    console.log("\n✅ All gatekeepers authorized!");
    console.log("\nAuthorized addresses:");
    for (let i = 0; i < Math.min(5, signers.length); i++) {
        console.log(`  ${i}: ${signers[i].address}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
