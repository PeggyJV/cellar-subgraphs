import { Cellar as CellarContract } from "../generated/Cellar/Cellar";
import { Transfer } from "../generated/USDC/ERC20";
import { Cellar } from "../generated/schema";
import {
  snapshotDay as cgSnapshotDay,
  snapshotHour as cgSnapshotHour,
} from "./utils/cleargate";
import {
  CELLAR_AAVE_LATEST,
  V1PT5_CELLARS,
  ZERO_BI,
  ONE_BI,
  ONE_SHARE,
  NEGATIVE_ONE_BI,
} from "./utils/constants";
import {
  convertDecimals,
  loadCellar,
  loadCellarDayData,
  loadPrevCellarDayData,
  loadCellarHourData,
  loadPrevCellarHourData,
  loadOrCreateTokenERC20,
  normalizeDecimals,
} from "./utils/helpers";
import { Address, BigInt, log } from "@graphprotocol/graph-ts";

const cellarLatest = Address.fromString(CELLAR_AAVE_LATEST);

// We are piggy backing off of USDCs transfer event to get more granularity
// for Cellar TVL and aToken snapshots.
export function handleTransfer(event: Transfer): void {
  const cellar = loadCellar(cellarLatest);
  const contract = CellarContract.bind(Address.fromString(cellar.id));
  snapshotDay(event, cellar, contract);
  snapshotHour(event, cellar, contract);

  // cleargate
  for (let i = 0; i < V1PT5_CELLARS.length; i++) {
    const address = V1PT5_CELLARS[i];
    cgSnapshotDay(event, address);
    cgSnapshotHour(event, address);
  }
}

function snapshotDay(
  event: Transfer,
  cellar: Cellar,
  contract: CellarContract
): void {
  if (cellar.asset == null) {
    return;
  }
  const cellarAsset = cellar.asset as string;

  const snapshot = loadCellarDayData(
    cellar.id,
    event.block.timestamp,
    cellarAsset
  );

  const timestamp = event.block.timestamp.toI32();
  const secSinceUpdated = timestamp - snapshot.updatedAt;
  if (snapshot.updatedAt != 0 && secSinceUpdated < 60 * 1) {
    // Bail if we updated in the last minute
    return;
  }

  const asset = loadOrCreateTokenERC20(cellarAsset);
  const assetDecimals = BigInt.fromI32(asset.decimals);

  snapshot.tvlInvested = cellar.tvlInvested;

  const convertShareResult = contract.try_convertToAssets(ONE_SHARE);
  if (convertShareResult.reverted) {
    log.warning("Could not call cellar.convertToAssets: {}", [cellar.id]);
  } else {
    cellar.shareValue = convertShareResult.value;
    snapshot.shareValue = convertShareResult.value;

    // Set low candle
    if (
      snapshot.shareValueLow.equals(NEGATIVE_ONE_BI) || // default value
      snapshot.shareValue.lt(snapshot.shareValueLow)
    ) {
      snapshot.shareValueLow = snapshot.shareValue;
    }

    // Set high candle
    if (
      snapshot.shareValueHigh.equals(NEGATIVE_ONE_BI) || // default value
      snapshot.shareValue.gt(snapshot.shareValueHigh)
    ) {
      snapshot.shareValueHigh = snapshot.shareValue;
    }

    const singleShare = convertDecimals(ONE_BI, ZERO_BI, assetDecimals);
    const shareProfitRatio = cellar.shareValue
      .minus(singleShare)
      .toBigDecimal()
      .div(singleShare.toBigDecimal());

    cellar.shareProfitRatio = shareProfitRatio;
    snapshot.shareProfitRatio = shareProfitRatio;
  }

  const activeAssetsResult = contract.try_totalBalance();
  if (activeAssetsResult.reverted) {
    log.warning("Could not call cellar.activeAssets: {}", [cellar.id]);

    snapshot.tvlActive = ZERO_BI;
    snapshot.earnings = ZERO_BI;
  } else {
    const prevEntity = loadPrevCellarDayData(
      cellar.id,
      event.block.timestamp,
      cellarAsset
    );

    const activeAssets = normalizeDecimals(
      activeAssetsResult.value,
      BigInt.fromI32(asset.decimals)
    );

    snapshot.tvlActive = activeAssets;
    const accumulated = activeAssets.minus(snapshot.tvlInvested);
    const prevAccumulated = prevEntity.tvlActive.minus(prevEntity.tvlInvested);
    snapshot.earnings = accumulated.minus(prevAccumulated);

    if (snapshot.earnings < ZERO_BI) {
      snapshot.earnings = ZERO_BI;
    }
  }

  const inactiveAssetsResult = contract.try_totalHoldings();
  if (inactiveAssetsResult.reverted) {
    log.warning("Could not call cellar.inactiveAssets: {}", [cellar.id]);

    snapshot.tvlInactive = ZERO_BI;
  } else {
    const inactiveAssets = normalizeDecimals(
      inactiveAssetsResult.value,
      BigInt.fromI32(asset.decimals)
    );
    snapshot.tvlInactive = inactiveAssets;
  }

  snapshot.tvlTotal = snapshot.tvlActive.plus(snapshot.tvlInactive);
  snapshot.updatedAt = timestamp;

  snapshot.save();
}

function snapshotHour(
  event: Transfer,
  cellar: Cellar,
  contract: CellarContract
): void {
  if (cellar.asset == null) {
    return;
  }
  const cellarAsset = cellar.asset as string;

  const snapshot = loadCellarHourData(
    cellar.id,
    event.block.timestamp,
    cellarAsset
  );

  const timestamp = event.block.timestamp.toI32();
  const secSinceUpdated = timestamp - snapshot.updatedAt;
  if (snapshot.updatedAt != 0 && secSinceUpdated < 60 * 1) {
    // Bail if we updated in the last minute
    return;
  }

  const asset = loadOrCreateTokenERC20(cellarAsset);
  const assetDecimals = BigInt.fromI32(asset.decimals);

  snapshot.tvlInvested = cellar.tvlInvested;

  const convertShareResult = contract.try_convertToAssets(ONE_SHARE);
  if (convertShareResult.reverted) {
    log.warning("Could not call cellar.converToAssets: {}", [cellar.id]);
  } else {
    cellar.shareValue = convertShareResult.value;
    snapshot.shareValue = convertShareResult.value;

    // Set low candle
    if (snapshot.shareValue < snapshot.shareValueLow) {
      snapshot.shareValueLow = snapshot.shareValue;
    }

    // Set high candle
    if (snapshot.shareValue > snapshot.shareValueHigh) {
      snapshot.shareValueHigh = snapshot.shareValue;
    }

    const singleShare = convertDecimals(ONE_BI, ZERO_BI, assetDecimals);
    const shareProfitRatio = cellar.shareValue
      .minus(singleShare)
      .toBigDecimal()
      .div(singleShare.toBigDecimal());

    cellar.shareProfitRatio = shareProfitRatio;
    snapshot.shareProfitRatio = shareProfitRatio;
  }

  const activeAssetsResult = contract.try_totalBalance();
  if (activeAssetsResult.reverted) {
    log.warning("Could not call cellar.activeAssets: {}", [cellar.id]);

    snapshot.tvlActive = ZERO_BI;
    snapshot.earnings = ZERO_BI;
  } else {
    const prevEntity = loadPrevCellarHourData(
      cellar.id,
      event.block.timestamp,
      cellarAsset
    );

    const activeAssets = normalizeDecimals(
      activeAssetsResult.value,
      assetDecimals
    );

    snapshot.tvlActive = activeAssets;
    const accumulated = activeAssets.minus(snapshot.tvlInvested);
    const prevAccumulated = prevEntity.tvlActive.minus(prevEntity.tvlInvested);
    snapshot.earnings = accumulated.minus(prevAccumulated);

    if (snapshot.earnings < ZERO_BI) {
      snapshot.earnings = ZERO_BI;
    }
  }

  const inactiveAssetsResult = contract.try_totalHoldings();
  if (inactiveAssetsResult.reverted) {
    log.warning("Could not call cellar.inactiveAssets: {}", [cellar.id]);

    snapshot.tvlInactive = ZERO_BI;
  } else {
    const inactiveAssets = normalizeDecimals(
      inactiveAssetsResult.value,
      assetDecimals
    );

    snapshot.tvlInactive = inactiveAssets;
  }

  snapshot.tvlTotal = snapshot.tvlActive.plus(snapshot.tvlInactive);
  snapshot.updatedAt = timestamp;

  cellar.tvlActive = snapshot.tvlActive;
  cellar.tvlInactive = snapshot.tvlInactive;
  cellar.tvlTotal = snapshot.tvlTotal;

  snapshot.save();
  cellar.save();
}
