import {
  Column,
  Entity,
  OneToMany,
  PrimaryColumn
} from 'typeorm';

import {
  Field,
  Int,
  ObjectType
} from '@nestjs/graphql';

import { VehicleTypeEntity } from './vehicle-type.entity';

@ObjectType('Make')
@Entity({
  name: 'makes'
})
export class MakeEntity {

  @Field(() => Int)
  @PrimaryColumn({
    type: 'integer'
  })
  id!: number;

  @Field()
  @Column({
    type: 'varchar',
    length: 255
  })
  name!: string;

  @Field(() => [VehicleTypeEntity])
  @OneToMany(
    () => VehicleTypeEntity,
    vehicleType => vehicleType.make,
    {
      cascade: true
    }
  )
  vehicleTypes!: VehicleTypeEntity[];
}