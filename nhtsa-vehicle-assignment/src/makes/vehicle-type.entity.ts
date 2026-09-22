import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { MakeEntity } from './make.entity';

@ObjectType('VehicleType')
@Entity({ name: 'vehicle_types' })
export class VehicleTypeEntity {
  @Field(() => Int)
  @PrimaryColumn({ type: 'integer' })
  id!: number;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @PrimaryColumn({ name: 'make_id', type: 'integer' })
  makeId!: number;

  @ManyToOne(() => MakeEntity, (make) => make.vehicleTypes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'make_id' })
  make!: MakeEntity;
}