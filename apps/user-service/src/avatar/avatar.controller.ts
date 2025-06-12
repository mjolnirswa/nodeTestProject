import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AvatarService } from './avatar.service';
import { ValidateImagePipe } from './pipe/ValidateImage.pipe';
import { Express } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CurrentUser } from '../user/decorator/current-user.decorator';
import { User } from '../user/entity/user.entity';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@ApiTags('Avatars')
@ApiBearerAuth()
@Controller('avatars')
@UseGuards(JwtAuthGuard)
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Загрузить аватар' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Аватар загружен' })
  @ApiResponse({ status: 400, description: 'Ошибка валидации файла' })
  async upload(
    @UploadedFile(ValidateImagePipe) file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.avatarService.upload(file, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить аватар' })
  @ApiParam({ name: 'id', description: 'ID аватара' })
  @ApiResponse({ status: 200, description: 'Аватар удалён' })
  @ApiResponse({ status: 404, description: 'Аватар не найден' })
  async remove(@Param('id') id: number, @CurrentUser() user: User) {
    return this.avatarService.remove(id, user.id);
  }
}
