export interface QRPayload {
    ticketId: string;
    ticketNumber: string;
    eventId: string;
    userId: string;
    ticketType: string;
    timestamp: number;
}
export declare function generateQRCodeData(payload: QRPayload): string;
export declare function verifyQRCodeData(qrString: string): QRPayload | null;
//# sourceMappingURL=qr-code.d.ts.map