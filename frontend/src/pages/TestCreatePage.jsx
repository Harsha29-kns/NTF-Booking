import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const TestCreatePage = () => {
  const [isLoading, setIsLoading] = useState(false);

  const testCreateSale = async () => {
    try {
      setIsLoading(true);
      
      // Check if MetaMask is available
      if (!window.ethereum) {
        toast.error('MetaMask not found');
        return;
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get provider and signer
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      console.log('Provider:', provider);
      console.log('Signer:', signer);
      console.log('Signer address:', await signer.getAddress());
      
      // Contract details
      const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
      const contractABI = [
        "function createSale(string memory eventName, string memory organizer, uint256 eventDate, uint256 saleEndDate, uint256 price, uint256 totalTickets, string memory posterCID, string memory ticketCID) external"
      ];
      
      // Create contract instance
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      console.log('Contract:', contract);
      console.log('Contract address:', contract.target);
      
      // Test parameters
      const eventName = "test" + Math.floor(Math.random() * 1000);
      const organizer = "testorg";
      const eventDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const saleEndDate = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const price = ethers.parseEther("0.01");
      const totalTickets = 1;
      const posterCID = "QmTest";
      const ticketCID = "QmTest2";
      
      console.log('Test parameters:', {
        eventName,
        organizer,
        eventDate,
        saleEndDate,
        price: ethers.formatEther(price),
        totalTickets,
        posterCID,
        ticketCID
      });
      
      // Try the transaction
      console.log('Attempting transaction...');
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
      
      console.log('Transaction submitted:', tx.hash);
      toast.success('Transaction submitted!');
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      toast.success('Transaction confirmed!');
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Test Create Sale</h1>
        
        <button
          onClick={testCreateSale}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Create Sale'}
        </button>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>This will test the createSale function with simple parameters.</p>
          <p>Check the browser console for detailed logs.</p>
        </div>
      </div>
    </div>
  );
};

export default TestCreatePage;





