import {
  Field,
  Int,
  ObjectType
} from '@nestjs/graphql';

@ObjectType()
export class VehicleTypeDto {

  @Field(() => Int)
  typeId!: number;

  @Field()
  typeName!: string;
}