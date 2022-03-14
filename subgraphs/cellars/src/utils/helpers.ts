import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Cellar as CellarContract } from "../../generated/Cellar/Cellar";
import {
  AddRemoveEvent,
  Cellar,
  CellarDayData,
  CellarShare,
  CellarShareTransfer,
  DepositWithdrawEvent,
  Wallet,
  WalletDayData,
} from "../../generated/schema";

export const ID_DELIMITER = "-";
export const ZERO_BI = BigInt.fromI32(0);
export const DAY_SECONDS = 60 * 60 * 24;

export function initCellar(contractAddress: Address): Cellar {
  const id = contractAddress.toHexString();
  const cellar = new Cellar(id);

  cellar.name = "AaveStablecoinCellar";
  cellar.tvlActive = ZERO_BI;
  cellar.tvlInactive = ZERO_BI;
  cellar.tvlTotal = ZERO_BI;
  cellar.addedLiquidityAllTime = ZERO_BI;
  cellar.removedLiquidityAllTime = ZERO_BI;
  cellar.numWalletsAllTime = 0;
  cellar.numWalletsActive = 0;

  const contract = CellarContract.bind(contractAddress);
  cellar.denom = contract.denom().toHexString();

  return cellar;
}

export function loadCellar(contractAddress: Address): Cellar {
  const id = contractAddress.toHexString();
  let cellar = Cellar.load(id);
  if (cellar == null) {
    cellar = initCellar(contractAddress);
  }

  return cellar;
}

export function initCellarDayData(
  cellar: Cellar,
  id: string,
  date: number
): CellarDayData {
  const cellarDayData = new CellarDayData(id);

  cellarDayData.cellar = cellar.id;
  cellarDayData.date = date as u32;
  cellarDayData.addedLiquidity = ZERO_BI;
  cellarDayData.removedLiquidity = ZERO_BI;
  cellarDayData.numWallets = 0;

  return cellarDayData;
}

export function loadCellarDayData(
  cellar: Cellar,
  blockTimestamp: BigInt
): CellarDayData {
  const date = (blockTimestamp.toI32() / DAY_SECONDS) * DAY_SECONDS;
  const id = date
    .toString()
    .concat(ID_DELIMITER)
    .concat(cellar.id);

  let cellarDayData = CellarDayData.load(id);
  if (cellarDayData == null) {
    cellarDayData = initCellarDayData(cellar, id, date);
  }

  return cellarDayData;
}

export function initWalletDayData(
  wallet: Wallet,
  id: string,
  date: number
): WalletDayData {
  const walletDayData = new WalletDayData(id);

  walletDayData.wallet = wallet.id;
  walletDayData.date = date as u32;
  walletDayData.addedLiquidity = ZERO_BI;
  walletDayData.removedLiquidity = ZERO_BI;

  return walletDayData;
}

export function loadWalletDayData(
  wallet: Wallet,
  blockTimestamp: BigInt
): WalletDayData {
  const date = (blockTimestamp.toI32() / DAY_SECONDS) * DAY_SECONDS;
  const id = date
    .toString()
    .concat(ID_DELIMITER)
    .concat(wallet.id);

  let walletDayData = WalletDayData.load(id);
  if (walletDayData == null) {
    walletDayData = initWalletDayData(wallet, id, date);
  }

  return walletDayData;
}

/**
 * @param  {Cellar} cellar The cellar for which shares are owned.
 * @param  {Wallet} wallet The wallet that owns the shares.
 * @returns CellarShare
 */
export function initCellarShare(cellar: Cellar, wallet: Wallet): CellarShare {
  const cellarShareID: string = wallet.id + "-" + cellar.id;
  const balanceInit: BigInt = ZERO_BI;

  let cellarShare = new CellarShare(cellarShareID);
  cellarShare.wallet = wallet.id;
  cellarShare.cellar = cellar.id;
  cellarShare.balance = balanceInit;
  return cellarShare;
}

/** Loads the `CellarShare` corresponding to the given wallet and cellar.
 * @param  {Wallet} wallet
 * @param  {Cellar} cellar
 * @returns CellarShare
 */
export function loadCellarShare(wallet: Wallet, cellar: Cellar): CellarShare {
  const walletID: string = wallet.id;
  const cellarID: string = cellar.id;
  const cellarShareID: string = walletID + "-" + cellarID;

  let cellarShare = CellarShare.load(cellarShareID);
  if (cellarShare == null) {
    cellarShare = initCellarShare(cellar, wallet);
  }
  return cellarShare;
}

export function initCellarShareTransfer(args: { 
  from: string;
  to: string;
  cellar: Cellar
  wallet: Wallet
  amount: BigInt;
  txHash: string;
  block: BigInt;
  timestamp: BigInt;
}): CellarShareTransfer {
  const id = args.timestamp.toString()
    .concat(ID_DELIMITER).concat(args.cellar.id)
    .concat(ID_DELIMITER).concat(args.wallet.id);

  const cellarShareTransfer = new CellarShareTransfer(id);
  cellarShareTransfer.from = args.from;
  cellarShareTransfer.to = args.to;
  cellarShareTransfer.cellar = args.cellar.id;
  cellarShareTransfer.wallet = args.wallet.id;
  cellarShareTransfer.amount = args.amount;
  cellarShareTransfer.txId = args.txHash;
  cellarShareTransfer.block = parseInt(args.block.toString());
  cellarShareTransfer.timestamp = parseInt(args.timestamp.toString());
    
  return cellarShareTransfer
}

export function createAddRemoveEvent(args: {
  blockTimestamp: BigInt;
  cellarAddress: string;
  walletAddress: string;
  amount: BigInt;
  txId: string;
  blockNumber: BigInt;
}): AddRemoveEvent {
  const id = args.blockTimestamp
    .toString()
    .concat(ID_DELIMITER)
    .concat(args.walletAddress);
  const event = new AddRemoveEvent(id);

  event.cellar = args.cellarAddress;
  event.wallet = args.walletAddress;
  event.amount = args.amount;
  event.txId = args.txId;
  event.block = args.blockNumber.toI32();
  event.timestamp = args.blockTimestamp.toI32();
  event.save();

  return event;
}

export function createDepositWithdrawEvent(args: {
  blockTimestamp: BigInt;
  cellarAddress: string;
  amount: BigInt;
  txId: string;
  blockNumber: BigInt;
}): DepositWithdrawEvent {
  // id: txId
  const id = args.txId;
  const event = new DepositWithdrawEvent(id);

  event.cellar = args.cellarAddress;
  event.amount = args.amount;
  event.txId = args.txId;
  event.block = args.blockNumber.toI32();
  event.timestamp = args.blockTimestamp.toI32();
  event.save();

  return event;
}
