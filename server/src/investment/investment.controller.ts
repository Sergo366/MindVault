import {
  Controller,
  Get,
  Post,
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { InvestmentService } from './investment.service';
import { GetCurrentUserId } from '../auth/decorators/get-current-user-id.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IBKRCsvValidator } from './validators/ibkr-csv.validator';
import { PortfolioDto, PortfolioSummaryDto } from './dtos/position.dto';

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

  @Get('portfolios')
  getPortfolios(
    @GetCurrentUserId() userId: string,
  ): Promise<PortfolioSummaryDto[]> {
    return this.investmentService.getUserPortfolios(userId);
  }

  @Get('positions')
  getPositions(
    @GetCurrentUserId() userId: string,
    // Comma-separated list of portfolio ids. When the parameter is present but
    // empty (e.g. "?portfolioIds="), it means "no portfolio selected" and an
    // empty portfolio is returned. When the parameter is omitted entirely,
    // positions for all of the user's portfolios are returned.
    @Query('portfolioIds') portfolioIds?: string,
  ): Promise<PortfolioDto> {
    const ids =
      portfolioIds !== undefined
        ? portfolioIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
        : undefined;
    return this.investmentService.getUserPositions(userId, ids);
  }
}
