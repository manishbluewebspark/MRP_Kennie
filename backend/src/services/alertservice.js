// cron/alertsCron.js
import cron from "node-cron";
import Alert from "../models/Alert.js";
import PurchaseOrders from "../models/PurchaseOrders.js";
import WorkOrder from "../models/WorkingOrders.js";
import SystemSettings from "../models/SystemSettings.js";
import { addAlert } from "../utils/addAlert.js";


// -------------------- date helpers --------------------
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const diffDays = (futureDate, fromDate = new Date()) => {
  const a = startOfDay(futureDate).getTime();
  const b = startOfDay(fromDate).getTime();
  return Math.ceil((a - b) / (1000 * 60 * 60 * 24));
};

const daysSince = (pastDate, fromDate = new Date()) => {
  const a = startOfDay(fromDate).getTime();
  const b = startOfDay(pastDate).getTime();
  return Math.floor((a - b) / (1000 * 60 * 60 * 24));
};

const getPoNo = (po) => po.poNumber || po.purchaseOrderNo || String(po._id);
const getWoNo = (wo) =>
  wo.workOrderNo || wo.workOrderNumber || wo.woNumber || String(wo._id);

// -------------------- duplicate guard --------------------
async function createAlertOnce({ title, module, relatedId, ...payload }) {
  // if no Alert model, still create (but can spam)
  if (Alert) {
    const exists = await Alert.exists({
      title,
      module,
      relatedId,
      isResolved: { $ne: true }, // adjust if needed
    });
    if (exists) return;
  }

  await addAlert({ title, module, relatedId, ...payload });
}

// =======================================================
// WORK ORDER: Commit Date Approaching
// =======================================================
async function commitDateApproachingAlert(wo, alertSettings) {
  const triggerDays = Number(alertSettings?.workOrderAlertTrigger ?? 2);

  if (!wo?.commitDate) return;
  if (wo?.isProductionComplete) return;

  const daysLeft = diffDays(wo.commitDate);
  if (daysLeft < 0 || daysLeft > triggerDays) return;

  const woNo = getWoNo(wo);

  await createAlertOnce({
    title: `Work Order ${woNo} - Approaching Commit Date`,
    message: `Work Order ${woNo} is ${daysLeft} day(s) from commit date and production is not complete. Current status: ${wo.status || "N/A"}.`,
    priority: daysLeft <= 1 ? "critical" : "medium",
    module: "work_order",
    relatedId: wo._id,
    assignedTo: wo.assignedTo || null,
  });
}

// =======================================================
// WORK ORDER: No Commit Date
// =======================================================
const getItemLabel = (it) =>
  it?.idNumber || it?.lineNo || it?.itemNumber || it?._id?.toString()?.slice(-6) || "Item";

const getItemCommitDate = (it) =>
  it?.commitDate || it?.commit_date || it?.commit_date_at || null;

async function purchaseOrderItemNoCommitDateAlert(po, alertSettings) {
  const triggerDays = Number(alertSettings?.noCommitDateAlertTrigger ?? 3);

  // PO completed / deleted skip
  if (!po) return;
  if (String(po.status || "").toLowerCase() === "completed") return;
  if (po.isDeleted) return;

  const baseDate = po.createdAt || po.poDate;
  if (!baseDate) return;

  const ageDays = daysSince(baseDate);
  if (ageDays < triggerDays) return;

  const items = Array.isArray(po.items) ? po.items : [];

  // ✅ find items where commitDate is missing
  const missing = items.filter((it) => !getItemCommitDate(it));

  if (missing.length === 0) return;

  const poNo = getPoNo(po);

  // show first few items in message
  const list = missing
    .slice(0, 5)
    .map((it) => `${getItemLabel(it)} - ${it.description || ""}`.trim())
    .join(", ");

  const extra = missing.length > 5 ? ` (+${missing.length - 5} more)` : "";

  await createAlertOnce({
    title: `Purchase Order ${poNo} - Item Commit Date Missing`,
    message: `Purchase Order ${poNo} has ${missing.length} item(s) with missing commit date: ${list}${extra}. Please update commit date for these item(s).`,
    priority: "warning",
    module: "purchase_order",
    relatedId: po._id,
    assignedTo: po.assignedTo || null,
  });
}


// =======================================================
// PURCHASE ORDER: Purchase Date Approaching (weeks)
// =======================================================
async function purchaseDateAlert(po, alertSettings) {
  const triggerWeeks = Number(alertSettings?.purchaseAlertTrigger ?? 2);
  const triggerDays = triggerWeeks * 7;

  if (!po?.needDate) return;
  

  const daysLeft = diffDays(po.needDate);
  if (daysLeft < 0 || daysLeft > triggerDays) return;

  const poNo = getPoNo(po);

  await createAlertOnce({
    title: `Purchase Order ${poNo} - Purchase Date Approaching`,
    message: `Purchase Order ${poNo} is ${daysLeft} day(s) from purchase date.`,
    priority: daysLeft <= 1 ? "critical" : "warning",
    module: "purchase_order",
    relatedId: po._id,
    assignedTo: po.assignedTo || null,
  });
}

// =======================================================
// PURCHASE ORDER: Receiving Window (days)
// =======================================================
async function receivingWindowAlert(po, alertSettings) {
  const windowDays = Number(alertSettings?.receivingWindow ?? 7);

  const receivingDate =
    po?.expectedReceivingDate || po?.receivingDate || po?.receiveByDate;

  if (!receivingDate) return;
  if (po?.isReceived) return;

  const daysLeft = diffDays(receivingDate);
  if (daysLeft < 0 || daysLeft > windowDays) return;

  const poNo = getPoNo(po);

  await createAlertOnce({
    title: `Purchase Order ${poNo} - Receiving Window`,
    message: `Receiving for PO ${poNo} is due in ${daysLeft} day(s).`,
    priority: "medium",
    module: "receiving",
    relatedId: po._id,
    assignedTo: po.assignedTo || null,
  });
}

// =======================================================
// MAIN RUN (fetch data + create alerts)
// =======================================================
async function runAlertsJob() {
  try {
    // ✅ settings
    const systemSetting = await SystemSettings.findOne({}).lean();
    const alertSettings = systemSetting?.alertSettings || systemSetting || {};

    // ✅ fetch active WorkOrders
    const workOrders = await WorkOrder.find({
      isProductionComplete: { $ne: true },
      // optional: only in production
      // isInProduction: true,
    })
      .select("_id workOrderNo workOrderNumber woNumber status commitDate isProductionComplete createdAt assignedTo")
      .lean();

    for (const wo of workOrders) {
      await commitDateApproachingAlert(wo, alertSettings);
    }

    // ✅ fetch active PurchaseOrders
 const purchaseOrders = await PurchaseOrders.find({
  status: { $ne: "Completed" },
  isDeleted: { $ne: true },
})
  .select(
    "_id poNumber poDate needDate status isDeleted createdAt assignedTo " +
    "items._id items.idNumber items.description items.status items.commitDate"
  )
  .lean();



 for (const po of purchaseOrders) {
  await purchaseDateAlert(po, alertSettings);
  await receivingWindowAlert(po, alertSettings);
  await purchaseOrderItemNoCommitDateAlert(po, alertSettings); // ✅ correct
}


    console.log(
      `[ALERT-CRON] Done. WOs=${workOrders.length}, POs=${purchaseOrders.length}, time=${new Date().toISOString()}`
    );
  } catch (err) {
    console.error("[ALERT-CRON] Error:", err?.message || err);
  }
}

// =======================================================
// START CRON (every 3 hours)
// =======================================================
export const startAlertsCron = () => {
  // run once on server start (optional but useful)
  runAlertsJob();

  // Every 3 hours: minute 0 at 0,3,6,9,12,15,18,21
  cron.schedule("0 */3 * * *", runAlertsJob, {
    timezone: "Asia/Kolkata",
  });

  console.log("[ALERT-CRON] Scheduled: every 3 hours (Asia/Kolkata)");
};
