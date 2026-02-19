import { Controller, Get } from '@nestjs/common';
import { FacilitatorsService } from './facilitators.service';

@Controller('api/company')
export class FacilitatorsController {
  constructor(private readonly facilitatorsService: FacilitatorsService) {}

  @Get('facilitators')
  async getFacilitators() {
    return this.facilitatorsService.getFacilitators();
  }
}

