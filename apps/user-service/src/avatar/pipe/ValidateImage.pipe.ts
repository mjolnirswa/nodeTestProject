import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { Express } from 'express';

@Injectable()
export class ValidateImagePipe implements PipeTransform {
  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не передан');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Размер файла превышает 10 МБ');
    }

    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.mimetype)) {
      throw new BadRequestException('Разрешены только изображения jpeg и png');
    }

    return file;
  }
}
