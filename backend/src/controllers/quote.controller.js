import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import Customer from '../models/Customer.js';
import Drawing from '../models/Drwaing.js';
import Quote from '../models/Quote.js';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle
} from "docx";
import mongoose from 'mongoose';
import Project from '../models/Project.js';


function normalizeIds(req) {
  if (Array.isArray(req.body?.quoteIds)) return req.body.quoteIds;
  const raw = req.query.ids || req.params.ids || req.body?.quoteIds;
  if (typeof raw === "string") {
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const round2 = (v) => Number(toNum(v).toFixed(2));


// ---------------- CREATE QUOTE ----------------
// export const createQuote = async (req, res) => {
//   try {
//     const { customerId, items, validUntil, status = 'draft' } = req.body;

//     const customer = await Customer.findById(customerId);
//     if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

//     const quoteItems = [];
//     for (const item of items) {
//       const drawing = await Drawing.findById(item.drawingId);
//       if (!drawing) return res.status(404).json({ success: false, message: `Drawing ${item.drawingId} not found` });

//       quoteItems.push({
//         drawingId: item.drawingId,
//         drawingNumber: drawing.drawingNumber || drawing.drawingNo,
//         tool: drawing.tool || drawing.description || '—',
//         unitPrice: drawing.unitPrice || 0,
//         quantity: item.quantity || 1,
//         totalPrice: (drawing.unitPrice || 0) * (item.quantity || 1)
//       });
//     }

//     const quote = new Quote({
//       customerId,
//       customerName: customer.contactPerson,
//       customerEmail: customer.email,
//       customerCompany: customer.companyName,
//       items: quoteItems,
//       validUntil: new Date(validUntil),
//       status,
//       createdBy: req.user._id,
//       updatedBy: req.user._id
//     });

//     await quote.save();

//     const populatedQuote = await Quote.findById(quote._id)
//       .populate('customerId', 'companyName contactPerson email phone address')
//       .populate('createdBy', 'name email')
//       .populate('updatedBy', 'name email');

//     res.status(201).json({ success: true, message: 'Quote created successfully', data: populatedQuote });
//   } catch (error) {
//     console.error('CreateQuote Error:', error);
//     res.status(500).json({ success: false, message: 'Error creating quote', error: error.message });
//   }
// };

export const createQuote = async (req, res) => {
  try {
    const { customerId, items = [], validUntil, status = "draft" } = req.body;

    // 1) Basic validations
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: "Invalid customerId" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "At least one item is required" });
    }

    // 2) Customer
    const customer = await Customer.findById(customerId).lean();
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // 3) Bulk fetch drawings
    const drawingIds = [];
    for (const it of items) {
      if (!mongoose.Types.ObjectId.isValid(it.drawingId)) {
        return res.status(400).json({ success: false, message: `Invalid drawingId: ${it.drawingId}` });
      }
      drawingIds.push(new mongoose.Types.ObjectId(it.drawingId));
    }

    // Bring in projectId and minimal drawing fields in one go
    const drawings = await Drawing.find(
      { _id: { $in: drawingIds } },
      {
        drawingNumber: 1,
        drawingNo: 1,
        description: 1,
        tool: 1,
        totalPriceWithMarkup: 1,
        totalPrice: 1,
        unitPrice: 1,
        projectId: 1,
      }
    ).lean();

    // Ensure all drawings exist
    const dMap = new Map(drawings.map(d => [String(d._id), d]));
    for (const it of items) {
      if (!dMap.get(String(it.drawingId))) {
        return res.status(404).json({ success: false, message: `Drawing not found: ${it.drawingId}` });
      }
    }

    // 4) Bulk fetch projects for currency lookup
    const projectIds = [
      ...new Set(
        drawings
          .map(d => d.projectId)
          .filter(Boolean)
          .map(id => String(id))
      ),
    ].map(id => new mongoose.Types.ObjectId(id));

    const projects = projectIds.length
      ? await Project.find(
        { _id: { $in: projectIds } },
        { _id: 1, currency: 1 }
      ).lean()
      : [];

    const pMap = new Map(projects.map(p => [String(p._id), p]));

    // 5) Build quote items
    const quoteItems = [];
    let totalQuantity = 0;
    let totalQuoteValue = 0;
    const itemCurrencies = new Set();

    for (const it of items) {
      const d = dMap.get(String(it.drawingId));
      const proj = d?.projectId ? pMap.get(String(d.projectId)) : null;
      const currencyFromProject = proj?.currency || null; // <-- currency injected from project
      if (currencyFromProject) itemCurrencies.add(currencyFromProject);

      const qty = Math.max(1, toNum(it.qty ?? it.quantity, 1));
      const unit =
        toNum(d.totalPriceWithMarkup) ||
        toNum(d.totalPrice) ||
        toNum(d.unitPrice) ||
        0;

      const unitPrice = round2(unit);
      const lineTotal = round2(unitPrice * qty);

      quoteItems.push({
        drawingId: d._id,
        drawingNumber: d.drawingNumber || d.drawingNo || "-",
        tool: d.tool || d.description || "—",
        unitPrice: unitPrice,
        quantity: qty,
        currency: currencyFromProject,            // 👈 set item currency from drawing->project
        totalPrice: lineTotal,
      });

      totalQuantity += qty;
      totalQuoteValue = round2(totalQuoteValue + lineTotal);
    }

    const totalDrawings = quoteItems.length;

    // 6) Generate date-scoped sequential quote number: Q-YYYYMMDD-###
    // Generate Quote Number: QYY-XXXX
    const now = new Date();
const year = now.getFullYear();
const shortYear = String(year).slice(-2);   // 2025 → "25"
const prefix = `Q${shortYear}-`;            // "Q25-"

// Find last quote number for this year
const lastQuote = await Quote.findOne({
  quoteNumber: { $regex: `^${prefix}\\d{5}$` },   // Match Q25-xxxxx
})
.sort({ quoteNumber: -1 })
.select("quoteNumber")
.lean();

let nextSeq = 1;  // Default beginning sequence

if (lastQuote?.quoteNumber) {
  // Extract numeric part: Q25-00012 → 00012
  const numberPart = lastQuote.quoteNumber.replace(prefix, ""); 
  const parsed = parseInt(numberPart, 10);

  if (!isNaN(parsed)) {
    nextSeq = parsed + 1;   // Always +1
  }
}

// Build 5-digit padded sequence
const seq = String(nextSeq).padStart(5, "0");

// Final quoteNumber output
const quoteNumber = `${prefix}${seq}`;





    // 7) If every item has same currency, set top-level quote currency as well
    let quoteCurrency = null;
    if (itemCurrencies.size === 1) {
      quoteCurrency = [...itemCurrencies][0];
    }

    // 8) Create and save the quote
    const quote = await Quote.create({
      customerId,
      customerName: customer.contactPerson || customer.name || "",
      customerEmail: customer.email || "",
      customerCompany: customer.companyName || customer.company || "",
      items: quoteItems,
      totalQuantity,
      totalDrawings,
      totalQuoteValue,
      quoteNumber,
      quoteDate: now,                                   // keep naming consistent in your schema
      validUntil: validUntil ? new Date(validUntil) : undefined,
      status,
      currency: quoteCurrency,                          // 👈 set top-level currency if uniform
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    // 9) Populate for response
    const populatedQuote = await Quote.findById(quote._id)
      .populate("customerId", "companyName contactPerson email phone address")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    return res
      .status(201)
      .json({ success: true, message: "Quote created successfully", data: populatedQuote });
  } catch (error) {
    console.error("CreateQuote Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error creating quote", error: error.message });
  }
};


// ---------------- GET ALL QUOTES ----------------
export const getAllQuotes = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customerId, startDate, endDate, search } = req.query;

    const filter = { isDeleted: false };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (startDate || endDate) {
      filter.quoteDate = {};
      if (startDate) filter.quoteDate.$gte = new Date(startDate);
      if (endDate) filter.quoteDate.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { quoteNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerCompany: { $regex: search, $options: 'i' } }
      ];
    }

    const quotes = await Quote.find(filter)
      .sort({ created: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('customerId', 'companyName contactPerson email')
      .populate('createdBy', 'name email')
      .populate('currency', 'code name symbol');

    const totalQuotes = await Quote.countDocuments(filter);

    res.json({
      success: true,
      data: quotes,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalQuotes / limit),
        totalQuotes
      }
    });
  } catch (error) {
    console.error('GetAllQuotes Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching quotes', error: error.message });
  }
};

// ---------------- GET QUOTE BY ID ----------------
export const getQuoteById = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('customerId')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('items.drawingId');

    if (!quote || quote.isDeleted) return res.status(404).json({ success: false, message: 'Quote not found' });

    res.json({ success: true, data: quote });
  } catch (error) {
    console.error('GetQuoteById Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching quote', error: error.message });
  }
};

// ---------------- UPDATE QUOTE ----------------
// export const updateQuote = async (req, res) => {
//   try {
//     const { items, ...updateData } = req.body;

//     if (items) {
//       const quoteItems = [];
//       for (const item of items) {
//         const drawing = await Drawing.findById(item.drawingId);
//         if (!drawing) return res.status(404).json({ success: false, message: `Drawing ${item.drawingId} not found` });

//         quoteItems.push({
//           drawingId: item.drawingId,
//           drawingNumber: drawing.drawingNumber,
//           tool: drawing.tool || drawing.description || '—',
//           unitPrice: drawing.unitPrice || 0,
//           quantity: item.quantity || 1,
//           totalPrice: (drawing.unitPrice || 0) * (item.quantity || 1)
//         });
//       }
//       updateData.items = quoteItems;
//     }

//     updateData.updatedBy = req.user._id;
//     updateData.updated = new Date();

//     const quote = await Quote.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
//       .populate('customerId')
//       .populate('createdBy', 'name email')
//       .populate('updatedBy', 'name email')
//       .populate('items.drawingId');

//     if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });

//     res.json({ success: true, message: 'Quote updated successfully', data: quote });
//   } catch (error) {
//     console.error('UpdateQuote Error:', error);
//     res.status(500).json({ success: false, message: 'Error updating quote', error: error.message });
//   }
// };

export const updateQuote = async (req, res) => {
  try {
    const { items, ...updateData } = req.body;

    if (items) {
      const quoteItems = [];
      let totalQuantity = 0;
      let totalQuoteValue = 0;

      for (const item of items) {
        const drawing = await Drawing.findById(item.drawingId);
        if (!drawing) {
          return res.status(404).json({
            success: false,
            message: `Drawing ${item.drawingId} not found`
          });
        }

        const qty = item.quantity || 1;
        const price = item.unitPrice || drawing.unitPrice || 0;
        const drawingNumber = drawing.drawingNumber || drawing.drawingNo;

        // Validate required fields
        if (!drawingNumber) {
          return res.status(400).json({
            success: false,
            message: `Drawing number is required for drawing ${item.drawingId}`
          });
        }

        const quoteItem = {
          drawingId: item.drawingId,
          drawingNumber: drawingNumber,
          tool: drawing.tool || drawing.description || '—',
          unitPrice: price,
          quantity: qty,
          totalPrice: price * qty
        };

        quoteItems.push(quoteItem);
        totalQuantity += qty;
        totalQuoteValue += price * qty;
      }

      updateData.items = quoteItems;
      updateData.totalQuantity = totalQuantity;
      updateData.totalQuoteValue = totalQuoteValue;
      updateData.totalDrawings = quoteItems.length;
    }

    updateData.updatedBy = req.user._id;
    updateData.updated = new Date();

    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('customerId', 'companyName contactPerson email phone address')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    res.json({
      success: true,
      message: 'Quote updated successfully',
      data: quote
    });
  } catch (error) {
    console.error('UpdateQuote Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating quote',
      error: error.message
    });
  }
};

// ---------------- DELETE QUOTE (soft) ----------------
export const deleteQuote = async (req, res) => {
  try {
    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, isActive: false, updatedBy: req.user._id, updated: new Date() },
      { new: true }
    );

    if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });

    res.json({ success: true, message: 'Quote deleted successfully' });
  } catch (error) {
    console.error('DeleteQuote Error:', error);
    res.status(500).json({ success: false, message: 'Error deleting quote', error: error.message });
  }
};

// ---------------- GET QUOTES BY CUSTOMER ----------------
export const getQuotesByCustomer = async (req, res) => {
  try {
    const quotes = await Quote.find({ customerId: req.params.customerId, isDeleted: false })
      .populate('createdBy', 'name email')
      .sort({ created: -1 });

    res.json({ success: true, data: quotes });
  } catch (error) {
    console.error('GetQuotesByCustomer Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching customer quotes', error: error.message });
  }
};

// ---------------- UPDATE QUOTE STATUS ----------------
export const updateQuoteStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      { status, updatedBy: req.user._id, updated: new Date() },
      { new: true, runValidators: true }
    ).populate('customerId').populate('createdBy', 'name email');

    if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });

    res.json({ success: true, message: 'Quote status updated successfully', data: quote });
  } catch (error) {
    console.error('UpdateQuoteStatus Error:', error);
    res.status(500).json({ success: false, message: 'Error updating quote status', error: error.message });
  }
};

// ---------------- EXPORT SINGLE QUOTE TO EXCEL ----------------
/* ---------- helpers ---------- */
const S = v => (v === null || v === undefined ? '' : String(v));
const N = (v, d = 2) => {
  const num = Number(v);
  return Number.isFinite(num) ? Number(num.toFixed(d)) : 0;
};
const D = v => {
  try { return v ? new Date(v).toLocaleDateString('en-GB') : ''; } catch { return ''; }
};

const P = (children, opts = {}) => new Paragraph({ children, ...opts });
const T = (text, extra = {}) => new TextRun({ text: S(text), ...extra });


/* =========================================================
   EXCEL (ExcelJS) — styled, aligned, widths, totals
   ========================================================= */
export const exportQuoteToExcel = async (req, res) => {
  try {
    const quoteId = req.params.quoteId;

    const quote = await Quote.findById(quoteId)
      .populate("customerId")
      .populate("items.drawingId")
      .populate("currency","code")
      .lean();

      

    if (!quote) {
      return res
        .status(404)
        .json({ success: false, message: "Quote not found" });
    }

    // Normalize fields
    const customerName = S(quote.contactPerson || quote.customerId?.contactPerson);
    const customerCompany = S(
      quote.customerCompany || quote.customerId?.companyName
    );
    const companyAdd = S(quote?.customerId?.address)
    const customerEmail = S(quote.customerEmail || quote.customerId?.email);
    const quoteDate = D(quote.quoteDate);
    const validUntil = D(quote.validUntil);
    const paymentTerms = S(quote?.customerId?.paymentTerms);
    const incoterms = S(quote?.customerId?.incoterms);
    const currency = S(quote.currency?.code || "USD");
    const items = Array.isArray(quote.items) ? quote.items : [];

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Quote Details", {
      properties: { defaultRowHeight: 18 },
    });

    // Title (merge A1:F1)
    // ws.mergeCells("A1:F1");
    // ws.getCell("A1").value = `Quote #${S(quote.quoteNumber)}`;
    // ws.getCell("A1").font = { bold: true, size: 16 };
    // ws.getCell("A1").alignment = { horizontal: "center" };

    // Customer block (exact labels as you wrote)
    ws.addRow([]);
    ws.addRow(["Date", quoteDate]);
    ws.addRow([]);
    ws.addRow(["Customer Name", customerCompany]);
    ws.addRow(["Address", companyAdd]);
    ws.addRow(["Contact Person", customerName]);
    ws.addRow([]);
    ws.addRow(["Payment Terms:", paymentTerms]);
    ws.addRow(["Incoterms:", incoterms || validUntil]); // kept your earlier ‘validUntil’ fallback
    ws.addRow(["Currency:", currency]);
    ws.addRow([]);

    // Header
    const header = [
      "No",
      "Drawing No.",
      "Description",
      "Qty",
      "Unit Price",
      "Total Price",
    ];
    const headerRow = ws.addRow(header);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      // optional background for clarity
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFECECEC" }, // light grey
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };

    // Freeze on header row
    ws.views = [{ state: "frozen", ySplit: headerRow.number }];

    // Filter for header row
    ws.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: headerRow.number, column: header.length },
    };

    // Column widths: exactly 6 columns
    ws.columns = [
      { key: "no", width: 20 },
      { key: "drawingNo", width: 22 },
      { key: "desc", width: 36 },
      { key: "qty", width: 12 },
      { key: "unitPrice", width: 14 },
      { key: "totalPrice", width: 16 },
    ];

    const startDataRow = ws.lastRow.number + 1;

    // Rows
    items.forEach((it, idx) => {
      const drawingNo = S(it?.drawingNumber || it?.drawingId?.drawingNumber);
      const description =
        S(it?.description) || S(it?.tool) || S(it?.remarks) || "";
      const qty = N(it?.quantity, 0);
      const unit = N(it?.unitPrice);
      const totalCalc = Number.isFinite(Number(it?.totalPrice))
        ? N(it.totalPrice)
        : N(unit * qty);

      const r = ws.addRow([
        idx + 1,
        drawingNo,
        description,
        qty,
        unit,
        totalCalc,
      ]);

      // align numeric columns (Qty=4, Unit=5, Total=6)
      r.getCell(4).alignment = { horizontal: "right" };
      r.getCell(5).alignment = { horizontal: "right" };
      r.getCell(6).alignment = { horizontal: "right" };

      // number formats
      r.getCell(4).numFmt = "#,##0";
      r.getCell(5).numFmt = "#,##0.00";
      r.getCell(6).numFmt = "#,##0.00";
    });

    // Totals
    const endDataRow = ws.lastRow.number;

    const totals = ws.addRow([
      "Totals",
      "",
      "",
      { formula: `SUM(D${startDataRow}:D${endDataRow})` }, // Qty sum
      "", // Unit Price sum generally not required
      { formula: `SUM(F${startDataRow}:F${endDataRow})` }, // Total Price sum
    ]);

    totals.eachCell((cell, col) => {
      cell.font = { bold: true };
      // Right align numeric columns (Qty col 4, Total col 6)
      cell.alignment = {
        horizontal: col === 4 || col === 6 ? "right" : "left",
      };
      if (col === 4) cell.numFmt = "#,##0";
      if (col === 6) cell.numFmt = "#,##0.00";
      // top border
      cell.border = { top: { style: "thin" } };
      // soft highlight
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFDF2CC" },
      };
    });

    // (Optional) update status like your previous code
    await Quote.updateOne(
      { _id: quoteId },
      { $set: { status: "quoted", isPendingQuote: false } }
    );

    // Send file
    const buf = await wb.xlsx.writeBuffer();
    res.status(200);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="quote-${S(quote.quoteNumber)}.xlsx"`
    );
    res.setHeader("Content-Length", buf.byteLength);
    return res.end(Buffer.from(buf));
  } catch (err) {
    console.error("ExportQuoteToExcel Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error exporting quote to Excel" });
  }
};

export const exportQuoteToWord = async (req, res) => {
  try {
    const quoteId = req.params.quoteId || req.params.id;
    const quote = await Quote.findById(quoteId)
      .populate("customerId")
      .populate("items.drawingId")
      .populate("currency","code");

    if (!quote) {
      return res.status(404).json({ success: false, message: "Quote not found" });
    }

    // --- normalize ---
    const customerName = S(quote.customerName || quote.customerId?.name);
    const customerCompany = S(quote.customerCompany || quote.customerId?.companyName);
    const customerEmail = S(quote.customerEmail || quote.customerId?.email);

    const addressLines = [
      S(quote.customerAddress1 || quote.customerId?.address1),
      S(quote.customerAddress2 || quote.customerId?.address2),
      [S(quote.customerCity || quote.customerId?.city), S(quote.customerState || quote.customerId?.state), S(quote.customerZip || quote.customerId?.postalCode)]
        .filter(Boolean).join(" "),
      S(quote.customerCountry || quote.customerId?.country),
    ].filter(Boolean);

    const paymentTerms = S(quote?.customerId?.paymentTerms);
    const incoterms = S(quote?.customerId?.incoterms);
    const currency = S(quote.currency?.code || "USD");
    const quoteDate = D(quote.quoteDate);
    const validUntil = D(quote.validUntil);
    const items = Array.isArray(quote.items) ? quote.items : [];

    // --- Title ---
    const title = P([T(`QUOTE: ${S(quote.quoteNumber)}`, { bold: true, size: 32 })], {
      spacing: { after: 400 }
    });

    // --- Header block (company/address/contact) ---
    const headerBlock = [
      P([T(quoteDate || "-", { bold: true })]),
      P([T(customerCompany, { bold: true })]),
      ...addressLines.map(line => P([T(line)])),
      P([T("Attn: "), T(customerName || "-", { bold: true })]),
      P([]),
    ];

    // --- Terms table (3 columns: Payment Terms | Incoterms | Currency) ---
    const termsColWidths = [3000, 3000, 3000];
    const termsHeaderRow = new TableRow({
      children: [
        new TableCell({
          width: { size: termsColWidths[0], type: WidthType.DXA },
          children: [P([T("Payment Terms", { bold: true })], { alignment: AlignmentType.CENTER })],
          shading: { fill: "ECECEC" },
        }),
        new TableCell({
          width: { size: termsColWidths[1], type: WidthType.DXA },
          children: [P([T("Incoterms", { bold: true })], { alignment: AlignmentType.CENTER })],
          shading: { fill: "ECECEC" },
        }),
        new TableCell({
          width: { size: termsColWidths[2], type: WidthType.DXA },
          children: [P([T("Currency", { bold: true })], { alignment: AlignmentType.CENTER })],
          shading: { fill: "ECECEC" },
        }),
      ],
      tableHeader: true,
    });

    const termsValuesRow = new TableRow({
      children: [
        new TableCell({
          width: { size: termsColWidths[0], type: WidthType.DXA },
          children: [P([T(paymentTerms || "-")], { alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: termsColWidths[1], type: WidthType.DXA },
          children: [P([T(incoterms || "-")], { alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: termsColWidths[2], type: WidthType.DXA },
          children: [P([T(currency || "-")], { alignment: AlignmentType.CENTER })],
        }),
      ],
    });

    const termsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [termsHeaderRow, termsValuesRow],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        insideH: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
        insideV: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      },
      columnWidths: termsColWidths,
    });

    // --- Items table (5 columns) ---
    const colWidths = [1000, 7500, 1500, 2000, 2200];

    const itemsHeaderRow = new TableRow({
      children: [
        new TableCell({
          width: { size: colWidths[0], type: WidthType.DXA },
          children: [P([T("No.", { bold: true })], { alignment: AlignmentType.CENTER })],
          shading: { fill: "ECECEC" },
        }),
        new TableCell({
          width: { size: colWidths[1], type: WidthType.DXA },
          children: [P([T("Drawing no / Decription", { bold: true })], { alignment: AlignmentType.CENTER })],
          shading: { fill: "ECECEC" },
        }),
        new TableCell({
          width: { size: colWidths[2], type: WidthType.DXA },
          children: [P([T("Qty", { bold: true })], { alignment: AlignmentType.CENTER })],
          shading: { fill: "ECECEC" },
        }),
        new TableCell({
          width: { size: colWidths[3], type: WidthType.DXA },
          children: [P([T("Unit Price", { bold: true })], { alignment: AlignmentType.CENTER })],
          shading: { fill: "ECECEC" },
        }),
        new TableCell({
          width: { size: colWidths[4], type: WidthType.DXA },
          children: [P([T("Total Price", { bold: true })], { alignment: AlignmentType.CENTER })],
          shading: { fill: "ECECEC" },
        }),
      ],
      tableHeader: true,
    });

    let totalQty = 0;
    let totalAmount = 0;

    const itemRows = (items || []).map((it, idx) => {
      const drawingNo = S(it?.drawingNumber || it?.drawingId?.drawingNumber);
      const desc = S(it?.description || it?.tool || it?.remarks);
      const qty = Number(it?.quantity) || 0;
      const unit = Number(it?.unitPrice) || 0;
      const total = Number.isFinite(Number(it?.totalPrice)) ? Number(it.totalPrice) : unit * qty;

      totalQty += qty;
      totalAmount += total;

      return new TableRow({
        children: [
          new TableCell({
            width: { size: colWidths[0], type: WidthType.DXA },
            children: [P([T(String(idx + 1))], { alignment: AlignmentType.CENTER })],
          }),
          new TableCell({
            width: { size: colWidths[1], type: WidthType.DXA },
            children: [
              P([T(drawingNo || "-")]),   // line 1: drawing no
              P([T(desc || "")]),         // line 2: description
            ],
          }),
          new TableCell({
            width: { size: colWidths[2], type: WidthType.DXA },
            children: [P([T(String(qty))], { alignment: AlignmentType.RIGHT })],
          }),
          new TableCell({
            width: { size: colWidths[3], type: WidthType.DXA },
            children: [P([T(N(unit))], { alignment: AlignmentType.RIGHT })],
          }),
          new TableCell({
            width: { size: colWidths[4], type: WidthType.DXA },
            children: [P([T(N(total))], { alignment: AlignmentType.RIGHT })],
          }),
        ],
      });
    });

    const totalsRow = new TableRow({
      children: [
        new TableCell({ width: { size: colWidths[0], type: WidthType.DXA }, children: [P([T("Totals", { bold: true })])] }),
        new TableCell({ width: { size: colWidths[1], type: WidthType.DXA }, children: [P([T("")])] }),
        new TableCell({ width: { size: colWidths[2], type: WidthType.DXA }, children: [P([T(String(totalQty), { bold: true })], { alignment: AlignmentType.RIGHT })] }),
        new TableCell({ width: { size: colWidths[3], type: WidthType.DXA }, children: [P([T("")])] }),
        new TableCell({ width: { size: colWidths[4], type: WidthType.DXA }, children: [P([T(N(totalAmount), { bold: true })], { alignment: AlignmentType.RIGHT })] }),
      ],
    });

    const itemsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [itemsHeaderRow, ...itemRows, totalsRow],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        insideH: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
        insideV: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      },
      columnWidths: colWidths,
    });

    // Optional: status update
    await Quote.updateOne({ _id: quoteId }, { $set: { status: "quoted", isPendingQuote: false } });

    const doc = new Document({
      creator: "Quote Generator",
      title: `Quote ${S(quote.quoteNumber)}`,
      sections: [
        {
          properties: {}, children: [
            title,
            ...headerBlock,
            termsTable,
            P([]),
            itemsTable,
          ]
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="quote-${S(quote.quoteNumber)}.docx"`);
    return res.send(buffer);
  } catch (error) {
    console.error("ExportQuoteToWord Error:", error);
    return res.status(500).json({ success: false, message: "Error exporting quote to Word" });
  }
};



// ---------------- EXPORT ALL QUOTES TO EXCEL ----------------
export const exportSelectedQuotesToExcel = async (req, res) => {
  try {
    const ids = normalizeIds(req);
    if (!ids.length) {
      return res.status(400).json({ success: false, message: "Provide quoteIds or ?ids=a,b" });
    }

    // validate each id
    const validIds = [];
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: `Invalid ObjectId: ${id}` });
      }
      validIds.push(new mongoose.Types.ObjectId(id));
    }

    const quotes = await Quote.find({
      _id: { $in: validIds },
      isDeleted: false,
    })
      .populate("customerId")
      .sort({ created: -1 });

    if (!quotes.length) {
      return res.status(404).json({ success: false, message: "No quotes found for given IDs" });
    }

    // --- build excel ---
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Selected Quotes");
    ws.columns = [
      { header: "Quote Number", key: "quoteNumber", width: 20 },
      { header: "Quote Date", key: "quoteDate", width: 15 },
      { header: "Customer", key: "customer", width: 25 },
      { header: "Company", key: "company", width: 30 },
      { header: "Total Drawings", key: "totalDrawings", width: 15 },
      { header: "Total Quantity", key: "totalQuantity", width: 15 },
      { header: "Total Value", key: "totalValue", width: 15 },
      { header: "Status", key: "status", width: 15 },
    ];
    quotes.forEach(q => {
      ws.addRow({
        quoteNumber: q.quoteNumber || "",
        quoteDate: q.quoteDate ? new Date(q.quoteDate).toLocaleDateString() : "",
        customer: q.customerId?.name || q.customerName || "",
        company: q.customerId?.company || q.customerCompany || "",
        totalDrawings: q.totalDrawings || 0,
        totalQuantity: q.totalQuantity || 0,
        totalValue: q.totalQuoteValue || 0,
        status: q.status || "",
      });
    });
    ws.getRow(1).font = { bold: true };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename=selected-quotes.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("ExportQuoteToExcel Error:", err);
    res.status(500).json({ success: false, message: "Error exporting quotes", error: err.message });
  }
};

