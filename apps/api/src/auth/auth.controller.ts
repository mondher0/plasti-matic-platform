import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { AuthResponse, AuthUser } from '@plastimatic/shared';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { imageUploadInterceptorOptions } from '../common/multer-image.config';
import type { AuthenticatedUser } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthUser {
    return user;
  }

  // No @Roles on any of the routes below — self-service, scoped to the
  // caller's own id via @CurrentUser(), open to every authenticated role
  // (staff in the dashboard and customers in the shop alike).

  @ApiBearerAuth()
  @Patch('me')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto): Promise<AuthUser> {
    return this.authService.updateProfile(user.id, dto);
  }

  @ApiBearerAuth()
  @Patch('me/password')
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto): Promise<AuthUser> {
    return this.authService.changePassword(user.id, dto);
  }

  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', imageUploadInterceptorOptions))
  uploadAvatar(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: Express.Multer.File): Promise<AuthUser> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const baseUrl = this.config.get<string>('PUBLIC_API_URL', 'http://localhost:3001');
    return this.authService.updateAvatar(user.id, `${baseUrl}/uploads/${file.filename}`);
  }
}
