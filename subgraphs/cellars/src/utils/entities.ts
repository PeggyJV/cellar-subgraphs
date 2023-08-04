import { Cellar, Platform, Wallet, WalletCellarData, BalanceChange } from "../../generated/schema";
import { ZERO_BI } from "./constants";
import { BigInt } from "@graphprotocol/graph-ts";


export const PLATFORM_ID = "platform";

export function loadPlatform(): Platform {
  let entity = Platform.load(PLATFORM_ID);
  if (entity == null) {
    entity = new Platform(PLATFORM_ID);
    entity.latestSnapshotUpdatedAt = 0;
  }

  return entity;
}

export function setPlatformSnapshotUpdatedAt(updatedAt: i32): void {
  const platform = loadPlatform();
  platform.latestSnapshotUpdatedAt = updatedAt;
  platform.save();
}

export function initWallet(walletAddress: string): Wallet {
  const entity = new Wallet(walletAddress);
  entity.totalWithdrawals = ZERO_BI;
  entity.currentDeposits = ZERO_BI;
  entity.totalDeposits = ZERO_BI;

  return entity;
}

export function loadWallet(walletAddress: string, cellar: Cellar): Wallet {
  let entity = Wallet.load(walletAddress);
  if (entity == null) {
    entity = initWallet(walletAddress);

    // Theres a new active wallet for the cellar
    cellar.numWalletsAllTime += 1;
    cellar.numWalletsActive += 1;
  }

  return entity;
}

export function loadOrCreateWallet(
  walletAddress: string,
  cellar: Cellar
): Wallet {
  let entity = Wallet.load(walletAddress);
  if (entity == null) {
    entity = initWallet(walletAddress);

    // Theres a new active wallet for the cellar
    cellar.numWalletsAllTime += 1;
    cellar.numWalletsActive += 1;
    entity.save();
    cellar.save();
  }

  return entity;
}

export function initWalletCellarData(
  walletAddress: string,
  cellarAddress: string
): WalletCellarData {
  const id = `${walletAddress}-${cellarAddress}`;
  const entity = new WalletCellarData(id);
  entity.wallet = walletAddress;
  entity.walletAddress = walletAddress;
  entity.currentDeposits = ZERO_BI;
  entity.totalDeposits = ZERO_BI;
  entity.totalWithdrawals = ZERO_BI;

  return entity;
}

export function loadWalletCellarData(
  walletAddress: string,
  cellarAddress: string
): WalletCellarData {
  const id = `${walletAddress}-${cellarAddress}`;
  let entity = WalletCellarData.load(id);
  if (entity == null) {
    entity = initWalletCellarData(walletAddress, cellarAddress);
  }

  return entity;
}


export function initBalanceChange(
  txHash: string,
  eventIndex: string,
  walletAddress: string,
  cellarAddress: string,
  blockTimestamp: u32,
  amount: BigInt,
  shares: BigInt,
  shareValue: BigInt,
  kind: string
): BalanceChange {
  const id = `${txHash}-${eventIndex}`;
  const entity = new BalanceChange(id);

  entity.amount = amount;
  entity.wallet = walletAddress;
  entity.cellarAddress = cellarAddress;
  entity.date = blockTimestamp;
  entity.shares = shares;
  entity.shareValue = shareValue;
  entity.kind = kind;

  return entity;
}

export function loadBalanceChange(
  txHash: string,
  eventIndex: string,
  walletAddress: string,
  cellarAddress: string,
  blockTimestamp: u32,
  amount: BigInt,
  shares: BigInt,
  shareValue: BigInt,
  kind: string
): BalanceChange {
  let entity = BalanceChange.load(txHash);

  if (entity == null) {
    entity = initBalanceChange(
      txHash,
      eventIndex,
      walletAddress,
      cellarAddress,
      blockTimestamp,
      amount,
      shares,
      shareValue,
      kind
    );
  }

  return entity;
}