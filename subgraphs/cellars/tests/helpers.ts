import { cellarAddress, tokenAddress } from "./fixtures";
import { Address, ethereum } from "@graphprotocol/graph-ts";
import { createMockedFunction } from "matchstick-as/assembly";

export function mockCellar(
  cellar: string = cellarAddress,
  asset: string = tokenAddress
): void {
  mockCellarAsset(cellar, asset);

  createMockedFunction(
    Address.fromString(cellar),
    "PERFORMANCE_FEE",
    "PERFORMANCE_FEE():(uint256)"
  ).returns([ethereum.Value.fromI32(100)]);

  createMockedFunction(
    Address.fromString(cellar),
    "PLATFORM_FEE",
    "PLATFORM_FEE():(uint256)"
  ).returns([ethereum.Value.fromI32(500)]);
}

export function mockCellarAsset(
  cellar: string = cellarAddress,
  asset: string = tokenAddress
): void {
  createMockedFunction(
    Address.fromString(cellar),
    "asset",
    "asset():(address)"
  ).returns([ethereum.Value.fromAddress(Address.fromString(asset))]);
}

export function mockTokenERC20Symbol(
  token: string = tokenAddress,
  sym: string = "USDC"
): void {
  createMockedFunction(
    Address.fromString(token),
    "symbol",
    "symbol():(string)"
  ).returns([ethereum.Value.fromString(sym)]);
}

export function revertTokenERC20Symbol(token: string): void {
  createMockedFunction(
    Address.fromString(token),
    "symbol",
    "symbol():(string)"
  ).reverts();
}

export function mockTokenERC20Decimals(
  token: string = tokenAddress,
  decimals: u32 = 6
): void {
  createMockedFunction(
    Address.fromString(token),
    "decimals",
    "decimals():(uint8)"
  ).returns([ethereum.Value.fromI32(decimals)]);
}

export function revertTokenERC20Decimals(token: string): void {
  createMockedFunction(
    Address.fromString(token),
    "decimals",
    "decimals():(uint8)"
  ).reverts();
}
