import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export interface InvoiceItem {
  productTitle: string;
  variantTitle?: string;
  quantity: number;
  unitPricePkr: number;
  totalPricePkr: number;
}

export interface InvoiceData {
  orderNumber: string;
  createdAt: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  paymentMethod: string;
  items: InvoiceItem[];
  subtotalPkr: number;
  shippingFeePkr: number;
  codFeePkr: number;
  discountPkr: number;
  totalPkr: number;
  storeName?: string;
}

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

export function generateInvoicePdf(data: InvoiceData): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  doc.pipe(stream);

  // Header
  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .fillColor("#F59E0B")
    .text("WAW", { align: "left" });

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#6B7280")
    .text("Marketplace Receipt", { align: "left" });

  doc.moveDown(0.5);

  // Order info box
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#374151")
    .text("Order Details", 50, doc.y, { underline: true });

  doc.moveDown(0.3);

  const infoY = doc.y;
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#374151");

  doc.text(`Order #: ${data.orderNumber}`, 50, infoY);
  doc.text(`Date: ${new Date(data.createdAt).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}`, 50, infoY + 14);
  doc.text(`Payment: ${data.paymentMethod}`, 50, infoY + 28);

  doc.text(`Bill To: ${data.buyerName}`, 320, infoY);
  doc.text(`Phone: ${data.buyerPhone}`, 320, infoY + 14);
  doc.text(`City: ${data.shippingCity}, ${data.shippingProvince}`, 320, infoY + 28);

  doc.y = infoY + 50;

  // Divider
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#E5E7EB")
    .lineWidth(1)
    .stroke();

  doc.moveDown(0.5);

  // Items header
  const tableTop = doc.y;
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#374151");

  doc.text("Item", 50, tableTop, { width: 250 });
  doc.text("Qty", 310, tableTop, { width: 40, align: "center" });
  doc.text("Unit Price", 360, tableTop, { width: 80, align: "right" });
  doc.text("Total", 460, tableTop, { width: 85, align: "right" });

  doc.y = tableTop + 18;

  // Divider under header
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#D1D5DB")
    .lineWidth(0.5)
    .stroke();

  doc.moveDown(0.3);

  // Items
  doc.font("Helvetica").fontSize(9).fillColor("#1F2937");

  for (const item of data.items) {
    const rowY = doc.y;
    const itemName = item.variantTitle
      ? `${item.productTitle} (${item.variantTitle})`
      : item.productTitle;

    doc.text(itemName, 50, rowY, { width: 250 });
    doc.text(String(item.quantity), 310, rowY, { width: 40, align: "center" });
    doc.text(formatPKR(item.unitPricePkr), 360, rowY, { width: 80, align: "right" });
    doc.text(formatPKR(item.totalPricePkr), 460, rowY, { width: 85, align: "right" });

    doc.y = rowY + 16;

    // Light row divider
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#F3F4F6")
      .lineWidth(0.3)
      .stroke();

    doc.y += 4;
  }

  doc.moveDown(0.5);

  // Totals
  const totalsX = 380;
  const totalsLabelX = 380;
  const totalsValueX = 545;

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#374151");

  doc.text("Subtotal:", totalsLabelX, doc.y, { width: 100, align: "left" });
  doc.text(formatPKR(data.subtotalPkr), 460, doc.y - 12, { width: 85, align: "right" });

  doc.text("Shipping:", totalsLabelX, doc.y + 4, { width: 100, align: "left" });
  doc.text(formatPKR(data.shippingFeePkr), 460, doc.y - 8, { width: 85, align: "right" });

  doc.text("COD Fee:", totalsLabelX, doc.y + 4, { width: 100, align: "left" });
  doc.text(formatPKR(data.codFeePkr), 460, doc.y - 8, { width: 85, align: "right" });

  if (data.discountPkr > 0) {
    doc.text("Discount:", totalsLabelX, doc.y + 4, { width: 100, align: "left" });
    doc.text(`-${formatPKR(data.discountPkr)}`, 460, doc.y - 8, { width: 85, align: "right" });
  }

  doc.moveDown(0.5);

  // Total line
  doc
    .moveTo(totalsLabelX, doc.y)
    .lineTo(totalsValueX, doc.y)
    .strokeColor("#374151")
    .lineWidth(1)
    .stroke();

  doc.moveDown(0.3);

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#1F2937");

  doc.text("Total:", totalsLabelX, doc.y, { width: 100, align: "left" });
  doc.text(formatPKR(data.totalPkr), 460, doc.y - 14, { width: 85, align: "right" });

  doc.moveDown(2);

  // Divider
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#E5E7EB")
    .lineWidth(1)
    .stroke();

  doc.moveDown(0.5);

  // Shipping address
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#374151")
    .text("Shipping Address", 50, doc.y);

  doc.moveDown(0.3);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#4B5563")
    .text(data.buyerName, 50, doc.y)
    .text(data.shippingAddress, 50)
    .text(`${data.shippingCity}, ${data.shippingProvince}`, 50)
    .text(`Phone: ${data.buyerPhone}`, 50);

  doc.moveDown(2);

  // Footer
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#9CA3AF")
    .text("This is a computer-generated receipt from Waw Marketplace.", 50, doc.y, { align: "center" })
    .text("For support, contact us at support@waw.pk or WhatsApp +92 300 1234567", { align: "center" });

  doc.end();

  return stream;
}
