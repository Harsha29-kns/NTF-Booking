const fs = require('fs');
const path = require('path');

// This script updates the contract address in all necessary files
async function updateContractAddress() {
  try {
    // Read the deployed contract info
    const contractPath = path.join(__dirname, '../artifacts/contracts/TicketSale.sol/TicketSale.json');
    const contractInfo = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    
    // Get the deployed address from the deployment script
    const deployScript = require('./deploy.js');
    
    console.log('Updating contract address in frontend...');
    
    // Update frontend contract file
    const frontendContractPath = path.join(__dirname, '../frontend/src/contracts/TicketSale.json');
    const frontendContract = JSON.parse(fs.readFileSync(frontendContractPath, 'utf8'));
    frontendContract.address = contractInfo.address;
    fs.writeFileSync(frontendContractPath, JSON.stringify(frontendContract, null, 2));
    
    // Update scripts contract file
    const scriptsContractPath = path.join(__dirname, '../scripts/frontend/src/contracts/TicketSale.json');
    const scriptsContract = JSON.parse(fs.readFileSync(scriptsContractPath, 'utf8'));
    scriptsContract.address = contractInfo.address;
    fs.writeFileSync(scriptsContractPath, JSON.stringify(scriptsContract, null, 2));
    
    console.log('✅ Contract address updated successfully!');
    console.log(`📍 New address: ${contractInfo.address}`);
    
  } catch (error) {
    console.error('❌ Error updating contract address:', error);
  }
}

updateContractAddress();





