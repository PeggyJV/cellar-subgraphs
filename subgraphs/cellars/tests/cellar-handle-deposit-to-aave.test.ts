import { DepositToAave } from "../generated/Cellar/Cellar";
import {
  handleDepositToAave,
  handleLiquidityRestrictionRemoved,
} from "../src/cellar-mapping";
import { TEN_BI } from "../src/utils/constants";
import { mockEvent as mockLiquidityRestrictionRemoved } from "./cellar-handle-liquidity-restriction-removed.test";
import { cellarAddress, tokenAddress } from "./fixtures";
import {
  mockCellarAsset,
  mockTokenERC20Decimals,
  mockTokenERC20Symbol,
  revertTokenERC20Symbol,
  revertTokenERC20Decimals,
} from "./helpers";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { assert, clearStore, test, newMockEvent } from "matchstick-as/assembly";

// Fixtures
const amount = 9001 as u32;
const sym = "USDC";
const decimals = 6 as u32;

function mockEvent(token: string, amount: u32): DepositToAave {
  const event = changetype<DepositToAave>(newMockEvent());
  event.address = Address.fromString(cellarAddress);

  const tokenParam = new ethereum.EventParam(
    "token",
    ethereum.Value.fromAddress(Address.fromString(token))
  );
  const amountParam = new ethereum.EventParam(
    "amount",
    ethereum.Value.fromI32(amount)
  );

  event.parameters = [tokenParam, amountParam];
  return event;
}

function setup(): DepositToAave {
  clearStore();

  mockTokenERC20Decimals(tokenAddress, decimals);
  mockTokenERC20Symbol(tokenAddress, sym);
  mockCellarAsset(cellarAddress, tokenAddress);

  return mockEvent(tokenAddress, amount);
}

test("it initializes the token with symbol", () => {
  const event = setup();

  handleDepositToAave(event);

  assert.fieldEquals("TokenERC20", tokenAddress, "symbol", sym);
});

test("it initializes the token with decimals", () => {
  const event = setup();

  handleDepositToAave(event);

  assert.fieldEquals(
    "TokenERC20",
    tokenAddress,
    "decimals",
    decimals.toString()
  );
});

test("it gracefully handles token.symbol revert", () => {
  clearStore();

  mockTokenERC20Decimals(tokenAddress, decimals);
  revertTokenERC20Symbol(tokenAddress);
  mockCellarAsset(cellarAddress, tokenAddress);

  const event = mockEvent(tokenAddress, amount);

  handleDepositToAave(event);

  assert.fieldEquals("TokenERC20", tokenAddress, "symbol", "");
  assert.fieldEquals(
    "TokenERC20",
    tokenAddress,
    "decimals",
    decimals.toString()
  );
});

test("it gracefully handles token.decimals revert", () => {
  clearStore();

  revertTokenERC20Decimals(tokenAddress);
  mockTokenERC20Symbol(tokenAddress, sym);
  mockCellarAsset(cellarAddress, tokenAddress);

  const event = mockEvent(tokenAddress, amount);

  handleDepositToAave(event);

  assert.fieldEquals("TokenERC20", tokenAddress, "symbol", sym);
  assert.fieldEquals("TokenERC20", tokenAddress, "decimals", "0");
});

test("it sets cellar.asset", () => {
  const event = setup();
  handleDepositToAave(event);

  assert.fieldEquals("Cellar", cellarAddress, "asset", tokenAddress);
});

test("it updates maxLiquidity if restrictions have not been removed", () => {
  const event = setup();
  handleDepositToAave(event);

  const dec = decimals as u8;

  assert.fieldEquals(
    "Cellar",
    cellarAddress,
    "maxLiquidity",
    BigInt.fromI32(50000).times(TEN_BI.pow(dec)).toString()
  );
});

test("it does not update maxLiquidity if restrictions have been removed", () => {
  const event = setup();
  const liquidityRestrictionRemovedEvent = mockLiquidityRestrictionRemoved();
  liquidityRestrictionRemovedEvent.address = Address.fromString(cellarAddress);

  handleLiquidityRestrictionRemoved(liquidityRestrictionRemovedEvent);
  assert.fieldEquals("Cellar", cellarAddress, "maxLiquidity", "0");

  handleDepositToAave(event);
  assert.fieldEquals("Cellar", cellarAddress, "maxLiquidity", "0");
});
