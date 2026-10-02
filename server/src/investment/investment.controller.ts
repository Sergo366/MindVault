import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { InvestmentService } from './investment.service';
import { GetCurrentUserId } from '../auth/decorators/get-current-user-id.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IBKRCsvValidator } from './validators/ibkr-csv.validator';
import { PositionDto } from './dtos/position.dto';

@Controller('investment')
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) {}

  @Post('upload-statements')
  @UseInterceptors(FilesInterceptor('files'))
  uploadStatements(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new IBKRCsvValidator(),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
    @GetCurrentUserId() userId: string,
  ) {
    return this.investmentService.uploadStatementFiles(files, userId);
  }

  @Get('positions')
  getPositions(
    @GetCurrentUserId() userId: string,
  ): Promise<PositionDto[]> {
    return this.investmentService.getUserPositions(userId);
  }
}
