import { Deposit } from "../generated/Cellar/Cellar";
import { handleDeposit } from "../src/cellar-mapping";
import { Address, ethereum } from "@graphprotocol/graph-ts";
import {
  assert,
  clearStore,
  test,
  newMockEvent,
  createMockedFunction,
} from "matchstick-as/assembly";

const callerAddress = "0xc3761eb917cd790b30dad99f6cc5b4ff93c4f9ea";
const ownerAddress = "0xc36442b4a4522e871399cd717abdd847ab11fe88";
const anotherUser = "0xe73185a8afa703a034d5a5fe038bb763fcaeb5f3";
const tokenAddress = "0x459ea910b4e637c925c68489bbaac9668357659b";
const assetAmount = 1234;
const shareAmount = 100;

// -------------------------------------------------------------------------
// Deposit
// -------------------------------------------------------------------------

function mockDepositEvent(
  caller: string,
  owner: string,
  token: string,
  assets: number,
  shares: number
): Deposit {
  const event = changetype<Deposit>(newMockEvent());
  const addressParam = new ethereum.EventParam(
    "caller",
    ethereum.Value.fromAddress(Address.fromString(caller))
  );
  const ownerParam = new ethereum.EventParam(
    "owner",
    ethereum.Value.fromAddress(Address.fromString(owner))
  );
  const tokenParam = new ethereum.EventParam(
    "token",
    ethereum.Value.fromAddress(Address.fromString(token))
  );
  const assetsParam = new ethereum.EventParam(
    "assets",
    ethereum.Value.fromI32(assets as u32)
  );
  const sharesParam = new ethereum.EventParam(
    "shares",
    ethereum.Value.fromI32(shares as u32)
  );

  event.parameters = [
    addressParam,
    ownerParam,
    tokenParam,
    assetsParam,
    sharesParam,
  ];

  return event;
}

test("Wallet entity is created for new users", () => {
  clearStore();

  const address = "0xe73185a8afa703a034d5a5fe038bb763fcaeb5f3";
  const event = mockDepositEvent(
    callerAddress,
    ownerAddress,
    tokenAddress,
    assetAmount,
    shareAmount
  );

  const cellarAddress = event.address.toHexString();
  // createMockedFunction seems to be unused. What is this for?
  createMockedFunction(event.address, "asset", "asset():(address)").returns([
    ethereum.Value.fromAddress(Address.fromString(tokenAddress)),
  ]);

  handleDeposit(event);

  assert.fieldEquals("Wallet", ownerAddress, "id", ownerAddress);
  assert.fieldEquals("Cellar", cellarAddress, "id", cellarAddress);
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "1");
  assert.fieldEquals("Cellar", cellarAddress, "asset", tokenAddress);
});

test("Cellar numWalletsAllTime is not incremented for existing users", () => {
  clearStore();

  const event = mockDepositEvent(
    callerAddress,
    ownerAddress,
    tokenAddress,
    assetAmount,
    shareAmount
  );
  const cellarAddress = event.address.toHexString();

  handleDeposit(event);

  assert.fieldEquals("Wallet", ownerAddress, "id", ownerAddress);
  assert.fieldEquals("Cellar", cellarAddress, "id", cellarAddress);
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "1");

  handleDeposit(event);

  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "1");
});

test("Cellar numWalletsActive and numWalletsAllTime increment for different users", () => {
  clearStore();

  let event = mockDepositEvent(
    callerAddress,
    ownerAddress,
    tokenAddress,
    assetAmount,
    shareAmount
  );
  const cellarAddress = event.address.toHexString();
  assert.assertTrue(cellarAddress != callerAddress);
  assert.assertTrue(cellarAddress != ownerAddress);

  handleDeposit(event);

  assert.fieldEquals("Wallet", ownerAddress, "id", ownerAddress);
  assert.fieldEquals("Cellar", cellarAddress, "id", cellarAddress);
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "1");

  event = mockDepositEvent(
    callerAddress,
    anotherUser,
    tokenAddress,
    assetAmount,
    shareAmount
  );
  handleDeposit(event);

  assert.fieldEquals("Wallet", anotherUser, "id", anotherUser);
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "2");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "2");
});

test("Deposits of zero amount should result in 0 shares minted.", () => {
  clearStore();

  const depositAmt = 0;
  const outShares = 0;
  const event = mockDepositEvent(
    callerAddress,
    ownerAddress,
    tokenAddress,
    depositAmt,
    outShares
  );

  const cellarAddress = event.address.toHexString();

  handleDeposit(event);

  assert.fieldEquals("Wallet", ownerAddress, "id", ownerAddress);
  assert.fieldEquals("Cellar", cellarAddress, "id", cellarAddress);
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "1");
  assert.fieldEquals("Cellar", cellarAddress, "asset", tokenAddress);
  assert.fieldEquals("Cellar", cellarAddress, "tvlActive", "0");
  assert.fieldEquals("Cellar", cellarAddress, "tvlInactive", "0");
});
