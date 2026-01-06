const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketSale", function () {
  let ticketSale;
  let owner;
  let seller;
  let buyer1;
  let buyer2;
  let addrs;

  beforeEach(async function () {
    [owner, seller, buyer1, buyer2, ...addrs] = await ethers.getSigners();
    
    const TicketSale = await ethers.getContractFactory("TicketSale");
    ticketSale = await TicketSale.deploy();
    await ticketSale.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await ticketSale.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await ticketSale.name()).to.equal("ConcertTicket");
      expect(await ticketSale.symbol()).to.equal("TICKET");
    });
  });

  describe("Ticket Creation", function () {
    it("Should create a ticket sale successfully", async function () {
      const eventName = "Rock Concert 2024";
      const organizer = "Music Events Inc";
      const eventDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const saleEndDate = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const price = ethers.parseEther("0.1");
      const posterCID = "QmPoster123";
      const ticketCID = "QmTicket123";

      await expect(
        ticketSale.connect(seller).createSale(
          eventName,
          organizer,
          eventDate,
          saleEndDate,
          price,
          posterCID,
          ticketCID
        )
      ).to.emit(ticketSale, "TicketCreated")
        .withArgs(1, eventName, seller.address, price, eventDate);

      const ticket = await ticketSale.getTicket(1);
      expect(ticket.eventName).to.equal(eventName);
      expect(ticket.organizer).to.equal(organizer);
      expect(ticket.price).to.equal(price);
      expect(ticket.seller).to.equal(seller.address);
      expect(ticket.isSold).to.be.false;
    });

    it("Should reject ticket creation with invalid parameters", async function () {
      const eventDate = Math.floor(Date.now() / 1000) + 86400;
      const saleEndDate = Math.floor(Date.now() / 1000) + 3600;
      const price = ethers.parseEther("0.1");

      // Empty event name
      await expect(
        ticketSale.connect(seller).createSale(
          "",
          "Organizer",
          eventDate,
          saleEndDate,
          price,
          "posterCID",
          "ticketCID"
        )
      ).to.be.revertedWith("Event name cannot be empty");

      // Past event date
      await expect(
        ticketSale.connect(seller).createSale(
          "Event",
          "Organizer",
          Math.floor(Date.now() / 1000) - 3600,
          saleEndDate,
          price,
          "posterCID",
          "ticketCID"
        )
      ).to.be.revertedWith("Event date must be in the future");

      // Sale end after event
      await expect(
        ticketSale.connect(seller).createSale(
          "Event",
          "Organizer",
          eventDate,
          eventDate + 3600,
          price,
          "posterCID",
          "ticketCID"
        )
      ).to.be.revertedWith("Sale must end before event");
    });

    it("Should prevent duplicate events", async function () {
      const eventName = "Unique Event";
      const eventDate = Math.floor(Date.now() / 1000) + 86400;
      const saleEndDate = Math.floor(Date.now() / 1000) + 3600;
      const price = ethers.parseEther("0.1");

      await ticketSale.connect(seller).createSale(
        eventName,
        "Organizer",
        eventDate,
        saleEndDate,
        price,
        "posterCID",
        "ticketCID"
      );

      await expect(
        ticketSale.connect(seller).createSale(
          eventName,
          "Another Organizer",
          eventDate + 86400,
          saleEndDate + 3600,
          price,
          "posterCID2",
          "ticketCID2"
        )
      ).to.be.revertedWith("Event already exists");
    });
  });

  describe("Ticket Purchase", function () {
    let ticketId;
    const price = ethers.parseEther("0.1");

    beforeEach(async function () {
      const eventDate = Math.floor(Date.now() / 1000) + 86400;
      const saleEndDate = Math.floor(Date.now() / 1000) + 3600;

      await ticketSale.connect(seller).createSale(
        "Test Event",
        "Test Organizer",
        eventDate,
        saleEndDate,
        price,
        "posterCID",
        "ticketCID"
      );
      ticketId = 1;
    });

    it("Should allow ticket purchase with correct payment", async function () {
      await expect(
        ticketSale.connect(buyer1).buyTicket(ticketId, { value: price })
      ).to.emit(ticketSale, "TicketPurchased")
        .withArgs(ticketId, buyer1.address, price);

      const ticket = await ticketSale.getTicket(ticketId);
      expect(ticket.buyer).to.equal(buyer1.address);
      expect(ticket.isSold).to.be.true;
    });

    it("Should reject purchase with incorrect payment amount", async function () {
      await expect(
        ticketSale.connect(buyer1).buyTicket(ticketId, { value: ethers.parseEther("0.05") })
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("Should prevent multiple purchases for same event", async function () {
      await ticketSale.connect(buyer1).buyTicket(ticketId, { value: price });

      await expect(
        ticketSale.connect(buyer1).buyTicket(ticketId, { value: price })
      ).to.be.revertedWith("Already bought ticket for this event");
    });

    it("Should prevent purchase of already sold ticket", async function () {
      await ticketSale.connect(buyer1).buyTicket(ticketId, { value: price });

      await expect(
        ticketSale.connect(buyer2).buyTicket(ticketId, { value: price })
      ).to.be.revertedWith("Ticket already sold");
    });
  });

  describe("Ticket Download", function () {
    let ticketId;
    const price = ethers.parseEther("0.1");

    beforeEach(async function () {
      const eventDate = Math.floor(Date.now() / 1000) + 86400;
      const saleEndDate = Math.floor(Date.now() / 1000) + 3600;

      await ticketSale.connect(seller).createSale(
        "Test Event",
        "Test Organizer",
        eventDate,
        saleEndDate,
        price,
        "posterCID",
        "ticketCID"
      );
      ticketId = 1;
      await ticketSale.connect(buyer1).buyTicket(ticketId, { value: price });
    });

    it("Should allow ticket download and mint NFT", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

      await expect(
        ticketSale.connect(buyer1).downloadTicket(ticketId)
      ).to.emit(ticketSale, "TicketDownloaded")
        .withArgs(ticketId, buyer1.address);

      // Check NFT ownership
      expect(await ticketSale.ownerOf(ticketId)).to.equal(buyer1.address);

      // Check funds released to seller
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter).to.be.greaterThan(sellerBalanceBefore);

      const ticket = await ticketSale.getTicket(ticketId);
      expect(ticket.isDownloaded).to.be.true;
    });

    it("Should prevent download by non-buyer", async function () {
      await expect(
        ticketSale.connect(buyer2).downloadTicket(ticketId)
      ).to.be.revertedWith("Not the ticket buyer");
    });

    it("Should prevent double download", async function () {
      await ticketSale.connect(buyer1).downloadTicket(ticketId);

      await expect(
        ticketSale.connect(buyer1).downloadTicket(ticketId)
      ).to.be.revertedWith("Ticket already downloaded");
    });
  });

  describe("Ticket Verification", function () {
    let ticketId;
    const price = ethers.parseEther("0.1");

    beforeEach(async function () {
      const eventDate = Math.floor(Date.now() / 1000) + 86400;
      const saleEndDate = Math.floor(Date.now() / 1000) + 3600;

      await ticketSale.connect(seller).createSale(
        "Test Event",
        "Test Organizer",
        eventDate,
        saleEndDate,
        price,
        "posterCID",
        "ticketCID"
      );
      ticketId = 1;
      await ticketSale.connect(buyer1).buyTicket(ticketId, { value: price });
      await ticketSale.connect(buyer1).downloadTicket(ticketId);
    });

    it("Should verify valid ticket ownership", async function () {
      expect(await ticketSale.connect(buyer1).verifyTicket(ticketId)).to.be.true;
    });

    it("Should reject verification for non-owner", async function () {
      expect(await ticketSale.connect(buyer2).verifyTicket(ticketId)).to.be.false;
    });

    it("Should reject verification for non-downloaded ticket", async function () {
      // Create and buy another ticket but don't download
      const eventDate2 = Math.floor(Date.now() / 1000) + 86400;
      const saleEndDate2 = Math.floor(Date.now() / 1000) + 3600;

      await ticketSale.connect(seller).createSale(
        "Test Event 2",
        "Test Organizer",
        eventDate2,
        saleEndDate2,
        price,
        "posterCID2",
        "ticketCID2"
      );
      
      await ticketSale.connect(buyer2).buyTicket(2, { value: price });
      
      expect(await ticketSale.connect(buyer2).verifyTicket(2)).to.be.false;
    });
  });

  describe("Expired Ticket Refunds", function () {
    let ticketId;
    const price = ethers.parseEther("0.1");

    beforeEach(async function () {
      const eventDate = Math.floor(Date.now() / 1000) + 86400;
      const saleEndDate = Math.floor(Date.now() / 1000) - 3600; // Past date

      await ticketSale.connect(seller).createSale(
        "Expired Event",
        "Test Organizer",
        eventDate,
        saleEndDate,
        price,
        "posterCID",
        "ticketCID"
      );
      ticketId = 1;
    });

    it("Should refund expired purchased tickets", async function () {
      await ticketSale.connect(buyer1).buyTicket(ticketId, { value: price });
      
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer1.address);

      await expect(
        ticketSale.updateExpiredTickets()
      ).to.emit(ticketSale, "TicketRefunded")
        .withArgs(ticketId, buyer1.address, price);

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer1.address);
      expect(buyerBalanceAfter).to.be.greaterThan(buyerBalanceBefore);

      const ticket = await ticketSale.getTicket(ticketId);
      expect(ticket.isRefunded).to.be.true;
    });
  });

  describe("Non-transferable Tokens", function () {
    let ticketId;
    const price = ethers.parseEther("0.1");

    beforeEach(async function () {
      const eventDate = Math.floor(Date.now() / 1000) + 86400;
      const saleEndDate = Math.floor(Date.now() / 1000) + 3600;

      await ticketSale.connect(seller).createSale(
        "Test Event",
        "Test Organizer",
        eventDate,
        saleEndDate,
        price,
        "posterCID",
        "ticketCID"
      );
      ticketId = 1;
      await ticketSale.connect(buyer1).buyTicket(ticketId, { value: price });
      await ticketSale.connect(buyer1).downloadTicket(ticketId);
    });

    it("Should prevent token transfers", async function () {
      await expect(
        ticketSale.connect(buyer1).transferFrom(buyer1.address, buyer2.address, ticketId)
      ).to.be.revertedWith("Tickets are non-transferable");
    });

    it("Should prevent approvals", async function () {
      await expect(
        ticketSale.connect(buyer1).approve(buyer2.address, ticketId)
      ).to.be.revertedWith("Tickets are non-transferable");

      await expect(
        ticketSale.connect(buyer1).setApprovalForAll(buyer2.address, true)
      ).to.be.revertedWith("Tickets are non-transferable");
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      await ticketSale.pause();
      expect(await ticketSale.paused()).to.be.true;

      await ticketSale.unpause();
      expect(await ticketSale.paused()).to.be.false;
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        ticketSale.connect(seller).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Utility Functions", function () {
    it("Should return available tickets", async function () {
      const eventDate = Math.floor(Date.now() / 1000) + 86400;
      const saleEndDate = Math.floor(Date.now() / 1000) + 3600;
      const price = ethers.parseEther("0.1");

      await ticketSale.connect(seller).createSale(
        "Event 1",
        "Organizer",
        eventDate,
        saleEndDate,
        price,
        "posterCID1",
        "ticketCID1"
      );

      await ticketSale.connect(seller).createSale(
        "Event 2",
        "Organizer",
        eventDate,
        saleEndDate,
        price,
        "posterCID2",
        "ticketCID2"
      );

      const availableTickets = await ticketSale.getAvailableTickets();
      expect(availableTickets.length).to.equal(2);
      expect(availableTickets[0]).to.equal(1);
      expect(availableTickets[1]).to.equal(2);
    });

    it("Should return user's tickets", async function () {
      const eventDate = Math.floor(Date.now() / 1000) + 86400;
      const saleEndDate = Math.floor(Date.now() / 1000) + 3600;
      const price = ethers.parseEther("0.1");

      await ticketSale.connect(seller).createSale(
        "Event 1",
        "Organizer",
        eventDate,
        saleEndDate,
        price,
        "posterCID1",
        "ticketCID1"
      );

      await ticketSale.connect(buyer1).buyTicket(1, { value: price });
      await ticketSale.connect(buyer1).downloadTicket(1);

      const myTickets = await ticketSale.connect(buyer1).getMyTickets();
      expect(myTickets.length).to.equal(1);
      expect(myTickets[0]).to.equal(1);
    });
  });
});

