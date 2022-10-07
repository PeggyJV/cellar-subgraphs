import { Cellar, Wallet, WalletCellarData } from "../../generated/schema";
import { ZERO_BI } from "./constants";

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
