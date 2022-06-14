import { Cellar as CellarContract } from "../generated/Cellar/Cellar";
import { Transfer } from "../generated/USDC/ERC20";
import { Cellar } from "../generated/schema";
import { CELLAR_AAVE_LATEST, ZERO_BI } from "./utils/constants";
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

// We are piggy backing off of USDCs transfer event to get more granularity
// for Cellar TVL and aToken snapshots.
export function handleTransfer(event: Transfer): void {
  const cellar = loadCellar(cellarLatest);
  const contract = CellarContract.bind(Address.fromString(cellar.id));

  snapshotDay(event, cellar, contract);
  snapshotHour(event, cellar, contract);

  cellar.save();
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

  const dataEntity = loadCellarDayData(
    cellar.id,
    event.block.timestamp,
    cellarAsset
  );

  const timestamp = event.block.timestamp.toI32();
  const secSinceUpdated = timestamp - dataEntity.updatedAt;
  if (dataEntity.updatedAt != 0 && secSinceUpdated < 60 * 10) {
    // Bail if we updated in the last 10 minutes
    return;
  }

  const asset = loadOrCreateTokenERC20(cellarAsset);

  dataEntity.tvlInvested = cellar.tvlInvested;

  const activeAssetsResult = contract.try_activeAssets();
  if (activeAssetsResult.reverted) {
    log.warning("Could not call cellar.activeAssets: {}", [cellar.id]);

    dataEntity.tvlActive = ZERO_BI;
    dataEntity.earnings = ZERO_BI;
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

    dataEntity.tvlActive = activeAssets;
    const accumulated = activeAssets.minus(dataEntity.tvlInvested);
    const prevAccumulated = prevEntity.tvlActive.minus(prevEntity.tvlInvested);
    dataEntity.earnings = accumulated.minus(prevAccumulated);

    if (dataEntity.earnings < ZERO_BI) {
      dataEntity.earnings = ZERO_BI;
    }
  }

  const inactiveAssetsResult = contract.try_inactiveAssets();
  if (inactiveAssetsResult.reverted) {
    log.warning("Could not call cellar.inactiveAssets: {}", [cellar.id]);

    dataEntity.tvlInactive = ZERO_BI;
  } else {
    const inactiveAssets = normalizeDecimals(
      inactiveAssetsResult.value,
      BigInt.fromI32(asset.decimals)
    );
    dataEntity.tvlInactive = inactiveAssets;
  }

  dataEntity.tvlTotal = dataEntity.tvlActive.plus(dataEntity.tvlInactive);
  dataEntity.updatedAt = timestamp;

  dataEntity.save();
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

  const dataEntity = loadCellarHourData(
    cellar.id,
    event.block.timestamp,
    cellarAsset
  );

  const timestamp = event.block.timestamp.toI32();
  const secSinceUpdated = timestamp - dataEntity.updatedAt;
  if (dataEntity.updatedAt != 0 && secSinceUpdated < 60 * 10) {
    // Bail if we updated in the last 10 minutes
    return;
  }

  const asset = loadOrCreateTokenERC20(cellarAsset);

  dataEntity.tvlInvested = cellar.tvlInvested;

  const activeAssetsResult = contract.try_activeAssets();
  if (activeAssetsResult.reverted) {
    log.warning("Could not call cellar.activeAssets: {}", [cellar.id]);

    dataEntity.tvlActive = ZERO_BI;
    dataEntity.earnings = ZERO_BI;
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

    dataEntity.tvlActive = activeAssets;
    const accumulated = activeAssets.minus(dataEntity.tvlInvested);
    const prevAccumulated = prevEntity.tvlActive.minus(prevEntity.tvlInvested);
    dataEntity.earnings = accumulated.minus(prevAccumulated);

    if (dataEntity.earnings < ZERO_BI) {
      dataEntity.earnings = ZERO_BI;
    }
  }

  const inactiveAssetsResult = contract.try_inactiveAssets();
  if (inactiveAssetsResult.reverted) {
    log.warning("Could not call cellar.inactiveAssets: {}", [cellar.id]);

    dataEntity.tvlInactive = ZERO_BI;
  } else {
    const inactiveAssets = normalizeDecimals(
      inactiveAssetsResult.value,
      BigInt.fromI32(asset.decimals)
    );

    dataEntity.tvlInactive = inactiveAssets;
  }

  dataEntity.tvlTotal = dataEntity.tvlActive.plus(dataEntity.tvlInactive);
  dataEntity.updatedAt = timestamp;

  cellar.tvlActive = dataEntity.tvlActive;
  cellar.tvlInactive = dataEntity.tvlInactive;
  cellar.tvlTotal = dataEntity.tvlTotal;

  dataEntity.save();
}
