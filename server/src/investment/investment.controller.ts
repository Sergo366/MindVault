import {
  Controller,
  Get,
  Post,
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  Body,
  Delete,
  Patch,
} from '@nestjs/common';
import { InvestmentService } from './investment.service';
import { GetCurrentUserId } from '../auth/decorators/get-current-user-id.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IBKRCsvValidator } from './validators/ibkr-csv.validator';
import {
  CreatedPortfolioDto,
  PortfolioDto,
  PortfolioSummaryDto,
} from './dtos/position.dto';

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
    @Body('portfolioId') portfolioId: string,
  ) {
    return this.investmentService.uploadStatementFiles(
      files,
      userId,
      portfolioId,
    );
  }

  @Get('portfolios')
  getPortfolios(
    @GetCurrentUserId() userId: string,
  ): Promise<PortfolioSummaryDto[]> {
    return this.investmentService.getUserPortfolios(userId);
  }

  @Post('portfolios')
  postPortfolio(
    @Body('name') name: string,
    @GetCurrentUserId() userId: string,
  ): Promise<CreatedPortfolioDto> {
    return this.investmentService.createPortfolio({ name, userId });
  }

  @Delete('portfolios')
  deletePortfolio(
    @Body('portfolioId') portfolioId: string,
    @GetCurrentUserId() userId: string,
  ): Promise<boolean> {
    return this.investmentService.deletePortfolioById({ portfolioId, userId });
  }

  @Patch('portfolios')
  updatePortfolio(
    @Body() body: { name: string; portfolioId: string },
    @GetCurrentUserId() userId: string,
  ): Promise<boolean> {
    return this.investmentService.updatePortfolioNameById({
      name: body.name,
      userId,
      portfolioId: body.portfolioId,
    });
  }

  @Get('positions')
  getPositions(
    @GetCurrentUserId() userId: string,
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
