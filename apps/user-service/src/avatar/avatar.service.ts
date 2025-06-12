import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Avatar } from './entity/avatar.entity';
import { v4 as uuid } from 'uuid';
import * as mime from 'mime-types';
import { Express } from 'express';
import { IFileService } from '../providers/files/files.adapter';

@Injectable()
export class AvatarService {
  constructor(
    @InjectRepository(Avatar)
    private readonly avatarRepo: Repository<Avatar>,
    private readonly fileService: IFileService,
  ) {}

  async upload(file: Express.Multer.File, userId: number) {
    const count = await this.avatarRepo.count({
      where: { user_id: userId, deletedAt: IsNull() },
    });

    if (count >= 5) {
      throw new BadRequestException('Максимум 5 активных аватаров');
    }

    const extension = mime.extension(file.mimetype);
    const filename = `${uuid()}.${extension}`;

    await this.fileService.uploadFile({
      folder: 'avatars',
      file,
      name: filename,
    });

    const avatar = this.avatarRepo.create({
      user_id: userId,
      filename,
    });

    return this.avatarRepo.save(avatar);
  }

  async remove(avatarId: number, userId: number) {
    const avatar = await this.avatarRepo.findOne({
      where: {
        id: avatarId,
        user_id: userId,
        deletedAt: IsNull(),
      },
    });

    if (!avatar) {
      throw new NotFoundException('Аватар не найден или уже удалён');
    }

    await this.avatarRepo.softDelete(avatar.id);
  }
}
