import { ClearGateCellar } from "../../generated/CellarClearGateA/ClearGateCellar";
import { Transfer, ERC20 } from "../../generated/USDC/ERC20";
import { Cellar } from "../../generated/schema";
import { getUsdPrice } from "../prices/index";
import {
  CELLAR_START,
  ONE_SHARE,
  ONE_BD,
  ONE_BI,
  ZERO_BI,
  TEN_BI,
} from "./constants";
import {
  convertDecimals,
  loadCellar,
  loadCellarDayData,
  loadCellarHourData,
  loadPrevCellarDayData,
  loadOrCreateTokenERC20,
  normalizeDecimals,
} from "./helpers";
import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";

export function snapshotDay(event: Transfer, cellarAddress: string): void {
  if (CELLAR_START.has(cellarAddress)) {
    const startBlock = CELLAR_START.get(cellarAddress);
    if (event.block.number.lt(startBlock)) {
      return;
    }
  }

  const address = Address.fromString(cellarAddress);
  const cellar = loadCellar(address);
  if (cellar.asset == null) {
    return;
  }

  const contract = ClearGateCellar.bind(address);

  // Get positions, save on cellar
  const positions = getPositions(contract);
  cellar.positions = positions;
  cellar.positionDistribution = getPositionDistribution(positions, address);

  const cellarAsset = cellar.asset as string;

  const snapshot = loadCellarDayData(
    cellar.id,
    event.block.timestamp,
    cellarAsset
  );
  snapshot.positionDistribution = cellar.positionDistribution;

  const timestamp = event.block.timestamp.toI32();
  const secSinceUpdated = timestamp - snapshot.updatedAt;
  if (snapshot.updatedAt != 0 && secSinceUpdated < 60 * 1) {
    // Bail if we updated in the last minute
    return;
  }

  const asset = loadOrCreateTokenERC20(cellarAsset);

  // TODO
  // snapshot.tvlInvested = cellar.tvlInvested

  const convertShareResult = contract.try_convertToAssets(ONE_SHARE);
  if (convertShareResult.reverted) {
    log.warning("Could not call cellar.converToAssets: {}", [cellar.id]);
  } else {
    cellar.shareValue = convertShareResult.value;
    snapshot.shareValue = convertShareResult.value;
  }

  const totalAssetsResult = contract.try_totalAssets();
  const holdingPositionResult = contract.try_holdingPosition();
  if (totalAssetsResult.reverted) {
    log.warning("Could not call cellar.totalAssets: {}", [cellar.id]);
  }

  if (holdingPositionResult.reverted) {
    log.warning("Could not call cellar.holdingPosition: {}", [cellar.id]);
  }

  if (!totalAssetsResult.reverted && !holdingPositionResult.reverted) {
    const holdingPosition = holdingPositionResult.value;
    const holdingContract = ERC20.bind(holdingPosition);
    const holdingBalance = holdingContract.balanceOf(address);

    const holdingAsset = loadOrCreateTokenERC20(holdingPosition.toHexString());
    const holdingDecimals = BigInt.fromI32(holdingAsset.decimals);
    const inactiveAssets = normalizeDecimals(holdingBalance, holdingDecimals);

    const totalAssets = normalizeDecimals(
      totalAssetsResult.value,
      BigInt.fromI32(asset.decimals)
    );

    const singleShare = convertDecimals(ONE_BI, ZERO_BI, holdingDecimals);
    const shareProfitRatio = cellar.shareValue
      .minus(singleShare)
      .toBigDecimal()
      .div(singleShare.toBigDecimal());
    snapshot.shareProfitRatio = shareProfitRatio;
    snapshot.tvlInactive = inactiveAssets;
    snapshot.tvlTotal = totalAssets;
    snapshot.tvlActive = snapshot.tvlTotal.minus(inactiveAssets);

    cellar.shareProfitRatio = shareProfitRatio;
    cellar.tvlInactive = snapshot.tvlInactive;
    cellar.tvlTotal = snapshot.tvlTotal;
    cellar.tvlActive = snapshot.tvlActive;
    cellar.save();

    const prevSnap = loadPrevCellarDayData(
      cellar.id,
      event.block.timestamp,
      cellarAsset
    );

    // totalAssets[now] + withdrawnAssets[now] - totalAssets[yesterday] + withdrawnAssets[yesterday] - addedLiquidity[now]
    snapshot.earnings = snapshot.tvlTotal
      .minus(prevSnap.tvlTotal)
      .plus(prevSnap.removedLiquidity)
      .plus(snapshot.removedLiquidity)
      .minus(snapshot.addedLiquidity);
  }

  snapshot.updatedAt = timestamp;
  snapshot.save();
}

export function snapshotHour(event: Transfer, cellarAddress: string): void {
  if (CELLAR_START.has(cellarAddress)) {
    const startBlock = CELLAR_START.get(cellarAddress);
    if (event.block.number.lt(startBlock)) {
      return;
    }
  }

  const address = Address.fromString(cellarAddress);
  const cellar = loadCellar(address);
  if (cellar.asset == null) {
    return;
  }

  const contract = ClearGateCellar.bind(address);

  // Get positions, save on cellar
  const positions = getPositions(contract);
  cellar.positions = positions;
  cellar.positionDistribution = getPositionDistribution(positions, address);

  const cellarAsset = cellar.asset as string;

  const snapshot = loadCellarHourData(
    cellar.id,
    event.block.timestamp,
    cellarAsset
  );
  snapshot.positionDistribution = cellar.positionDistribution;

  const timestamp = event.block.timestamp.toI32();
  const secSinceUpdated = timestamp - snapshot.updatedAt;
  if (snapshot.updatedAt != 0 && secSinceUpdated < 60 * 1) {
    // Bail if we updated in the last minute
    return;
  }

  const asset = loadOrCreateTokenERC20(cellarAsset);

  // TODO
  // snapshot.tvlInvested = cellar.tvlInvested

  const convertShareResult = contract.try_convertToAssets(ONE_SHARE);
  if (convertShareResult.reverted) {
    log.warning("Could not call cellar.converToAssets: {}", [cellar.id]);
  } else {
    cellar.shareValue = convertShareResult.value;
    snapshot.shareValue = convertShareResult.value;
  }

  const totalAssetsResult = contract.try_totalAssets();
  const holdingPositionResult = contract.try_holdingPosition();
  if (totalAssetsResult.reverted) {
    log.warning("Could not call cellar.totalAssets: {}", [cellar.id]);
  }

  if (holdingPositionResult.reverted) {
    log.warning("Could not call cellar.holdingPosition: {}", [cellar.id]);
  }

  if (!totalAssetsResult.reverted && !holdingPositionResult.reverted) {
    const holdingPosition = holdingPositionResult.value;
    const holdingContract = ERC20.bind(holdingPosition);
    const holdingBalance = holdingContract.balanceOf(address);

    const holdingAsset = loadOrCreateTokenERC20(holdingPosition.toHexString());
    const holdingDecimals = BigInt.fromI32(holdingAsset.decimals);
    const inactiveAssets = normalizeDecimals(holdingBalance, holdingDecimals);

    const totalAssets = normalizeDecimals(
      totalAssetsResult.value,
      BigInt.fromI32(asset.decimals)
    );

    const singleShare = convertDecimals(ONE_BI, ZERO_BI, holdingDecimals);
    const shareProfitRatio = cellar.shareValue
      .minus(singleShare)
      .toBigDecimal()
      .div(singleShare.toBigDecimal());
    snapshot.shareProfitRatio = shareProfitRatio;
    snapshot.tvlInactive = inactiveAssets;
    snapshot.tvlTotal = totalAssets;
    snapshot.tvlActive = snapshot.tvlTotal.minus(inactiveAssets);

    cellar.shareProfitRatio = shareProfitRatio;
    cellar.tvlInactive = snapshot.tvlInactive;
    cellar.tvlTotal = snapshot.tvlTotal;
    cellar.tvlActive = snapshot.tvlActive;
    cellar.save();

    const prevSnap = loadPrevCellarDayData(
      cellar.id,
      event.block.timestamp,
      cellarAsset
    );

    // totalAssets[now] + withdrawnAssets[now] - totalAssets[yesterday] + withdrawnAssets[yesterday] - addedLiquidity[now]
    snapshot.earnings = snapshot.tvlTotal
      .minus(prevSnap.tvlTotal)
      .plus(prevSnap.removedLiquidity)
      .plus(snapshot.removedLiquidity)
      .minus(snapshot.addedLiquidity);
  }

  snapshot.updatedAt = timestamp;
  snapshot.save();
}

export function getPositions(contract: ClearGateCellar): string[] {
  const result = contract.try_getPositions();
  if (result.reverted) {
    return new Array<string>();
  }

  return result.value.map(toHexString);
}

const empty = new Array<BigDecimal>();
export function getPositionDistribution(
  positions: string[],
  cellarAddress: Address
): BigDecimal[] {
  const distribution = new Array<BigDecimal>();

  for (let i = 0; i < positions.length; i++) {
    // Fetch balance
    const position = Address.fromString(positions[i]);
    const erc20 = ERC20.bind(position);
    const balanceResult = erc20.try_balanceOf(cellarAddress);

    if (balanceResult.reverted) {
      return empty;
    }

    // Calculate value
    const tokenEntity = loadOrCreateTokenERC20(position.toHexString());
    const balance = getAmountFromDecimals(
      tokenEntity.decimals,
      balanceResult.value
    );
    const amount = getUsdPrice(position, balance);
    distribution.push(amount);
  }

  return distribution;
}

// TODO move to helpers
export function getAmountFromDecimals(
  decimals: number,
  amount: BigInt
): BigDecimal {
  if (decimals < 1) {
    return ZERO_BI.toBigDecimal();
  }

  const denom = TEN_BI.pow(decimals as u8).toBigDecimal();
  return amount.toBigDecimal().div(denom);
}

function toHexString(address: Address, index: i32, array: Address[]): string {
  return address.toHexString();
}
