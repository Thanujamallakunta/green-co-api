import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Facilitator, FacilitatorDocument } from '../schemas/facilitator.schema';

@Injectable()
export class FacilitatorsService {
  constructor(
    @InjectModel(Facilitator.name)
    private readonly facilitatorModel: Model<FacilitatorDocument>,
  ) {}

  async getFacilitators(): Promise<{
    status: 'success';
    message: string;
    data: Array<{ id: string; name: string }>;
  }> {
    try {
      // Get all active facilitators (status = '1')
      const facilitators = await this.facilitatorModel
        .find({ status: '1' })
        .select('_id name')
        .sort({ name: 1 });

      // Format response to match frontend expectations
      const data = facilitators.map((facilitator) => ({
        id: facilitator._id.toString(),
        name: facilitator.name,
      }));

      return {
        status: 'success',
        message: 'Facilitators loaded successfully',
        data,
      };
    } catch (error) {
      console.error('Error fetching facilitators:', error);
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to load facilitators',
      });
    }
  }
}

