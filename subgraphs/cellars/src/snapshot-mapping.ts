import { Cellar as CellarContract } from "../generated/Cellar/Cellar";
import { Cellar } from "../generated/schema";
import {
  CELLAR_AAVE_LATEST,
  V1PT5_CELLARS,
  V2_CELLARS,
  ZERO_BI,
  ONE_BI,
  ONE_SHARE,
  NEGATIVE_ONE_BI,
} from "./utils/constants";
import { loadPlatform } from "./utils/entities";
import {
  convertDecimals,
  loadCellar,
  loadCellarDayData,
  loadPrevCellarDayData,
  loadCellarHourData,
  loadPrevCellarHourData,
  loadOrCreateTokenERC20,
  normalizeDecimals,
  HOUR_SECONDS,
} from "./utils/helpers";
import {
  snapshotDay as v1_5SnapshotDay,
  snapshotHour as v1_5SnapshotHour,
} from "./utils/v1-5";
import {
  snapshotDay as v2SnapshotDay,
  snapshotHour as v2SnapshotHour,
} from "./utils/v2";
import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts";

const cellarLatest = Address.fromString(CELLAR_AAVE_LATEST);

// Snapshot Cellars every N blocks
const SNAPSHOT_INTERVAL = BigInt.fromI32(10);

// Snapshot window in seconds before the top of the hour
const SNAPSHOT_WINDOW_SECS = 45;

// Checks to see if the block timestamp is within the snapshot window
function isWithinSnapshotWindow(block: ethereum.Block): Boolean {
  const blockTimestamp = block.timestamp.toI32();

  // current hour in epoch seconds
  const currentHourStart = (blockTimestamp / HOUR_SECONDS) * HOUR_SECONDS;
  const currentHourEnd = currentHourStart + HOUR_SECONDS - 1;
  const startWindow = currentHourEnd - SNAPSHOT_WINDOW_SECS;

  // check current block timestamp falls outside of the snapshot window
  if (blockTimestamp < startWindow || blockTimestamp > currentHourEnd) {
    return false;
  }

  const platform = loadPlatform();
  const updatedAt = platform.latestSnapshotUpdatedAt;

  // check if an update has already happened in the snapshot window
  if (
    updatedAt != 0 &&
    updatedAt >= startWindow &&
    updatedAt <= currentHourEnd
  ) {
    return false;
  }

  return true;
}

function shouldSnapshotBlock(block: ethereum.Block): Boolean {
  return block.number.mod(SNAPSHOT_INTERVAL).equals(BigInt.zero());
}

export function handleBlock(block: ethereum.Block): void {
  if (!isWithinSnapshotWindow(block)) {
    return;
  }

  // Aave Cellar
  const cellar = loadCellar(cellarLatest);
  const contract = CellarContract.bind(cellarLatest);
  snapshotDay(block, cellar, contract);
  snapshotHour(block, cellar, contract);

  // v1.5 Cellars
  for (let i = 0; i < V1PT5_CELLARS.length; i++) {
    const address = V1PT5_CELLARS[i];
    // Snapshot day must be called first since it initializes cellar.positions
    // and calculates the position distribution
    v1_5SnapshotDay(block, address);
    v1_5SnapshotHour(block, address);
  }

  // v2 Cellars
  for (let i = 0; i < V2_CELLARS.length; i++) {
    const address = V2_CELLARS[i];
    v2SnapshotDay(block, address);
    v2SnapshotHour(block, address);
  }

  // Checkpoint the block we snapshotted at
  const platform = loadPlatform();
  platform.latestSnapshotUpdatedAt = block.timestamp.toI32();
  platform.latestSnapshotUpdatedAtBlock = block.number.toI32();
  platform.save();
}

function snapshotDay(
  block: ethereum.Block,
  cellar: Cellar,
  contract: CellarContract
): void {
  if (cellar.asset == null) {
    return;
  }
  const cellarAsset = cellar.asset as string;

  const snapshot = loadCellarDayData(cellar.id, block.timestamp, cellarAsset);

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
      block.timestamp,
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
  snapshot.updatedAt = block.timestamp.toI32();

  snapshot.save();
}

function snapshotHour(
  block: ethereum.Block,
  cellar: Cellar,
  contract: CellarContract
): void {
  if (cellar.asset == null) {
    return;
  }
  const cellarAsset = cellar.asset as string;

  const snapshot = loadCellarHourData(cellar.id, block.timestamp, cellarAsset);

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
      block.timestamp,
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
  snapshot.updatedAt = block.timestamp.toI32();

  cellar.tvlActive = snapshot.tvlActive;
  cellar.tvlInactive = snapshot.tvlInactive;
  cellar.tvlTotal = snapshot.tvlTotal;

  snapshot.save();
  cellar.save();
}
