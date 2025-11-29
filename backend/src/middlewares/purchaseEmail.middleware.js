
import PDFDocument from 'pdfkit';
import fs from 'fs';

// PDF Generation Function
export const generatePurchaseOrderPDF = (purchaseOrder) => {
  return new Promise((resolve, reject) => {
    const pdfPath = `./temp_PO_${purchaseOrder.poNumber}_${Date.now()}.pdf`;
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('PURCHASE ORDER', { align: 'center' });
    doc.moveDown(0.5);

    // Date and PO Details
    doc.fontSize(10);
    doc.text(`Date: ${new Date(purchaseOrder.poDate).toLocaleDateString()}`, 50, 90);
    doc.text(`Currency: ${purchaseOrder.supplier.currency || 'SGD'}`, 400, 90, { align: 'right' });
    doc.text(`Buyer: ${process.env.COMPANY_NAME || 'Your Company'}`, 400, 105, { align: 'right' });
    doc.text(`PO No: ${purchaseOrder.poNumber}`, 400, 120, { align: 'right' });
    doc.moveDown();

    // Supplier Details
    doc.text('Order To:', 50, 150);
    doc.text(purchaseOrder.supplier.companyName, 50, 165);
    if (purchaseOrder.supplier.companyAddress) {
      doc.text(purchaseOrder.supplier.companyAddress, 50, 180);
    }
    if (purchaseOrder.supplier.contactPerson) {
      doc.text(`Attn: ${purchaseOrder.supplier.contactPerson}`, 50, 195);
    }
    doc.moveDown();

    // Delivery & Payment Section
    const deliveryY = 220;
    doc.text('Delivery & Payment', 50, deliveryY);
    doc.text(`Need Date: ${new Date(purchaseOrder.needDate).toLocaleDateString()}`, 50, deliveryY + 15);
    doc.text(`Incoterms: ${purchaseOrder.supplier.incoTerms || ''}`, 50, deliveryY + 30);
    doc.text(`Payment Terms: ${purchaseOrder.supplier.paymentTerms || ''}`, 300, deliveryY + 15, { align: 'right' });
    doc.text(`Reference No: ${purchaseOrder.referenceNo || ''}`, 300, deliveryY + 30, { align: 'right' });

    // Order Details Table Header
    const tableTop = deliveryY + 60;
    doc.text('Order Details', 50, tableTop - 20);
    
    // Table headers with background
    doc.fillColor('#f0f0f0').rect(50, tableTop, 500, 20).fill();
    doc.fillColor('#000000');
    
    doc.fontSize(9).text('No.', 55, tableTop + 5);
    doc.text('ID Number', 80, tableTop + 5);
    doc.text('Description', 150, tableTop + 5);
    doc.text('Manufacturer', 250, tableTop + 5);
    doc.text('Qty', 350, tableTop + 5);
    doc.text('UOM', 380, tableTop + 5);
    doc.text('Unit Price', 420, tableTop + 5);
    doc.text('Ext. Price', 480, tableTop + 5);

    // Table data
    let y = tableTop + 25;
    purchaseOrder.items.forEach((item, index) => {
      // Alternate row background
      if (index % 2 === 0) {
        doc.fillColor('#f9f9f9').rect(50, y - 5, 500, 20).fill();
        doc.fillColor('#000000');
      }

      doc.text((index + 1).toString(), 55, y);
      doc.text(item.idNumber || '', 80, y);
      doc.text(item.description || '', 150, y, { width: 90 });
      doc.text(item.manufacturer || '', 250, y, { width: 90 });
      doc.text(item.qty?.toString() || '0', 350, y);
      doc.text(typeof item.uom === 'object' ? item.uom.name : 'PCS', 380, y);
      doc.text(`$${item.unitPrice || 0}`, 420, y);
      doc.text(`$${item.extPrice || 0}`, 480, y);
      y += 20;
    });

    // Totals Section
    const totalsY = y + 20;
    doc.fillColor('#f0f0f0').rect(350, totalsY, 200, 100).fill();
    doc.fillColor('#000000');
    
    doc.text(`Sub-Total: $${purchaseOrder.totals?.subTotalAmount || 0}`, 360, totalsY + 10);
    doc.text(`Freight Cost: $${purchaseOrder.totals?.freightAmount || 0}`, 360, totalsY + 25);
    doc.text(`GST Tax (9%): $${purchaseOrder.totals?.ostTax || 0}`, 360, totalsY + 40);
    doc.text(`Grand Total: $${purchaseOrder.totals?.finalAmount || 0}`, 360, totalsY + 60, { 
      underline: true, 
      fontWeight: 'bold' 
    });

    // Ship To Address
    doc.text('Ship To Address:', 50, totalsY + 10);
    doc.text(purchaseOrder.shipToAddress || 'Not specified', 50, totalsY + 25, { width: 250 });

    // Terms and Conditions
    const termsY = totalsY + 80;
    doc.text('Terms and Conditions:', 50, termsY);
    if (purchaseOrder.termsConditions) {
      const termsLines = purchaseOrder.termsConditions.split('\n');
      let termsTextY = termsY + 15;
      termsLines.forEach(line => {
        if (line.trim()) {
          doc.text(line.trim(), 50, termsTextY, { width: 500 });
          termsTextY += 15;
        }
      });
    }

    doc.end();

    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
};