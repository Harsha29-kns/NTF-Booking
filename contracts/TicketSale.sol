// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract TicketSale is ERC721, ReentrancyGuard, Ownable, Pausable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _ticketIdCounter;
    
    struct Ticket {
        uint256 ticketId;
        string eventName;
        string organizer; // Display name
        uint256 eventDate;
        uint256 saleEndDate;
        uint256 price;
        string posterUrl;
        string ticketImageUrl;
        address seller;   // THIS IS THE ORGANIZER WALLET ADDRESS
        address buyer;
        bool isSold;
        bool isDownloaded;
        bool isRefunded;
        uint256 totalTickets;
        uint256 availableTickets;
    }
    
    mapping(uint256 => Ticket) public tickets;
    mapping(address => mapping(string => bool)) public hasBoughtTicketForEvent;
    mapping(string => uint256) public eventToTicketId;
    
    // Track user purchases
    mapping(address => uint256[]) public userPurchases;
    mapping(address => mapping(uint256 => bool)) public userHasPurchased;
    
    event TicketCreated(
        uint256 indexed ticketId,
        string eventName,
        address indexed seller,
        uint256 price,
        uint256 eventDate
    );
    
    event TicketPurchased(
        uint256 indexed ticketId,
        address indexed buyer,
        uint256 price
    );
    
    event TicketDownloaded(
        uint256 indexed ticketId,
        address indexed buyer
    );
    
    event TicketRefunded(
        uint256 indexed ticketId,
        address indexed buyer,
        uint256 refundAmount
    );

    event TicketTransferred(
        uint256 indexed ticketId,
        address indexed from,
        address indexed to,
        address executedBy
    );
    
    constructor() ERC721("ConcertTicket", "TICKET") {}
    
    function createSale(
        string memory eventName,
        string memory organizer,
        uint256 eventDate,
        uint256 saleEndDate,
        uint256 price,
        uint256 totalTickets,
        string memory posterCID,
        string memory ticketCID
    ) external whenNotPaused {
        require(bytes(eventName).length > 0, "Event name cannot be empty");
        require(bytes(organizer).length > 0, "Organizer cannot be empty");
        require(eventDate > block.timestamp, "Event date must be in the future");
        require(saleEndDate > block.timestamp, "Sale end date must be in the future");
        require(saleEndDate < eventDate, "Sale must end before event");
        require(price > 0, "Price must be greater than 0");
        require(totalTickets > 0, "Total tickets must be greater than 0");
        require(bytes(posterCID).length > 0, "Poster CID cannot be empty");
        require(bytes(ticketCID).length > 0, "Ticket CID cannot be empty");
        
        require(eventToTicketId[eventName] == 0, "Event already exists");
        
        _ticketIdCounter.increment();
        uint256 ticketId = _ticketIdCounter.current();
        
        tickets[ticketId] = Ticket({
            ticketId: ticketId,
            eventName: eventName,
            organizer: organizer,
            eventDate: eventDate,
            saleEndDate: saleEndDate,
            price: price,
            posterUrl: string(abi.encodePacked("ipfs://", posterCID)),
            ticketImageUrl: string(abi.encodePacked("ipfs://", ticketCID)),
            seller: msg.sender, // Organizer Wallet Address
            buyer: address(0),
            isSold: false,
            isDownloaded: false,
            isRefunded: false,
            totalTickets: totalTickets,
            availableTickets: totalTickets
        });
        
        eventToTicketId[eventName] = ticketId;
        
        emit TicketCreated(ticketId, eventName, msg.sender, price, eventDate);
    }
    
    function buyTicket(uint256 ticketId) external payable whenNotPaused nonReentrant {
        Ticket storage ticket = tickets[ticketId];
        
        require(ticket.ticketId != 0, "Ticket does not exist");
        require(!ticket.isRefunded, "Ticket has been refunded");
        require(block.timestamp <= ticket.saleEndDate, "Sale has ended");
        require(msg.value == ticket.price, "Incorrect payment amount");
        require(ticket.availableTickets > 0, "No tickets available");
        
        // Send money to organizer immediately
        payable(ticket.seller).transfer(msg.value);

        // Create a new ticket instance for this purchase
        _ticketIdCounter.increment();
        uint256 newTicketId = _ticketIdCounter.current();
        
        tickets[newTicketId] = Ticket({
            ticketId: newTicketId,
            eventName: ticket.eventName,
            organizer: ticket.organizer,
            eventDate: ticket.eventDate,
            saleEndDate: ticket.saleEndDate,
            price: ticket.price,
            posterUrl: ticket.posterUrl,
            ticketImageUrl: ticket.ticketImageUrl,
            seller: ticket.seller, // Keeps original organizer address
            buyer: msg.sender,
            isSold: true,
            isDownloaded: false,
            isRefunded: false,
            totalTickets: 1, 
            availableTickets: 0 
        });
        
        ticket.availableTickets = ticket.availableTickets - 1;
        
        userPurchases[msg.sender].push(newTicketId);
        userHasPurchased[msg.sender][newTicketId] = true;
        
        emit TicketPurchased(newTicketId, msg.sender, ticket.price);
    }
    
    function downloadTicket(uint256 ticketId) external whenNotPaused nonReentrant {
        Ticket storage ticket = tickets[ticketId];
        
        require(ticket.ticketId != 0, "Ticket does not exist");
        require(ticket.isSold, "Ticket not sold");
        require(ticket.buyer == msg.sender, "Not the ticket buyer");
        require(!ticket.isDownloaded, "Ticket already downloaded");
        require(!ticket.isRefunded, "Ticket has been refunded");
        
        // Mint NFT to buyer
        _safeMint(msg.sender, ticketId);
        
        ticket.isDownloaded = true;
        
        emit TicketDownloaded(ticketId, msg.sender);
    }
    
    // --- UPDATED: Admin Transfer (Now DECENTRALIZED for Organizers) ---
    // Removed 'onlyOwner' modifier. Added check for 'ticket.seller'.
    function adminTransferTicket(address from, address to, uint256 ticketId) external whenNotPaused nonReentrant {
        require(to != address(0), "Cannot transfer to zero address");
        
        Ticket storage ticket = tickets[ticketId];
        require(ticket.ticketId != 0, "Ticket does not exist");
        
        // ✅ SECURITY FIX: Allow Contract Owner OR Event Organizer (Seller)
        require(
            msg.sender == owner() || msg.sender == ticket.seller, 
            "Not authorized: Only Organizer or Admin can transfer"
        );

        // If the ticket is minted (downloaded), 'ownerOf' must match 'from'
        if(ticket.isDownloaded) {
             require(ownerOf(ticketId) == from, "Sender is not ticket owner");
        } else {
             // If not minted yet, we just check our internal record
             require(ticket.buyer == from, "Sender is not ticket buyer");
        }
        
        require(!ticket.isRefunded, "Cannot transfer refunded ticket");

        // 1. Update Internal Mappings for 'from' (Sender)
        userHasPurchased[from][ticketId] = false;
        _removeTicketFromUserList(from, ticketId);

        // 2. Update Internal Mappings for 'to' (Receiver)
        userHasPurchased[to][ticketId] = true;
        userPurchases[to].push(ticketId);

        // 3. Update Ticket Struct Data
        ticket.buyer = to;
        ticket.isDownloaded = false; // Reset download status so new user can claim/get new QR

        // 4. Perform NFT Transfer if it was already minted
        if(_exists(ticketId)) {
            _transfer(from, to, ticketId);
        }

        emit TicketTransferred(ticketId, from, to, msg.sender);
    }

    // Helper to remove ticket ID from user array
    function _removeTicketFromUserList(address user, uint256 ticketId) private {
        uint256[] storage userList = userPurchases[user];
        for (uint256 i = 0; i < userList.length; i++) {
            if (userList[i] == ticketId) {
                userList[i] = userList[userList.length - 1];
                userList.pop();
                break;
            }
        }
    }

    function verifyTicket(uint256 ticketId) external view returns (bool isValid) {
        Ticket memory ticket = tickets[ticketId];
        
        if (ticket.ticketId == 0) return false;
        if (!ticket.isDownloaded) return false;
        if (ticket.isRefunded) return false;
        
        // Check ownership against the NFT owner
        if (ownerOf(ticketId) != msg.sender) return false;
        
        return true;
    }
    
    function updateExpiredTickets() external whenNotPaused nonReentrant {
        uint256 totalTickets = _ticketIdCounter.current();
        
        for (uint256 i = 1; i <= totalTickets; i++) {
            Ticket storage ticket = tickets[i];
            
            if (ticket.ticketId != 0 && 
                !ticket.isRefunded && 
                !ticket.isDownloaded &&
                block.timestamp > ticket.saleEndDate) {
                
                if (ticket.isSold) {
                    ticket.isRefunded = true;
                    emit TicketRefunded(i, ticket.buyer, ticket.price);
                }
            }
        }
    }
    
    function getTicket(uint256 ticketId) external view returns (Ticket memory) {
        require(tickets[ticketId].ticketId != 0, "Ticket does not exist");
        return tickets[ticketId];
    }
    
    function getAvailableTickets() external view returns (uint256[] memory) {
        uint256 totalTickets = _ticketIdCounter.current();
        uint256[] memory availableTickets = new uint256[](totalTickets);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= totalTickets; i++) {
            Ticket memory ticket = tickets[i];
            if (ticket.ticketId != 0 && 
                !ticket.isRefunded &&
                block.timestamp <= ticket.saleEndDate &&
                ticket.availableTickets > 0) {
                availableTickets[count] = i;
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = availableTickets[i];
        }
        
        return result;
    }
    
    function getMyTickets() external view returns (uint256[] memory) {
        uint256[] memory userTickets = userPurchases[msg.sender];
        if (userTickets.length == 0) {
            return new uint256[](0);
        }
        return userTickets;
    }
    
    // --- UPDATED: Allow Organizer to Transfer ---
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        // Allow transfer if it's Minting (from 0), Burning (to 0), 
        // OR if the ADMIN (owner) is doing it, 
        // OR if the ORGANIZER (ticket.seller) is doing it.
        
        // Note: We access tickets[tokenId] to get the seller.
        require(
            from == address(0) || 
            to == address(0) || 
            msg.sender == owner() || 
            msg.sender == tickets[tokenId].seller, 
            "Tickets are non-transferable"
        );
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    function approve(address to, uint256 tokenId) public override {
        revert("Tickets are non-transferable");
    }
    
    function setApprovalForAll(address operator, bool approved) public override {
        revert("Tickets are non-transferable");
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function resetTicketQuantities(uint256 ticketId, uint256 newTotalTickets) external {
        Ticket storage ticket = tickets[ticketId];
        
        require(ticket.ticketId != 0, "Ticket does not exist");
        // Check if caller is Organizer or Admin
        require(msg.sender == ticket.seller || msg.sender == owner(), "Not authorized");
        require(newTotalTickets > 0, "Total tickets must be greater than 0");
        
        ticket.totalTickets = newTotalTickets;
        ticket.availableTickets = newTotalTickets;
    }
    
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}