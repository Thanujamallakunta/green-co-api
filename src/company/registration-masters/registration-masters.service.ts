import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Industry, IndustryDocument } from '../schemas/industry.schema';
import { Entity, EntityDocument } from '../schemas/entity.schema';
import { Sector, SectorDocument } from '../schemas/sector.schema';
import { State, StateDocument } from '../schemas/state.schema';
import { Facilitator, FacilitatorDocument } from '../schemas/facilitator.schema';

@Injectable()
export class RegistrationMastersService {
  constructor(
    @InjectModel(Industry.name)
    private readonly industryModel: Model<IndustryDocument>,
    @InjectModel(Entity.name)
    private readonly entityModel: Model<EntityDocument>,
    @InjectModel(Sector.name)
    private readonly sectorModel: Model<SectorDocument>,
    @InjectModel(State.name)
    private readonly stateModel: Model<StateDocument>,
    @InjectModel(Facilitator.name)
    private readonly facilitatorModel: Model<FacilitatorDocument>,
  ) {}

  async getRegistrationMasters(): Promise<{
    status: 'success';
    message: string;
    data: {
      industries: Array<{ id: string; name: string }>;
      entities: Array<{ id: string; name: string }>;
      sectors: Array<{ id: string; name: string }>;
      states: Array<{ id: string; name: string; code?: string }>;
      facilitators: Array<{ id: string; name: string }>;
    };
  }> {
    try {
      const [industries, entities, sectors, states, facilitators] =
        await Promise.all([
          this.industryModel
            .find({ status: 1 })
            .sort({ name: 1 })
            .select('_id name'),
          this.entityModel
            .find({ status: 1 })
            .sort({ name: 1 })
            .select('_id name'),
          this.sectorModel
            .find({})
            .sort({ name: 1 })
            .select('_id name'),
          this.stateModel
            .find({ status: 1 })
            .sort({ name: 1 })
            .select('_id name code'),
          this.facilitatorModel
            .find({ status: '1' })
            .sort({ name: 1 })
            .select('_id name'),
        ]);

      return {
        status: 'success',
        message: 'Registration masters loaded successfully',
        data: {
          industries: industries.map((i) => ({
            id: i._id.toString(),
            name: i.name,
          })),
          entities: entities.map((e) => ({
            id: e._id.toString(),
            name: e.name,
          })),
          sectors: sectors.map((s) => ({
            id: s._id.toString(),
            name: s.name,
          })),
          states: states.map((s) => ({
            id: s._id.toString(),
            name: s.name,
            code: s.code,
          })),
          facilitators: facilitators.map((f) => ({
            id: f._id.toString(),
            name: f.name,
          })),
        },
      };
    } catch (error) {
      console.error('Error loading registration masters:', error);
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to load registration masters',
      });
    }
  }
}


