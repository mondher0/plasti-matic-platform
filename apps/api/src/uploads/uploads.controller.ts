import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { imageUploadInterceptorOptions } from '../common/multer-image.config';

@ApiBearerAuth()
@ApiTags('uploads')
@Roles('ADMIN', 'STAFF')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly config: ConfigService) {}

  @ApiConsumes('multipart/form-data')
  @Post('image')
  @UseInterceptors(FileInterceptor('file', imageUploadInterceptorOptions))
  uploadImage(@UploadedFile() file: Express.Multer.File): { url: string } {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const baseUrl = this.config.get<string>('PUBLIC_API_URL', 'http://localhost:3001');
    return { url: `${baseUrl}/uploads/${file.filename}` };
  }
}
