import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTrialDto } from './dto/create-trial.dto';
import { FeedbackTrialDto } from './dto/feedback-trial.dto';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

const ADJECTIVES = ['habil', 'brilhante', 'justo', 'fiel', 'douto', 'nobre', 'sabio', 'agil', 'forte', 'leal'];
const NOUNS = ['jurista', 'advogado', 'doutor', 'consul', 'legis', 'iuris', 'toga', 'forum', 'codex', 'pactum'];

@Injectable()
export class TrialService {
  private readonly logger = new Logger(TrialService.name);

  constructor(private readonly prisma: PrismaService) {}

  private generateUsername(): string {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const digits = Math.floor(100 + Math.random() * 900).toString();
    return `${adjective}${noun}${digits}`;
  }

  private generatePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }

  async create(dto: CreateTrialDto) {
    const username = this.generateUsername();
    const rawPassword = this.generatePassword();
    const email = `${username}@trial.legalai.com.br`;
    const passwordHash = await argon2.hash(rawPassword);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create a User in the main users table so the trial user can log in
    const systemUser = await this.prisma.user.create({
      data: {
        name: `${dto.prefix} ${dto.name}`,
        email,
        passwordHash,
        role: 'USER',
      },
    });

    const trialUser = await this.prisma.trialUser.create({
      data: {
        prefix: dto.prefix,
        name: dto.name,
        username,
        email,
        passwordHash,
        expiresAt,
        systemUserId: systemUser.id,
      },
    });

    this.logger.log(`Trial user created: ${username} (expires: ${expiresAt.toISOString()})`);

    return {
      id: trialUser.id,
      prefix: trialUser.prefix,
      name: trialUser.name,
      username: trialUser.username,
      email: trialUser.email,
      password: rawPassword,
      expiresAt: trialUser.expiresAt,
      onboardingStep: trialUser.onboardingStep,
      loginUrl: process.env.APP_URL ?? 'https://legal.lasolutions.me',
    };
  }

  async findById(id: string) {
    const trialUser = await this.prisma.trialUser.findUnique({ where: { id } });
    if (!trialUser) throw new NotFoundException(`Trial user ${id} not found`);

    const now = Date.now();
    const isExpired = trialUser.expiresAt.getTime() < now;
    const timeRemainingMs = Math.max(0, trialUser.expiresAt.getTime() - now);

    return {
      id: trialUser.id,
      prefix: trialUser.prefix,
      name: trialUser.name,
      username: trialUser.username,
      email: trialUser.email,
      expiresAt: trialUser.expiresAt,
      onboardingStep: trialUser.onboardingStep,
      feedbackGiven: trialUser.feedbackGiven,
      feedback: trialUser.feedback,
      isExpired,
      timeRemainingMs,
    };
  }

  async submitFeedback(id: string, dto: FeedbackTrialDto) {
    const trialUser = await this.prisma.trialUser.findUnique({ where: { id } });
    if (!trialUser) throw new NotFoundException(`Trial user ${id} not found`);

    const updated = await this.prisma.trialUser.update({
      where: { id },
      data: {
        feedback: dto.feedback,
        feedbackGiven: true,
      },
    });

    this.logger.log(`Trial user ${id} submitted feedback: ${dto.feedback}`);

    return {
      id: updated.id,
      feedback: updated.feedback,
      feedbackGiven: updated.feedbackGiven,
    };
  }

  async trackMetric(
    trialUserId: string,
    event: string,
    data: {
      page?: string;
      element?: string;
      ipAddress?: string;
      city?: string;
      userAgent?: string;
      metadata?: any;
    },
  ) {
    const metric = await this.prisma.trialMetric.create({
      data: {
        trialUserId,
        event,
        page: data.page,
        element: data.element,
        ipAddress: data.ipAddress,
        city: data.city,
        userAgent: data.userAgent,
        metadata: data.metadata ?? {},
      },
    });

    return metric;
  }

  async extendTrial(id: string, hours = 24) {
    const trialUser = await this.prisma.trialUser.findUnique({ where: { id } });
    if (!trialUser) throw new NotFoundException(`Trial user ${id} not found`);

    const base = trialUser.expiresAt < new Date() ? new Date() : trialUser.expiresAt;
    const newExpiresAt = new Date(base.getTime() + hours * 60 * 60 * 1000);

    const updated = await this.prisma.trialUser.update({
      where: { id },
      data: { expiresAt: newExpiresAt },
    });

    this.logger.log(`Trial extended: ${id} → ${newExpiresAt.toISOString()} (+${hours}h)`);
    return { id: updated.id, expiresAt: updated.expiresAt };
  }

  async convertTrial(id: string, newEmail: string) {
    const trialUser = await this.prisma.trialUser.findUnique({ where: { id } });
    if (!trialUser) throw new NotFoundException(`Trial user ${id} not found`);
    if (!trialUser.systemUserId) throw new NotFoundException('Trial user has no linked system user');

    const updated = await this.prisma.user.update({
      where: { id: trialUser.systemUserId },
      data: {
        email: newEmail.toLowerCase().trim(),
        plan: 'basic',
      },
      select: { id: true, email: true, plan: true },
    });

    this.logger.log(`Trial converted: ${id} → ${updated.email} (plan: basic)`);
    return { userId: updated.id, email: updated.email, plan: updated.plan };
  }

  async getAdminMetrics() {
    const [total, allUsers] = await Promise.all([
      this.prisma.trialUser.count(),
      this.prisma.trialUser.findMany({
        include: {
          metrics: {
            select: { event: true, city: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const now = new Date();
    let active = 0;
    let expired = 0;
    let feedbackYes = 0;
    let feedbackNo = 0;

    const users = allUsers.map((u) => {
      const isExpired = u.expiresAt < now;
      if (isExpired) expired++;
      else active++;

      if (u.feedback === 'YES') feedbackYes++;
      else if (u.feedback === 'NO') feedbackNo++;

      const accessCount = u.metrics.filter((m) => m.event === 'page_view').length;
      const clickCount = u.metrics.filter((m) => m.event === 'click').length;
      const lastSeen =
        u.metrics.length > 0
          ? u.metrics.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt
          : null;
      const city = u.metrics.find((m) => m.city)?.city ?? null;

      return {
        id: u.id,
        prefix: u.prefix,
        name: u.name,
        username: u.username,
        email: u.email,
        expiresAt: u.expiresAt,
        isExpired,
        feedbackGiven: u.feedbackGiven,
        feedback: u.feedback,
        createdAt: u.createdAt,
        accessCount,
        clickCount,
        lastSeen,
        city,
      };
    });

    return {
      total,
      active,
      expired,
      feedbackYes,
      feedbackNo,
      users,
    };
  }
}
