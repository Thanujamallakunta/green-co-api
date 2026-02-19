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
      console.log('[RegistrationMasters] Fetching master data...');
      // Fetch all data - try with status filter first, fallback to all if empty
      const [industriesFiltered, entitiesFiltered, sectors, statesFiltered, facilitatorsFiltered] =
        await Promise.all([
          // Industries: try status = 1 or "1" or missing
          this.industryModel
            .find({
              $or: [
                { status: 1 },
                { status: '1' },
                { status: { $exists: false } },
              ],
            })
            .sort({ name: 1 })
            .select('_id name')
            .lean(),
          // Entities: same as industries
          this.entityModel
            .find({
              $or: [
                { status: 1 },
                { status: '1' },
                { status: { $exists: false } },
              ],
            })
            .sort({ name: 1 })
            .select('_id name')
            .lean(),
          // Sectors: no status field, return all
          this.sectorModel
            .find({})
            .sort({ name: 1 })
            .select('_id name')
            .lean(),
          // States: same as industries/entities
          this.stateModel
            .find({
              $or: [
                { status: 1 },
                { status: '1' },
                { status: { $exists: false } },
              ],
            })
            .sort({ name: 1 })
            .select('_id name code')
            .lean(),
          // Facilitators: status = "1" or 1 or missing
          this.facilitatorModel
            .find({
              $or: [
                { status: '1' },
                { status: 1 },
                { status: { $exists: false } },
              ],
            })
            .sort({ name: 1 })
            .select('_id name')
            .lean(),
        ]);

      // If filtered results are empty, try fetching all records (fallback)
      const industries = industriesFiltered.length > 0
        ? industriesFiltered
        : await this.industryModel.find({}).sort({ name: 1 }).select('_id name').lean();
      
      const entities = entitiesFiltered.length > 0
        ? entitiesFiltered
        : await this.entityModel.find({}).sort({ name: 1 }).select('_id name').lean();
      
      const states = statesFiltered.length > 0
        ? statesFiltered
        : await this.stateModel.find({}).sort({ name: 1 }).select('_id name code').lean();
      
      const facilitators = facilitatorsFiltered.length > 0
        ? facilitatorsFiltered
        : await this.facilitatorModel.find({}).sort({ name: 1 }).select('_id name').lean();

      console.log('[RegistrationMasters] Results:', {
        industries: industries.length,
        entities: entities.length,
        sectors: sectors.length,
        states: states.length,
        facilitators: facilitators.length,
      });

      return {
        status: 'success',
        message: 'Registration masters loaded successfully',
        data: {
          industries: industries.map((i: any) => ({
            id: i._id.toString(),
            name: i.name,
          })),
          entities: entities.map((e: any) => ({
            id: e._id.toString(),
            name: e.name,
          })),
          sectors: sectors.map((s: any) => ({
            id: s._id.toString(),
            name: s.name,
          })),
          states: states.map((s: any) => ({
            id: s._id.toString(),
            name: s.name,
            code: s.code || undefined,
          })),
          facilitators: facilitators.map((f: any) => ({
            id: f._id.toString(),
            name: f.name,
          })),
        },
      };
    } catch (error) {
      console.error('Error loading registration masters:', error);
      // Return empty arrays instead of throwing error, so frontend can still render
      return {
        status: 'success',
        message: 'Registration masters loaded (some collections may be empty)',
        data: {
          industries: [],
          entities: [],
          sectors: [],
          states: [],
          facilitators: [],
        },
      };
    }
  }
}


