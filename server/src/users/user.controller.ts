import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UserDto } from './dto/user.dto';
import { UserService } from './user.service';
import { GetCurrentUserId } from '../auth/decorators/get-current-user-id.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/profile')
  getProfile(@GetCurrentUserId() userId: string) {
    return this.userService.findById(userId);
  }

  @Patch('/update')
  updateUserData(
    @GetCurrentUserId() userId: string,
    @Body() userData: UserDto,
  ) {
    return this.userService.updateUserData(userData, userId);
  }
}
