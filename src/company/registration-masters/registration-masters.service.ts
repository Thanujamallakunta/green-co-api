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
      sectors: Array<{ id: string; name: string; group_name?: string }>;
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
          // Sectors: no status field, return all (include group_name for GROUP / SECTOR UI)
          this.sectorModel
            .find({})
            .sort({ group_name: 1, name: 1 })
            .select('_id name group_name')
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
            group_name: s.group_name || '',
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

  /**
   * Get distinct groups and all sectors (for Primary Data / checklist page: GROUP and SECTOR dropdowns).
   */
  async getGroupsAndSectors(): Promise<{
    status: 'success';
    message: string;
    data: { groups: string[]; sectors: Array<{ id: string; name: string; group_name: string }> };
  }> {
    const sectors = await this.sectorModel
      .find({})
      .sort({ group_name: 1, name: 1 })
      .select('_id name group_name')
      .lean();
    const sectorList = (sectors as any[]).map((s) => ({
      id: s._id.toString(),
      name: s.name,
      group_name: s.group_name || '',
    }));
    const groups = [...new Set(sectorList.map((s) => s.group_name).filter(Boolean))].sort();
    return {
      status: 'success',
      message: 'Groups and sectors',
      data: { groups, sectors: sectorList },
    };
  }

  /**
   * Get assessment submittal category tabs (GSC, IE, PSL, MS, EM, CBM, WTM, MRM, GBE).
   * Frontend uses this to render tabs and filter assessment_submittals by description/criterion.
   */
  async getAssessmentCategories(): Promise<{
    status: 'success';
    message: string;
    data: { categories: Array<{ code: string; label: string; order: number }> };
  }> {
    const categories = [
      { code: 'GSC', label: 'Green Supply Chain', order: 1 },
      { code: 'IE', label: 'Industrial Ecology', order: 2 },
      { code: 'PSL', label: 'Product Stewardship / Life Cycle', order: 3 },
      { code: 'MS', label: 'Material Stewardship', order: 4 },
      { code: 'EM', label: 'Energy Management', order: 5 },
      { code: 'CBM', label: 'Circular Business Model', order: 6 },
      { code: 'WTM', label: 'Water & Wastewater Management', order: 7 },
      { code: 'MRM', label: 'Material Resource Management', order: 8 },
      { code: 'GBE', label: 'Green Building / Infrastructure', order: 9 },
    ];
    return {
      status: 'success',
      message: 'Assessment submittal categories',
      data: { categories },
    };
  }
}


