import { BaseRepository } from '../../shared/database/baseRepository.js';

export class PaymentRepository extends BaseRepository {
  constructor() {
    super('payments');
  }
}

export const paymentRepository = new PaymentRepository();