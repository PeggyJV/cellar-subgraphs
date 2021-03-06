import { Deposit } from "../generated/Cellar/Cellar";
import { handleDeposit } from "../src/cellar-mapping";
import { callerAddress, ownerAddress, tokenAddress, ownerY } from "./fixtures";
import {
  mockCellar,
  mockTokenERC20Decimals,
  mockTokenERC20Symbol,
} from "./helpers";
import { Address, ethereum } from "@graphprotocol/graph-ts";
import { assert, clearStore, test, newMockEvent } from "matchstick-as/assembly";

// Fixtures
const assetAmount = 1234;
const shareAmount = assetAmount;

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

function setup(): void {
  mockTokenERC20Symbol(tokenAddress);
  mockTokenERC20Decimals(tokenAddress);
}

test("Wallet entity is created for new users", () => {
  clearStore();
  setup();

  const event = mockDepositEvent(
    callerAddress,
    ownerAddress,
    tokenAddress,
    assetAmount,
    shareAmount
  );

  const cellarAddress = event.address.toHexString();
  mockCellar(event.address.toHexString(), tokenAddress);

  handleDeposit(event);

  assert.fieldEquals("Wallet", ownerAddress, "id", ownerAddress);
  assert.fieldEquals("Cellar", cellarAddress, "id", cellarAddress);
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "1");
  assert.fieldEquals("Cellar", cellarAddress, "asset", tokenAddress);
});

test("Cellar numWalletsAllTime is not incremented for existing users", () => {
  clearStore();
  setup();

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
    ownerY,
    tokenAddress,
    assetAmount,
    shareAmount
  );
  handleDeposit(event);

  assert.fieldEquals("Wallet", ownerY, "id", ownerY);
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
