import { Injectable } from '@nestjs/common';
import { Notification, NotificationType, Prisma, UserRole } from '@prisma/client';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

type SendNotificationInput = {
  userId: string;
  type?: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  private readonly streams = new Map<string, Subject<Notification>>();

  constructor(private readonly prisma: PrismaService) {}

  async send(input: SendNotificationInput): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type ?? NotificationType.INFO,
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
        metadata: input.metadata,
      },
    });

    this.streams.get(input.userId)?.next(notification);
    return notification;
  }

  async sendBulk(params: {
    userIds: string[];
    type?: NotificationType;
    title: string;
    body: string;
    actionUrl?: string;
  }): Promise<void> {
    if (params.userIds.length === 0) {
      return;
    }

    await this.prisma.notification.createMany({
      data: params.userIds.map((userId) => ({
        userId,
        type: params.type ?? NotificationType.INFO,
        title: params.title,
        body: params.body,
        actionUrl: params.actionUrl,
      })),
    });
  }

  async sendToRole(params: {
    role: UserRole;
    type?: NotificationType;
    title: string;
    body: string;
  }): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { role: params.role },
      select: { id: true },
    });

    await this.sendBulk({
      userIds: users.map((user) => user.id),
      type: params.type,
      title: params.title,
      body: params.body,
    });
  }

  async listByUser(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    items: Notification[];
    meta: { total: number; unread: number; page: number; limit: number };
  }> {
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      items,
      meta: { total, unread, page, limit },
    };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async remove(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.deleteMany({ where: { id: notificationId, userId } });
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  subscribe(userId: string): Observable<Notification> {
    const subject = this.streams.get(userId) ?? new Subject<Notification>();
    this.streams.set(userId, subject);
    return subject.asObservable();
  }
}
