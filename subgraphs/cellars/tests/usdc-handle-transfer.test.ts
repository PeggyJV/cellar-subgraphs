import { Transfer } from "../generated/USDC/ERC20";
import { handleTransfer } from "../src/usdc-mapping";
import { getDayId } from "../src/utils/helpers";
import { assert, clearStore, test, newMockEvent } from "matchstick-as/assembly";

test("it updates CellarDayData.tvlActive", () => {});

test("it updates CellarDayData.tvlInactive", () => {});

test("it updates CellarDayData.tvlTotal", () => {});

test("it does not update CellarDayData.tvlActive if smaller", () => {});

test("it does not update CellarDayData.tvlInactive if smaller", () => {});

test("it does not update CellarDayData.tvlTotal if smaller", () => {});
