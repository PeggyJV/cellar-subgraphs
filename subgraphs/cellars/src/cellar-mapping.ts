/**
 * @param  {CellarAddLiquidity} event
 * @returns void
 */
import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  CellarAddLiquidity,
  CellarDeposit,
  CellarRemoveLiquidity,
  CellarWithdraw,
  Transfer,
} from "../generated/Cellar/Cellar";
import {
  Cellar,
  CellarDayData,
  CellarShare,
  Wallet,
  WalletDayData,
} from "../generated/schema";

import {
  createAddRemoveEvent,
  createDepositWithdrawEvent,
  loadCellar,
  loadCellarDayData,
  loadWalletDayData,
} from "./utils/helpers";

import { seed } from "./utils/mock-data";

export function handleCellarAddLiquidty(event: CellarAddLiquidity): void {
  // Cellar
  const cellarAddress = event.address;
  let cellar = loadCellar(cellarAddress);

  // Log cellar statistics
  const amount = event.params.amount;
  cellar.addedLiquidityAllTime = cellar.addedLiquidityAllTime.plus(amount);
  cellar.tvlInactive = cellar.tvlInactive.plus(amount);
  cellar.tvlTotal = cellar.tvlTotal.plus(amount);

  // Wallet
  const walletAddress = event.params.address.toHexString();
  let wallet = Wallet.load(walletAddress);
  if (wallet == null) {
    // Create a new wallet we haven't seen it before
    wallet = new Wallet(walletAddress);
    wallet.save();
    cellar.numWalletsAllTime += 1;
    cellar.numWalletsActive += 1;
  }

  // Log cellar timeseries data
  const timestamp = event.block.timestamp;
  const cellarDayData = loadCellarDayData(cellar, timestamp);
  cellarDayData.addedLiquidity = cellarDayData.addedLiquidity.plus(amount);

  // Log wallet (user) timeseries data
  const walletDayData = loadWalletDayData(wallet, timestamp);
  walletDayData.addedLiquidity = walletDayData.addedLiquidity.plus(amount);

  // Log the actual CellarAddLiquidity event
  createAddRemoveEvent(
    timestamp,
    cellar.id,
    wallet.id,
    amount,
    event.transaction.hash.toHexString(),
    event.block.number
  );

  // Save the entities we've modified
  cellar.save();
  cellarDayData.save();
  walletDayData.save();
}

export function handleCellarRemoveLiquidity(
  event: CellarRemoveLiquidity
): void {
  // cellar
  const cellarAddress: Address = event.address;
  let cellar = loadCellar(cellarAddress);

  // removedLiquidityAllTime
  const liqAmount = event.params.amount;
  cellar.removedLiquidityAllTime = cellar.removedLiquidityAllTime.plus(
    liqAmount
  );
  cellar.tvlInactive = cellar.tvlInactive.minus(liqAmount);
  cellar.tvlTotal = cellar.tvlTotal.minus(liqAmount);

  // cellarDayData - Log cellar timeseries data
  const timestamp = event.block.timestamp;
  const cellarDayData = loadCellarDayData(cellar, timestamp);
  cellarDayData.removedLiquidity = cellarDayData.removedLiquidity.plus(
    liqAmount
  );

  // Wallet
  const walletAddress = event.params.address.toHexString();
  let wallet = Wallet.load(walletAddress);
  // TODO: Should we change the amount of shares here?
  // TODO: Should we change the 'numWallets' of the cellar here?
  // OR, should this be done in `handleCellarShareTransferEvent`?
  if (wallet == null) {
    // Create a new wallet we haven't seen it before
    wallet = new Wallet(walletAddress);
    wallet.save();
    cellar.numWalletsAllTime += 1;
    cellar.numWalletsActive += 1;
  }

  //walletDayData - Log wallet (user) timeseries data
  const walletDayData = loadWalletDayData(wallet, timestamp);
  walletDayData.removedLiquidity = walletDayData.removedLiquidity.plus(
    liqAmount
  );

  // Log the event, cellarRemoveLiquidity, as `AddRemoveEvent`
  createAddRemoveEvent(
    timestamp,
    cellar.id,
    wallet.id,
    liqAmount.neg(),
    event.transaction.hash.toHexString(),
    event.block.number
  );

  // Save entities we've modified
  cellar.save();
  cellarDayData.save();
  walletDayData.save();
}

export function handleCellarDeposit(event: CellarDeposit): void {
  const depositAmount: BigInt = event.params.amount;

  // cellar
  const cellarAddress: Address = event.address;
  let cellar = loadCellar(cellarAddress);
  cellar.tvlActive = cellar.tvlActive.plus(depositAmount);
  cellar.tvlInactive = cellar.tvlInactive.minus(depositAmount);
  cellar.save();

  // createDepositWithdrawEvent
  const timestamp = event.block.timestamp;
  createDepositWithdrawEvent({
    blockTimestamp: timestamp,
    cellarAddress: cellar.id,
    amount: depositAmount,
    txId: event.transaction.hash.toHexString(),
    blockNumber: event.block.number,
  });
}

export function handleCellarWithdraw(event: CellarWithdraw): void {
  const withdrawAmount: BigInt = event.params.amount;

  // cellar
  const cellarAddress: Address = event.address;
  let cellar = loadCellar(cellarAddress);
  cellar.tvlActive = cellar.tvlActive.minus(withdrawAmount);
  cellar.tvlInactive = cellar.tvlInactive.plus(withdrawAmount);
  cellar.save();

  // createDepositWithdrawEvent
  const timestamp = event.block.timestamp;
  createDepositWithdrawEvent({
    blockTimestamp: timestamp,
    cellarAddress: cellar.id,
    amount: withdrawAmount.neg(),
    txId: event.transaction.hash.toHexString(),
    blockNumber: event.block.number,
  });
}

export function handleTransfer(event: Transfer): void {
  seed();
  const transferAmount: BigInt = event.params.value;
  const from: Address = event.params.from;
  const to: Address = event.params.to;

  // If from is the zeroAddress, it's a mint
  // Then, 'to' is the wallet

  /* 
    --------------------------
    Mint 
    --------------------------
    TODO Update 'CellarShare'. 
    If this object exists for the corresponding wallet, simply update the 
      wallet's CellarShare.balance -> Add it.
    If is doesn't already exist, initialize a cellarShare.
      Q: Do I need to save the cellarShare like I did the cellar in the other 
        handlers?
      Q: More broadly, what does the `object.save()` call do in any handler?
   */

  // If to is the zeroAddress, it's a burn
  // Then, 'from' is the wallet
  /* 
    --------------------------
    Burn 
    --------------------------
    TODO Update 'CellarShare'. 
    If this object exists for the corresponding wallet, simply update the 
      wallet's CellarShare.balance -> Negate it.
    If is doesn't already exist, initialize a cellarShare.
      Q: Do I need to save the cellarShare like I did the cellar in the other 
        handlers?
      Q: More broadly, what does the `object.save()` call do in any handler?
   */
  // TODO
}
