import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SEO_DEFAULTS } from './seo.defaults';

@Injectable()
export class SeoService {
  private cache: { value: Record<string, string>; expiresAt: number } | null = null;
  private readonly cacheTtlMs = 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaults(userId?: string): Promise<void> {
    const records = SEO_DEFAULTS.map((item) => ({ ...item, updatedBy: userId }));
    await this.prisma.seoSettings.createMany({ data: records, skipDuplicates: true });
  }

  async getAll(): Promise<Record<string, string>> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.value;
    }

    await this.ensureDefaults();
    const settings = await this.prisma.seoSettings.findMany();
    const map = Object.fromEntries(settings.map((item) => [item.key, item.value]));

    this.cache = {
      value: map,
      expiresAt: Date.now() + this.cacheTtlMs,
    };

    return map;
  }

  async getByGroup(group: string): Promise<Record<string, string>> {
    await this.ensureDefaults();
    const settings = await this.prisma.seoSettings.findMany({ where: { group } });
    return Object.fromEntries(settings.map((item) => [item.key, item.value]));
  }

  async updateBulk(updates: Record<string, string>, userId: string): Promise<void> {
    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return;
    }

    await this.ensureDefaults(userId);

    await Promise.all(
      keys.map((key) => {
        const existing = SEO_DEFAULTS.find((item) => item.key === key);
        return this.prisma.seoSettings.upsert({
          where: { key },
          update: {
            value: updates[key],
            updatedBy: userId,
          },
          create: {
            key,
            value: updates[key],
            group: existing?.group ?? 'custom',
            label: existing?.label ?? key,
            updatedBy: userId,
          },
        });
      }),
    );

    await this.invalidateCache();
  }

  async reset(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.seoSettings.deleteMany({}),
      this.prisma.seoSettings.createMany({
        data: SEO_DEFAULTS.map((item) => ({
          ...item,
          updatedBy: userId,
        })),
      }),
    ]);

    await this.invalidateCache();
  }

  async invalidateCache(): Promise<void> {
    this.cache = null;
  }
}
