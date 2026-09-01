import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserQueryDto } from './dto/user-query.dto';

@ApiBearerAuth()
@ApiTags('users')
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }

  @Post(':id/block')
  block(@Param('id') id: string, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.usersService.block(id, actingUser.id);
  }

  @Post(':id/unblock')
  unblock(@Param('id') id: string) {
    return this.usersService.unblock(id);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':id/delete')
  remove(@Param('id') id: string, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.usersService.remove(id, actingUser.id);
  }
}
