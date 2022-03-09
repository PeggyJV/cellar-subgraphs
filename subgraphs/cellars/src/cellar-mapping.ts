import { BigInt } from "@graphprotocol/graph-ts";
import {
  CellarAddLiquidity,
  CellarRemoveLiquidity,
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
  loadCellar,
  loadCellarDayData,
  loadWalletDayData,
} from "./utils/helpers";

export function handleCellarAddLiquidty(event: CellarAddLiquidity): void {
  // Cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);

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
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);

  // removedLiquidityAllTime
  const liqAmount = event.params.amount;
  cellar.removedLiquidityAllTime = cellar.removedLiquidityAllTime.plus(liqAmount)
  cellar.tvlInactive = cellar.tvlInactive.minus(liqAmount);
  cellar.tvlTotal = cellar.tvlTotal.minus(liqAmount);

  // cellarDayData - Log cellar timeseries data
  const timestamp = event.block.timestamp;
  const cellarDayData = loadCellarDayData(cellar, timestamp);
  cellarDayData.removedLiquidity = cellarDayData.removedLiquidity.plus(liqAmount);

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
  };

  //walletDayData - Log wallet (user) timeseries data
  const walletDayData = loadWalletDayData(wallet, timestamp);
  walletDayData.removedLiquidity = walletDayData.removedLiquidity.plus(liqAmount);

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
