import { LiquidityRestrictionRemoved } from "../generated/Cellar/Cellar";
import { handleLiquidityRestrictionRemoved } from "../src/cellar-mapping";
import {
  mockCellarAsset,
  mockTokenERC20Decimals,
  mockTokenERC20Symbol,
} from "./helpers";
import { assert, clearStore, test, newMockEvent } from "matchstick-as/assembly";

export function mockEvent(): LiquidityRestrictionRemoved {
  const event = changetype<LiquidityRestrictionRemoved>(newMockEvent());
  return event;
}

test("it sets maxLiquidity to 0", () => {
  clearStore();

  const event = mockEvent();
  const cellar = event.address.toHexString();
  mockCellarAsset(cellar);
  mockTokenERC20Symbol();
  mockTokenERC20Decimals();

  handleLiquidityRestrictionRemoved(event);

  assert.fieldEquals("Cellar", cellar, "maxLiquidity", "0");
});
