const { ethers } = require('ethers');
const contractInfo = require('../../frontend/src/contracts/TicketSale.json');

// Get read-only contract instance (no signer needed)
function getContractReadOnly() {
    const provider = new ethers.JsonRpcProvider(
        process.env.RPC_URL || 'http://127.0.0.1:8545'
    );

    const contractAddress = process.env.CONTRACT_ADDRESS || contractInfo.address;
    const contract = new ethers.Contract(
        contractAddress,
        contractInfo.abi,
        provider
    );

    return contract;
}

// Get contract instance with signer (for write operations)
async function getContractWithSigner(privateKey) {
    const provider = new ethers.JsonRpcProvider(
        process.env.RPC_URL || 'http://127.0.0.1:8545'
    );

    const wallet = new ethers.Wallet(privateKey, provider);
    const contractAddress = process.env.CONTRACT_ADDRESS || contractInfo.address;
    const contract = new ethers.Contract(
        contractAddress,
        contractInfo.abi,
        wallet
    );

    return contract;
}

module.exports = {
    getContractReadOnly,
    getContractWithSigner
};
