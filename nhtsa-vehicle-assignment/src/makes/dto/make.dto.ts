import {
  Field,
  Int,
  ObjectType
} from '@nestjs/graphql';

import { VehicleTypeDto } from './vehicle-type.dto';

@ObjectType()
export class MakeDto {

  @Field(() => Int)
  makeId!: number;

  @Field()
  makeName!: string;

  @Field(() => [VehicleTypeDto])
  vehicleTypes!: VehicleTypeDto[];
}