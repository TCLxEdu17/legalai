import { PartialType } from '@nestjs/mapped-types';
import { CreateRadarDto } from './create-radar.dto';

export class UpdateRadarDto extends PartialType(CreateRadarDto) {}
