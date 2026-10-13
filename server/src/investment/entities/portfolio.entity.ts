import { Entity } from 'typeorm';
import { PrimaryColumnV7 } from '../../common/decorators/primary-column-v7.decorator';

@Entity()
export class Portfolio {
  @PrimaryColumnV7()
  id: string;
}
