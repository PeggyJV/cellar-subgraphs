import { DepositToAave } from "../generated/Cellar/Cellar";
import { handleDepositToAave } from "../src/cellar-mapping";
import { cellarAddress, tokenAddress } from "./fixtures";
import {
  mockCellarAsset,
  mockTokenERC20Decimals,
  mockTokenERC20Symbol,
  revertTokenERC20Symbol,
  revertTokenERC20Decimals,
} from "./helpers";
import { Address, ethereum } from "@graphprotocol/graph-ts";
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
