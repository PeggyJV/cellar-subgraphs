import { Transfer } from "../generated/USDC/ERC20";
import { CELLAR_AAVE_LATEST } from "./utils/constants";
import { loadCellar, loadCellarDayData } from "./utils/helpers";
import { Address } from "@graphprotocol/graph-ts";

const cellarLatest = Address.fromString(CELLAR_AAVE_LATEST);

// We are piggy backing off of USDCs transfer event to get more granularity
// for Cellar TVL snapshots.
export function handleTransfer(event: Transfer): void {
  const cellar = loadCellar(cellarLatest);
  const day = loadCellarDayData(cellar.id, event.block.timestamp);

  let shouldSave = false;
  if (cellar.tvlActive.gt(day.tvlActive)) {
    day.tvlActive = cellar.tvlActive;
    shouldSave = true;
  }

  if (cellar.tvlInactive.gt(day.tvlInactive)) {
    day.tvlInactive = cellar.tvlInactive;
    shouldSave = true;
  }

  if (cellar.tvlTotal.gt(day.tvlTotal)) {
    day.tvlTotal = cellar.tvlTotal;
    shouldSave = true;
  }

  if (shouldSave) {
    day.save();
  }
}
