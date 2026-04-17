"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQRCodeData = generateQRCodeData;
exports.verifyQRCodeData = verifyQRCodeData;
const tslib_1 = require("tslib");
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const QR_SECRET = process.env.QR_SECRET || process.env.JWT_SECRET || 'mobi-tickets-fallback-secret-123';
function generateQRCodeData(payload) {
    const data = JSON.stringify(payload);
    const signature = crypto_1.default
        .createHmac('sha256', QR_SECRET)
        .update(data)
        .digest('hex')
        .substring(0, 12);
    const qrPayload = {
        ...payload,
        sig: signature
    };
    return Buffer.from(JSON.stringify(qrPayload)).toString('base64');
}
function verifyQRCodeData(qrString) {
    try {
        const decoded = JSON.parse(Buffer.from(qrString, 'base64').toString('utf-8'));
        const { sig, ...payload } = decoded;
        const expectedSig = crypto_1.default
            .createHmac('sha256', QR_SECRET)
            .update(JSON.stringify(payload))
            .digest('hex')
            .substring(0, 12);
        if (sig !== expectedSig)
            return null;
        return payload;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=qr-code.js.map