import { Controller, Get } from '@nestjs/common';
import { RegistrationMastersService } from './registration-masters.service';

@Controller('api/company')
export class RegistrationMastersController {
  constructor(
    private readonly registrationMastersService: RegistrationMastersService,
  ) {}

  // GET /api/company/register-info
  // Public endpoint - no auth required for master data
  @Get('register-info')
  async getRegisterInfo() {
    console.log('[RegistrationMastersController] GET /api/company/register-info called');
    const result = await this.registrationMastersService.getRegistrationMasters();
    console.log('[RegistrationMastersController] Returning data:', {
      industries: result.data.industries.length,
      entities: result.data.entities.length,
      sectors: result.data.sectors.length,
      states: result.data.states.length,
      facilitators: result.data.facilitators.length,
    });
    return result;
  }
}


