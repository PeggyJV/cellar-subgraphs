import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Cellar as CellarContract } from "../../generated/Cellar/Cellar";
import {
  AddRemoveEvent,
  Cellar,
  CellarDayData,
  Wallet,
  WalletDayData,
} from "../../generated/schema";

const ID_DELIMITER = "-";
export const ZERO_BI = BigInt.fromI32(0);
const DAY_SECONDS = 60 * 60 * 24;

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

export function createAddRemoveEvent(
  blockTimestamp: BigInt,
  cellarAddress: string,
  walletAddress: string,
  amount: BigInt,
  txId: string,
  blockNumber: BigInt
): AddRemoveEvent {
  const id = blockTimestamp
    .toString()
    .concat(ID_DELIMITER)
    .concat(walletAddress);
  const event = new AddRemoveEvent(id);

  event.cellar = cellarAddress;
  event.wallet = walletAddress;
  event.amount = amount;
  event.txId = txId;
  event.block = blockNumber.toI32();
  event.timestamp = blockTimestamp.toI32();
  event.save();

  return event;
}
