require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || "https://eth-sepolia.g.alchemy.com/v2/GdfsuH5R95RxnDYmgxfUy",
      // Only use PRIVATE_KEY if it looks valid (64 hex chars). Accept both with/without 0x
      accounts: (() => {
        const pk = process.env.PRIVATE_KEY || "";
        const normalized = pk.startsWith("0x") ? pk.slice(2) : pk;
        if (/^[0-9a-fA-F]{64}$/.test(normalized)) {
          return [pk.startsWith("0x") ? pk : `0x${pk}`];
        }
        return [];
      })(),
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};

