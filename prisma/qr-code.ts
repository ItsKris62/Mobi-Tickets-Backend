import crypto from 'crypto'

// Use a dedicated secret, falling back for development
const QR_SECRET = process.env.QR_SECRET || process.env.JWT_SECRET || 'mobi-tickets-fallback-secret-123'

export interface QRPayload {
  ticketId: string
  ticketNumber: string
  eventId: string
  userId: string
  ticketType: string
  timestamp: number
}

/**
 * Generate a signed QR code payload.
 * The signature prevents attendees from forging or modifying ticket QR codes.
 */
export function generateQRCodeData(payload: QRPayload): string {
  const data = JSON.stringify(payload)
  const signature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(data)
    .digest('hex')
    .substring(0, 12) // Short signature ensures the QR code doesn't become too dense
  
  const qrPayload = {
    ...payload,
    sig: signature
  }
  return Buffer.from(JSON.stringify(qrPayload)).toString('base64')
}

/**
 * Verify and decode a scanned QR code.
 * Returns the payload if valid, null if tampered.
 */
export function verifyQRCodeData(qrString: string): QRPayload | null {
  try {
    const decoded = JSON.parse(Buffer.from(qrString, 'base64').toString('utf-8'))
    const { sig, ...payload } = decoded
    
    const expectedSig = crypto
      .createHmac('sha256', QR_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex')
      .substring(0, 12)
    
    if (sig !== expectedSig) return null // Signature mismatch - Tampered
    return payload as QRPayload
  } catch {
    return null
  }
}