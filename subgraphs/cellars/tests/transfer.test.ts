import { Transfer } from "../generated/Cellar/Cellar";
import {
  handleTransfer,
} from "../src/cellar-mapping";
import { TEN_BI } from "../src/utils/constants";
import { cellarAddress, ownerX, tokenAddress } from "./fixtures";
import {
  mockCellar,
  mockTokenERC20Decimals,
  mockTokenERC20Symbol,
} from "./helpers";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { assert, clearStore, test, newMockEvent } from "matchstick-as/assembly";

// Fixtures
const cellar = cellarAddress;

function mockTransferEvent(from: string, to: string, amount: u32): Transfer {
  const event = changetype<Transfer>(newMockEvent());
  event.address = Address.fromString(cellar);

  event.parameters = [
    new ethereum.EventParam(
      "from",
      ethereum.Value.fromAddress(Address.fromString(from)),
    ), 
    new ethereum.EventParam(
      "to",
      ethereum.Value.fromAddress(Address.fromString(to)),
    ),
    new ethereum.EventParam(
      "amount",
      ethereum.Value.fromI32(amount),
    ),
  ];

  return event;
}

function mockMintTransferEvent(to: string, amount: u32): Transfer {
  const from = Address.zero().toHexString()
  return mockTransferEvent(from, to, amount)
}

function mockBurnTransferEvent(from: string, amount: u32): Transfer {
  const to = Address.zero().toHexString() 
  return mockTransferEvent(from, to, amount)
}

// setup should be run at the beginning of each unit test.
function setup(): void {
  clearStore();
  mockCellar(cellar, tokenAddress);
  mockTokenERC20Symbol();
  mockTokenERC20Decimals();
}

test("mint transfer, happy path", () => {
  setup();

  const event = mockMintTransferEvent(ownerX, 10);
  mockCellar(cellar, tokenAddress);
  assert.assertTrue(cellar == event.address.toHexString());


  handleTransfer(event);

  assert.fieldEquals("Wallet", ownerX, "id", ownerX);
  assert.fieldEquals("Cellar", cellar, "id", cellar);
  assert.fieldEquals("Cellar", cellar, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellar, "numWalletsAllTime", "1");
  assert.fieldEquals("Cellar", cellar, "asset", tokenAddress);

  // Validate CellarShare
  const cellarShareID = ownerX + "-" + cellar;
  assert.fieldEquals("CellarShare", cellarShareID, "id", cellarShareID);
  assert.fieldEquals("CellarShare", cellarShareID, "wallet", ownerX);
  assert.fieldEquals("CellarShare", cellarShareID, "balance", "10");

  // Validate CellarShareTransfer
  const cellarShareTransferID = event
    .block.timestamp.toString()
    .concat("-").concat(cellar)
    .concat("-").concat(ownerX);
  assert.fieldEquals(
    "CellarShareTransfer", cellarShareTransferID,
    "id", cellarShareTransferID);
  assert.fieldEquals("CellarShareTransfer", cellarShareTransferID,
    "from", event.params.from.toHexString());
  assert.fieldEquals("CellarShareTransfer", cellarShareTransferID,
    "to", event.params.to.toHexString());
  assert.fieldEquals("CellarShareTransfer", cellarShareTransferID,
    "amount", event.params.amount.toString());
  assert.fieldEquals("CellarShareTransfer", cellarShareTransferID,
    "txId", event.transaction.hash.toHexString());
});

test("burn transfer, happy path", () => {
  setup();

  const mintEvent = mockMintTransferEvent(ownerX, 10);
  handleTransfer(mintEvent);

  const event = mockBurnTransferEvent(ownerX, 5);
  assert.assertTrue(cellar == event.address.toHexString());

  handleTransfer(event);

  assert.fieldEquals("Wallet", ownerX, "id", ownerX);
  assert.fieldEquals("Cellar", cellar, "id", cellar);
  assert.fieldEquals("Cellar", cellar, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellar, "numWalletsAllTime", "1");
  assert.fieldEquals("Cellar", cellar, "asset", tokenAddress);

  // Validate CellarShare
  const cellarShareID = ownerX + "-" + cellar;
  assert.fieldEquals("CellarShare", cellarShareID, "id", cellarShareID);
  assert.fieldEquals("CellarShare", cellarShareID, "wallet", ownerX);
  assert.fieldEquals("CellarShare", cellarShareID, "balance", "5");

  // Validate CellarShareTransfer
  const cellarShareTransferID = event
    .block.timestamp.toString()
    .concat("-").concat(cellar)
    .concat("-").concat(ownerX);
  assert.fieldEquals(
    "CellarShareTransfer", cellarShareTransferID,
    "id", cellarShareTransferID);
  assert.fieldEquals("CellarShareTransfer", cellarShareTransferID,
    "from", event.params.from.toHexString());
  assert.fieldEquals("CellarShareTransfer", cellarShareTransferID,
    "to", event.params.to.toHexString());
  assert.fieldEquals("CellarShareTransfer", cellarShareTransferID,
    "amount", event.params.amount.toString());
  assert.fieldEquals("CellarShareTransfer", cellarShareTransferID,
    "txId", event.transaction.hash.toHexString());
});