import {
  CellarAddLiquidity,
  CellarRemoveLiquidity,
  Transfer,
} from "../generated/Cellar/Cellar";
import {
  Cellar,
  CellarDayData,
  Wallet,
  WalletDayData,
} from "../generated/schema";

import {
  createAddRemoveEvent,
  loadCellar,
  loadCellarDayData,
  loadWalletDayData,
} from "./utils/helpers";

import { seed } from "./utils/mock-data";
export function handleTransfer(event: Transfer): void {
  seed();
}

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
  // removedLiquidityAllTime
  // tvlInactive
  // tvlTotal
  // cellarDayData
  // walletDayData
  // addRemoveEvent
}
