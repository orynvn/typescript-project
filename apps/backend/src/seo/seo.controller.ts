import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateSeoSettingsDto } from './dto/update-seo-settings.dto';
import { SeoService } from './seo.service';

type AuthReq = { user: { userId: string } };

@Controller('seo/settings')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get()
  getAll() {
    return this.seoService.getAll();
  }

  @Get(':group')
  getByGroup(@Param('group') group: string) {
    return this.seoService.getByGroup(group);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch()
  updateBulk(@Body() dto: UpdateSeoSettingsDto, @Req() req: AuthReq) {
    return this.seoService.updateBulk(dto.updates, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('reset')
  reset(@Req() req: AuthReq) {
    return this.seoService.reset(req.user.userId);
  }
}
