/* 
TODO --> Unit tests to get the PR ready for review
- [ ] test: Are `tvlInactive` and `tvlTotal` changing properly?
- [ ] test: Are the time series objects, `WalletDayData` and `CellarDataData`, showing the correct removedLiquidity
- [ ] test: Does the newly created `AddRemoveEvent` have the negative liquidity value of `event.params.amount`? 
*/
import {
  assert,
  clearStore,
  test,
  newMockEvent,
  createMockedFunction,
} from "matchstick-as/assembly";
import { Address, ethereum } from "@graphprotocol/graph-ts";

import { CellarRemoveLiquidity } from "../generated/Cellar/Cellar";
import { handleCellarRemoveLiquidity } from "../src/cellar-mapping";

function mockCellarRemoveLiquidityEvent(
  address: string,
  amount: number
): CellarRemoveLiquidity {
  const event = changetype<CellarRemoveLiquidity>(newMockEvent());
  const addressParam = new ethereum.EventParam(
          "address",
    ethereum.Value.fromAddress(Address.fromString(address))
  );
  const amountParam = new ethereum.EventParam(
    "amount",
    ethereum.Value.fromI32(amount as u32)
  );

  event.parameters = [addressParam, amountParam];

  return event;
}

const denomAddress = "0x459ea910b4e637c925c68489bbaac9668357659b";

test("Wallet entity is created for new users", () => {
  clearStore();

  const address = "0xe73185a8afa703a034d5a5fe038bb763fcaeb5f3";
  const amount = 1234;
  const event = mockCellarRemoveLiquidityEvent(address, amount);

  const cellarAddress = event.address.toHexString();
  createMockedFunction(event.address, "denom", "denom():(address)").returns([
    ethereum.Value.fromAddress(Address.fromString(denomAddress)),
  ]);

  handleCellarRemoveLiquidity(event);

  assert.fieldEquals("Wallet", address, "id", address);
  assert.fieldEquals("Cellar", cellarAddress, "id", cellarAddress);
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "1");
  assert.fieldEquals("Cellar", cellarAddress, "denom", denomAddress);
});

test("Cellar numWalletsAllTime is not incremented for existing users", () => {
  clearStore();

  const address = "0xe73185a8afa703a034d5a5fe038bb763fcaeb5f3";
  const amount = 1234;
  const event = mockCellarRemoveLiquidityEvent(address, amount);

  const cellarAddress = event.address.toHexString();

  handleCellarRemoveLiquidity(event);

  assert.fieldEquals("Wallet", address, "id", address);
  assert.fieldEquals("Cellar", cellarAddress, "id", cellarAddress);
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "1");

  handleCellarRemoveLiquidity(event);

  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "1");
});
