import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { map, Observable } from 'rxjs';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationsService } from './notifications.service';

type AuthReq = { user: { userId: string } };

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@Req() req: AuthReq, @Query() query: ListNotificationsDto) {
    return this.notificationsService.listByUser(req.user.userId, query.page, query.limit);
  }

  @Get('unread-count')
  unreadCount(@Req() req: AuthReq) {
    return this.notificationsService.unreadCount(req.user.userId);
  }

  @Patch(':id/read')
  markRead(@Req() req: AuthReq, @Param('id') id: string) {
    return this.notificationsService.markRead(req.user.userId, id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: AuthReq) {
    return this.notificationsService.markAllRead(req.user.userId);
  }

  @Delete(':id')
  remove(@Req() req: AuthReq, @Param('id') id: string) {
    return this.notificationsService.remove(req.user.userId, id);
  }

  @Sse('stream')
  stream(@Req() req: AuthReq): Observable<MessageEvent> {
    return this.notificationsService
      .subscribe(req.user.userId)
      .pipe(map((notification) => ({ data: notification })));
  }

  @Post('test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  createTest(
    @Body()
    body: {
      userId: string;
      title: string;
      body: string;
      type?: NotificationType;
      actionUrl?: string;
    },
  ) {
    return this.notificationsService.send({
      userId: body.userId,
      title: body.title,
      body: body.body,
      type: body.type,
      actionUrl: body.actionUrl,
    });
  }
}
