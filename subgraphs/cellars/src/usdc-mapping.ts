import { Cellar as CellarContract } from "../generated/Cellar/Cellar";
import { Transfer } from "../generated/USDC/ERC20";
import { Cellar } from "../generated/schema";
import { snapshotDay as cgSnapshotDay } from "./utils/cleargate";
import {
  CELLAR_AAVE_LATEST,
  CELLAR_CLEARGATE_A,
  CELLAR_CLEARGATE_B,
  CELLAR_CLEARGATE_C,
  CELLAR_CLEARGATE_D,
  ZERO_BI,
} from "./utils/constants";
import {
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
const cleargateCellars = new Array<string>();
cleargateCellars.push(CELLAR_CLEARGATE_A);
cleargateCellars.push(CELLAR_CLEARGATE_B);
cleargateCellars.push(CELLAR_CLEARGATE_C);
cleargateCellars.push(CELLAR_CLEARGATE_D);

// We are piggy backing off of USDCs transfer event to get more granularity
// for Cellar TVL and aToken snapshots.
export function handleTransfer(event: Transfer): void {
  const cellar = loadCellar(cellarLatest);
  const contract = CellarContract.bind(Address.fromString(cellar.id));
  snapshotDay(event, cellar, contract);
  snapshotHour(event, cellar, contract);

  // cleargate
  for (let i = 0; i < cleargateCellars.length; i++) {
    const address = cleargateCellars[i];
    cgSnapshotDay(event, address);
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

  snapshot.tvlInvested = cellar.tvlInvested;

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

  snapshot.tvlInvested = cellar.tvlInvested;

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

  cellar.tvlActive = snapshot.tvlActive;
  cellar.tvlInactive = snapshot.tvlInactive;
  cellar.tvlTotal = snapshot.tvlTotal;

  snapshot.save();
}
