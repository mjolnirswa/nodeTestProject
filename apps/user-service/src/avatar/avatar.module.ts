import { Module } from '@nestjs/common';
import { AvatarController } from './avatar.controller';
import { AvatarService } from './avatar.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Avatar } from './entity/avatar.entity';
import { ValidateImagePipe } from './pipe/ValidateImage.pipe';
import { FilesModule } from '../providers/files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([Avatar]), FilesModule],
  controllers: [AvatarController],
  providers: [AvatarService, ValidateImagePipe],
})
export class AvatarModule {}
