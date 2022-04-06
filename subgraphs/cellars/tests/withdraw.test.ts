import { Withdraw } from "../generated/Cellar/Cellar";
import { handleDeposit, handleWithdraw } from "../src/cellar-mapping";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  assert,
  clearStore,
  test,
  newMockEvent,
} from "matchstick-as/assembly";

const callerAddress = "0xc3761eb917cd790b30dad99f6cc5b4ff93c4f9ea";
const ownerX = "0xc36442b4a4522e871399cd717abdd847ab11fe88";
const ownerY = "0xe73185a8afa703a034d5a5fe038bb763fcaeb5f3";
const tokenAddress = "0x459ea910b4e637c925c68489bbaac9668357659b";
const assetAmount = 1234;
const shareAmount = 100;

// -------------------------------------------------------------------------
// Withdraw (mockWithdrawEvent)
// -------------------------------------------------------------------------
/**
 * @param  {string} receiver: Address of the wallet that's withdrawing funds
 * @param  {string} owner:
 * @param  {string} token: Address of the ERC-20 token withdrawn
 * @param  {number} assets: Amount of tokens withdrawn.
 * @param  {number} shares: Shares input to the withdraw call in exchange for 'token'.
 * @returns number
 */
function mockWithdrawEvent(
  receiver: string,
  owner: string,
  token: string,
  assets: number,
  shares: number
): Withdraw {
  const event = changetype<Withdraw>(newMockEvent());
  const addressParam = new ethereum.EventParam(
    "receiver",
    ethereum.Value.fromAddress(Address.fromString(receiver))
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


let shouldFail = false;
test("Withdraw without first depositing should result in negative TVL.", () => {
  clearStore();

  const event = mockWithdrawEvent(
    callerAddress,
    ownerX,
    tokenAddress,
    assetAmount,
    shareAmount
  );

  const cellarAddress = event.address.toHexString();
  assert.assertTrue(event.params.owner.toHexString() == ownerX);
  assert.assertTrue(cellarAddress != callerAddress);
  assert.assertTrue(cellarAddress != ownerX);
  assert.assertTrue(event.params.receiver.toHexString() == callerAddress);

  handleWithdraw(event);

  // Verify Wallet fields
  assert.fieldEquals("Wallet", ownerX, "id", ownerX);
  
  // Verify Cellar fields
  assert.fieldEquals("Cellar", cellarAddress, "id", cellarAddress);
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "1");
  assert.fieldEquals("Cellar", cellarAddress, "asset", tokenAddress);
  assert.fieldEquals("Cellar", cellarAddress, "asset", tokenAddress);
  assert.fieldEquals("Cellar", cellarAddress, "tvlTotal", "-1234");
  assert.fieldEquals("Cellar", cellarAddress, "sharesTotal", "0");

  // Verify CellarDayData fields
  const secondsPerDay = 3600 * 24;
  const date = (event.block.timestamp.toI32() / secondsPerDay) * secondsPerDay;
  const cellarDayDataID = date.toString().concat("-").concat(cellarAddress);
  assert.fieldEquals("CellarDayData", cellarDayDataID, "id", cellarDayDataID);
  assert.fieldEquals("CellarDayData", cellarDayDataID, "removedLiquidity", "1234");

  // Verify WalletDayData fields
  const walletDayDataID = date.toString().concat("-").concat(ownerX);
  assert.fieldEquals("WalletDayData", walletDayDataID, "id", walletDayDataID);
  assert.fieldEquals("WalletDayData", walletDayDataID, "addedLiquidity", "0");
  assert.fieldEquals("WalletDayData", walletDayDataID, "removedLiquidity", "1234");

  const depositWithdrawID = event.block.timestamp.toI32().toString()
    .concat("-").concat(ownerX);
  assert.fieldEquals("DepositWithdrawEvent", depositWithdrawID, "id", depositWithdrawID);
  assert.fieldEquals("DepositWithdrawEvent", depositWithdrawID, "cellar", cellarAddress);
  assert.fieldEquals("DepositWithdrawEvent", depositWithdrawID, "wallet", ownerX);
  assert.fieldEquals("DepositWithdrawEvent", depositWithdrawID, "amount", "-1234");
  assert.fieldEquals(
    "DepositWithdrawEvent", depositWithdrawID, 
    "txId", event.transaction.hash.toHexString());
  assert.fieldEquals(
    "DepositWithdrawEvent", depositWithdrawID, 
    "block", event.block.number.toI32().toString(),
    );
}, shouldFail);

shouldFail = false;
test("2 wallets (owners) withdrawing should increment numWallets", () => {
  clearStore();

  const eventA = mockWithdrawEvent(
    callerAddress,
    ownerX,
    tokenAddress,
    assetAmount,
    shareAmount
  );
  const eventB = mockWithdrawEvent(
    callerAddress,
    ownerY,
    tokenAddress,
    assetAmount,
    shareAmount
  );

  const cellarAddress = eventA.address.toHexString();
  assert.assertTrue(cellarAddress == eventB.address.toHexString());

  handleWithdraw(eventA);
  assert.fieldEquals("Wallet", ownerX, "id", ownerX);
  assert.fieldEquals("Cellar", cellarAddress, "id", cellarAddress);
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "1");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "1");
  assert.fieldEquals("Cellar", cellarAddress, "asset", tokenAddress);

  handleWithdraw(eventB);
  assert.fieldEquals("Wallet", ownerY, "id", ownerY);
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsActive", "2");
  assert.fieldEquals("Cellar", cellarAddress, "numWalletsAllTime", "2");
  assert.fieldEquals("Cellar", cellarAddress, "tvlTotal", "-2468");
  assert.fieldEquals("Cellar", cellarAddress, "sharesTotal", "0");
}, shouldFail);
