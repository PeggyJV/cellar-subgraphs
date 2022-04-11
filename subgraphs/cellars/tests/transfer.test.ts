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
  event.address = Address.fromString(cellarAddress);

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
