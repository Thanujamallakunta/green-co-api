import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NotificationLog,
  NotificationLogDocument,
  NotifyType,
} from '../schemas/notification-log.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(NotificationLog.name)
    private readonly notificationModel: Model<NotificationLogDocument>,
  ) {}

  /**
   * Create an in-app notification (matches Laravel __notification_log).
   */
  async create(
    title: string,
    content: string,
    notifyType: NotifyType,
    userId?: string | Types.ObjectId | null,
  ): Promise<NotificationLogDocument> {
    const doc = await this.notificationModel.create({
      title,
      content,
      notify_type: notifyType,
      user_id: userId == null ? undefined : (typeof userId === 'string' ? new Types.ObjectId(userId) : userId),
      seen: false,
    });
    return doc;
  }

  /**
   * Get notifications for a user by module (matches Laravel __get_notifications).
   */
  async getForUser(
    notifyType: NotifyType,
    userId: string,
    options?: { limit?: number; skip?: number },
  ): Promise<{ notifications: any[]; notificationsCount: number }> {
    const limit = options?.limit ?? 50;
    const skip = options?.skip ?? 0;
    const uid = new Types.ObjectId(userId);
    const filter = { notify_type: notifyType, user_id: uid };

    const [notifications, notificationsCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(filter),
    ]);

    const unreadCount = await this.notificationModel.countDocuments({
      ...filter,
      seen: false,
    });

    return {
      notifications: notifications.map((n: any) => ({
        id: n._id.toString(),
        title: n.title,
        content: n.content,
        notify_type: n.notify_type,
        seen: n.seen,
        created_at: n.createdAt,
      })),
      notificationsCount: unreadCount,
    };
  }

  /**
   * Mark one or all notifications as seen.
   */
  async markSeen(
    notifyType: NotifyType,
    userId: string,
    notificationId?: string,
  ): Promise<void> {
    const filter: any = { notify_type: notifyType, user_id: new Types.ObjectId(userId) };
    if (notificationId) {
      filter._id = new Types.ObjectId(notificationId);
    }
    await this.notificationModel.updateMany(filter, { $set: { seen: true } });
  }
}
