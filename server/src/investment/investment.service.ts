import { Injectable } from '@nestjs/common';

@Injectable()
export class InvestmentService {
  uploadStatementFiles(files: Express.Multer.File[], userId: string) {
    console.log('request data', files, userId);
    return 'This action adds a new investment';
  }
}
