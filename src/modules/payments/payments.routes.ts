import { FastifyInstance } from 'fastify';
import { initiatePaymentSchema } from './payments.schema';
import {
  initiatePayment,
  handleMpesaCallback,
  getPaymentStatus,
} from './payments.service';

export default async (fastify: FastifyInstance) => {
  // Initiate payment
  fastify.post(
    '/initiate',
    { schema: initiatePaymentSchema, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { orderId, method, phoneNumber } = request.body as {
          orderId: string;
          method: 'MPESA' | 'CARD' | 'CRYPTO';
          phoneNumber?: string;
        };
        const result = await initiatePayment(orderId, request.user!.id, method, phoneNumber);
        reply.status(201).send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );

  // M-Pesa callback (public webhook — no auth)
  fastify.post(
    '/callback/mpesa',
    async (request, reply) => {
      try {
        const body = request.body as {
          Body: {
            stkCallback: {
              MerchantRequestID: string;
              CheckoutRequestID: string;
              ResultCode: number;
              ResultDesc: string;
              CallbackMetadata?: {
                Item: Array<{ Name: string; Value?: string | number }>;
              };
            };
          };
        };
        const result = await handleMpesaCallback(body.Body.stkCallback);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error({ err: errorMessage }, 'M-Pesa callback error');
        reply.status(200).send({ message: 'Callback received' }); // Always return 200 to M-Pesa
      }
    }
  );

  // Get payment status
  fastify.get(
    '/status/:transactionId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { transactionId } = request.params as { transactionId: string };
        const result = await getPaymentStatus(transactionId, request.user!.id);
        reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                          errorMessage.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({ error: errorMessage });
      }
    }
  );
};
