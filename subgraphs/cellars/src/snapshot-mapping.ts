import { Cellar as CellarContract } from "../generated/Cellar/Cellar";
import { Cellar } from "../generated/schema";
import { CELLAR_AAVE_LATEST, V1PT5_CELLARS, V2_CELLARS, V2pt5_CELLARS, ZERO_BI, ONE_BI, CELLAR_ONE_SHARE_MAPPING, NEGATIVE_ONE_BI } from "./utils/constants";
import { loadPlatform } from "./utils/entities";
import { convertDecimals, loadCellar, loadCellarDayData, loadPrevCellarDayData, loadCellarHourData, loadPrevCellarHourData, loadOrCreateTokenERC20, normalizeDecimals, HOUR_SECONDS } from "./utils/helpers";
import { snapshotDay as v1_5SnapshotDay, snapshotHour as v1_5SnapshotHour } from "./utils/v1-5";
import { snapshotDay as v2SnapshotDay, snapshotHour as v2SnapshotHour } from "./utils/v2";
import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts";


const cellarLatest = Address.fromString(CELLAR_AAVE_LATEST);

// Snapshot Cellars every N blocks
const SNAPSHOT_INTERVAL = BigInt.fromI32(10);

// Snapshot window in seconds before the top of the hour
const SNAPSHOT_WINDOW_SECS = 45;

// Checks to see if the block timestamp is within the snapshot window
function isWithinSnapshotWindow(block: ethereum.Block): bool {
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
  // !Important
  // Hour snapshots must take place before day snapshots.
  // Day snapshots copy the values from hour snapshots to avoid
  // duplication of RPC calls

  // Aave Cellar
  const cellar = loadCellar(cellarLatest);
  snapshotHour(block, cellar);
  snapshotDay(block, cellar);

  // v1.5 Cellars
  for (let i = 0; i < V1PT5_CELLARS.length; i++) {
    const address = V1PT5_CELLARS[i];
    // Snapshot day must be called first since it initializes cellar.positions
    // and calculates the position distribution
    v1_5SnapshotHour(block, address);
    v1_5SnapshotDay(block, address);
  }

  // v2 Cellars
  for (let i = 0; i < V2_CELLARS.length; i++) {
    const address = V2_CELLARS[i];
    v2SnapshotHour(block, address);
    v2SnapshotDay(block, address);
  }

  // v2.5 Cellars, Basically identical to v2 so reuse v2 snapshot functions
  for (let i = 0; i < V2pt5_CELLARS.length; i++) {
    const address = V2pt5_CELLARS[i];
    v2SnapshotHour(block, address);
    v2SnapshotDay(block, address);
  }

  // Checkpoint the block we snapshotted at
  const platform = loadPlatform();
  platform.latestSnapshotUpdatedAt = block.timestamp.toI32();
  platform.latestSnapshotUpdatedAtBlock = block.number.toI32();
  platform.save();
}

function snapshotDay(block: ethereum.Block, cellar: Cellar): void {
  if (cellar.asset == null) {
    return;
  }
  const cellarAsset = cellar.asset as string;

  const snapshot = loadCellarDayData(cellar.id, block.timestamp, cellarAsset);

  // Load hour snapshot data and copy values so we don't fetch
  // from RPC twice
  const hour = loadCellarHourData(cellar.id, block.timestamp, cellarAsset);
  snapshot.updatedAt = hour.updatedAt;
  snapshot.addedLiquidity = hour.addedLiquidity;
  snapshot.removedLiquidity = hour.removedLiquidity;
  snapshot.numWallets = hour.numWallets;

  snapshot.tvlActive = hour.tvlActive;
  snapshot.tvlInactive = hour.tvlInactive;
  snapshot.tvlInvested = hour.tvlInvested;
  snapshot.tvlTotal = hour.tvlTotal;

  snapshot.shareValue = hour.shareValue;
  snapshot.shareValueHigh = hour.shareValueHigh;
  snapshot.shareValueLow = hour.shareValueLow;
  snapshot.shareProfitRatio = hour.shareProfitRatio;
  snapshot.positionDistribution = hour.positionDistribution;
  snapshot.earnings = hour.earnings;

  const prevEntity = loadPrevCellarDayData(
    cellar.id,
    block.timestamp,
    cellarAsset
  );

  // Calculate earnings
  const activeAssets = hour.tvlActive;
  snapshot.tvlActive = activeAssets;
  const accumulated = activeAssets.minus(snapshot.tvlInvested);
  const prevAccumulated = prevEntity.tvlActive.minus(prevEntity.tvlInvested);
  snapshot.earnings = accumulated.minus(prevAccumulated);

  if (snapshot.earnings < ZERO_BI) {
    snapshot.earnings = ZERO_BI;
  }

  snapshot.save();
}

function snapshotHour(block: ethereum.Block, cellar: Cellar): void {
  if (cellar.asset == null) {
    return;
  }
  const contract = CellarContract.bind(Address.fromString(cellar.id));
  const cellarAsset = cellar.asset as string;

  const snapshot = loadCellarHourData(cellar.id, block.timestamp, cellarAsset);

  const asset = loadOrCreateTokenERC20(cellarAsset);
  const assetDecimals = BigInt.fromI32(asset.decimals);

  snapshot.tvlInvested = cellar.tvlInvested;

  const convertShareResult = contract.try_convertToAssets(
    CELLAR_ONE_SHARE_MAPPING.get(cellar.id.toLowerCase())
  );
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