import { Controller, Get } from '@nestjs/common';
import { RegistrationMastersService } from './registration-masters.service';

@Controller('api/company')
export class RegistrationMastersController {
  constructor(
    private readonly registrationMastersService: RegistrationMastersService,
  ) {}

  // GET /api/company/register-info
  @Get('register-info')
  async getRegisterInfo() {
    return this.registrationMastersService.getRegistrationMasters();
  }
}


